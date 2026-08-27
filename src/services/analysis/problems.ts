import type {
  CategoryAnalysis,
  ClassifiedExecution,
  ErrorAnalysis,
  ProblemCategory,
  Severity,
} from "../../types";
import { rate } from "../../utils/format";
import { hashId, normalizeKey } from "../../utils/text";

const PROBLEM_STATUSES = new Set(["error", "instability", "warning", "no_result", "unknown", "cancelled"]);

export function analyzeProblems(executions: ClassifiedExecution[]): ErrorAnalysis[] {
  const total = executions.length;
  const groups = new Map<string, ClassifiedExecution[]>();

  for (const row of executions) {
    if (!PROBLEM_STATUSES.has(row.canonicalStatus) && row.canonicalStatus === "success") continue;
    if (row.canonicalStatus === "success" || row.canonicalStatus === "pending" || row.canonicalStatus === "processing") {
      continue;
    }
    const key = normalizeKey(row.message) || "(sem mensagem)";
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const problems: ErrorAnalysis[] = [];
  for (const [, rows] of groups) {
    const robots = new Set(rows.map((row) => row.robot).filter(Boolean));
    const tenants = new Set(rows.map((row) => row.tenant).filter(Boolean) as string[]);
    const environments: Record<string, number> = {};
    const attemptDistribution: Record<string, number> = {};
    const related = new Map<string, number>();

    for (const row of rows) {
      const env = row.environment || "N/D";
      environments[env] = (environments[env] ?? 0) + 1;
      const attempt = String(row.attempt ?? "N/D");
      attemptDistribution[attempt] = (attemptDistribution[attempt] ?? 0) + 1;
      related.set(row.message || "N/D", (related.get(row.message || "N/D") ?? 0) + 1);
    }

    const sample = rows[0];
    problems.push({
      id: hashId(sample.message || "(sem mensagem)"),
      message: sample.message || "N/D",
      count: rows.length,
      percent: rate(rows.length, total),
      category: sample.category,
      severity: sample.severity,
      eventType: sample.eventType,
      robotCount: robots.size,
      robots: [...robots].sort(),
      tenantCount: tenants.size,
      tenants: [...tenants].sort(),
      environmentCount: Object.keys(environments).length,
      environments,
      attemptDistribution,
      relatedMessages: [...related.entries()]
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count),
      sampleIds: rows.slice(0, 12).map((row) => row.id),
    });
  }

  return problems.sort((a, b) => b.count - a.count);
}

export function analyzeCategories(executions: ClassifiedExecution[]): CategoryAnalysis[] {
  const relevant = executions.filter(
    (row) => row.canonicalStatus !== "success" && row.canonicalStatus !== "pending" && row.canonicalStatus !== "processing",
  );
  const groups = new Map<ProblemCategory, ClassifiedExecution[]>();
  for (const row of relevant) {
    const list = groups.get(row.category);
    if (list) list.push(row);
    else groups.set(row.category, [row]);
  }

  return [...groups.entries()]
    .map(([category, rows]) => {
      const severityBreakdown: Record<Severity, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      };
      for (const row of rows) severityBreakdown[row.severity] += 1;
      return {
        category,
        count: rows.length,
        percent: rate(rows.length, relevant.length),
        robotCount: new Set(rows.map((row) => row.robot)).size,
        severityBreakdown,
      };
    })
    .sort((a, b) => b.count - a.count);
}
