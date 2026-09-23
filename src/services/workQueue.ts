import type { ClassifiedExecution, DashboardAnalysis, ErrorAnalysis } from "../types";
import { findJiraMatchesForRobot, type JiraMatch } from "./jira/matching";
import type { JiraIssue } from "./jira/storage";

export type WorkDecision = "open" | "existing" | "regression" | "verify" | "monitor";

export interface WorkItem {
  id: string;
  problem: ErrorAnalysis;
  decision: WorkDecision;
  priority: "P0" | "P1" | "P2";
  matches: JiraMatch[];
  total: number;
  robots: string[];
  tokens: string[];
  robotTotal: number;
  robotErrors: number;
  robotInstabilities: number;
  robotSiteErrors: number;
  robotSuccesses: number;
  problemRate: number;
}

function priority(total: number, errors: number, instabilities: number, messageCount: number): WorkItem["priority"] {
  const unhealthy = errors + instabilities;
  const rate = total ? unhealthy / total : 0;
  const concentration = unhealthy ? messageCount / unhealthy : 0;
  if ((unhealthy >= 100 && rate >= 0.8) || (unhealthy >= 50 && rate >= 0.9 && concentration >= 0.5)) return "P0";
  if ((unhealthy >= 20 && rate >= 0.5) || (unhealthy >= 10 && rate >= 0.8 && concentration >= 0.5)) return "P1";
  return "P2";
}

function decision(
  problem: ErrorAnalysis,
  matches: JiraMatch[],
  total: number,
  errors: number,
  instabilities: number,
  siteErrors: number,
  successes: number,
): WorkDecision {
  const high = matches.find((match) => match.confidence === "Alta");
  if (high) return high.closed ? "regression" : "existing";
  if (matches.some((match) => match.confidence === "Média")) return "verify";

  const unhealthyRate = total ? (errors + instabilities) / total : 0;
  const suspiciousConcentration = total >= 3 && successes === 0 && unhealthyRate >= 0.8;
  if (siteErrors > 0 || suspiciousConcentration) return "open";
  if (problem.eventType === "technical_error" && errors >= 3 && (errors >= 10 || errors / Math.max(total, 1) >= 0.5)) return "open";
  if (problem.eventType === "instability") return "monitor";
  return "monitor";
}

export function buildWorkQueue(analysis: DashboardAnalysis, executions: ClassifiedExecution[], jira: JiraIssue[]): WorkItem[] {
  const items: WorkItem[] = [];
  analysis.problems.slice(0, 80).forEach((problem) => problem.robots.forEach((robot) => {
    const robotRows = executions.filter((row) => row.robot === robot);
    const rows = robotRows.filter((row) => row.message === problem.message);
    if (!rows.length) return;

    const robotErrors = robotRows.filter((row) => row.canonicalStatus === "error").length;
    const robotInstabilities = robotRows.filter((row) => row.canonicalStatus === "instability").length;
    const robotSiteErrors = robotRows.filter((row) => /site[\s_-]*error/i.test(row.status)).length;
    const robotSuccesses = robotRows.filter((row) => row.canonicalStatus === "success").length;
    const matches = findJiraMatchesForRobot(problem, robot, jira);

    items.push({
      id: `${problem.id}::${robot}`,
      problem,
      decision: decision(problem, matches, robotRows.length, robotErrors, robotInstabilities, robotSiteErrors, robotSuccesses),
      priority: priority(robotRows.length, robotErrors, robotInstabilities, rows.length),
      matches,
      total: rows.length,
      robots: [robot],
      tokens: rows.slice(0, 10).map((row) => row.id),
      robotTotal: robotRows.length,
      robotErrors,
      robotInstabilities,
      robotSiteErrors,
      robotSuccesses,
      problemRate: rows.length / robotRows.length,
    });
  }));

  const decisionOrder: Record<WorkDecision, number> = { open: 0, regression: 1, existing: 2, verify: 3, monitor: 4 };
  const priorityOrder = { P0: 0, P1: 1, P2: 2 };
  return items.sort((a, b) =>
    decisionOrder[a.decision] - decisionOrder[b.decision] ||
    priorityOrder[a.priority] - priorityOrder[b.priority] ||
    (b.robotErrors + b.robotInstabilities) - (a.robotErrors + a.robotInstabilities) ||
    b.total - a.total,
  );
}
