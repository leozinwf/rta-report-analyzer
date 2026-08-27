import type { ClassifiedExecution, RobotAnalysis, RobotHealthStatus, Severity } from "../../types";
import { rate } from "../../utils/format";
import { severityWeight } from "./classifier";

function healthStatus(robot: Pick<RobotAnalysis, "successRate" | "errorRate" | "problemScore">): RobotHealthStatus {
  if (robot.problemScore >= 55 || robot.errorRate >= 0.45) return "critical";
  if (robot.problemScore >= 28 || robot.errorRate >= 0.2 || robot.successRate < 0.5) return "watch";
  return "healthy";
}

export function analyzeRobots(executions: ClassifiedExecution[]): RobotAnalysis[] {
  const groups = new Map<string, ClassifiedExecution[]>();
  for (const row of executions) {
    const key = row.robotId || row.robot;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const robots: RobotAnalysis[] = [];
  for (const [id, rows] of groups) {
    const total = rows.length;
    let successCount = 0;
    let errorCount = 0;
    let instabilityCount = 0;
    let warningCount = 0;
    let noResultCount = 0;
    const statusDistribution: Record<string, number> = {};
    const environments: Record<string, number> = {};
    const problems = new Map<string, { count: number; severity: Severity; category: RobotAnalysis["topProblems"][0]["category"] }>();
    let severitySum = 0;
    let retryFail = 0;

    for (const row of rows) {
      statusDistribution[row.status] = (statusDistribution[row.status] ?? 0) + 1;
      if (row.environment) {
        environments[row.environment] = (environments[row.environment] ?? 0) + 1;
      }
      switch (row.canonicalStatus) {
        case "success":
          successCount += 1;
          break;
        case "error":
          errorCount += 1;
          break;
        case "instability":
          instabilityCount += 1;
          break;
        case "warning":
          warningCount += 1;
          break;
        case "no_result":
          noResultCount += 1;
          break;
        default:
          break;
      }
      if (row.canonicalStatus !== "success") {
        severitySum += severityWeight(row.severity);
        const current = problems.get(row.message) ?? {
          count: 0,
          severity: row.severity,
          category: row.category,
        };
        current.count += 1;
        problems.set(row.message, current);
      }
      if ((row.attempt ?? 1) >= 2 && row.canonicalStatus !== "success") retryFail += 1;
    }

    const successRate = rate(successCount, total);
    const errorRate = rate(errorCount, total);
    const frequency = rate(total, executions.length);
    const avgSeverity = total ? severitySum / total : 0;
    const recurrence = rate(retryFail, total);
    const problemScore = Math.round(
      Math.min(
        100,
        errorRate * 35 +
          rate(instabilityCount, total) * 20 +
          Math.min(1, frequency * 12) * 15 +
          avgSeverity * 20 +
          recurrence * 10,
      ) * 10,
    ) / 10;

    const topProblems = [...problems.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([message, info]) => ({
        message: message || "N/D",
        count: info.count,
        severity: info.severity,
        category: info.category,
      }));

    const analysis: RobotAnalysis = {
      id,
      robot: rows[0]?.robot ?? "N/D",
      robotId: rows[0]?.robotId,
      total,
      successCount,
      errorCount,
      instabilityCount,
      warningCount,
      noResultCount,
      otherCount: total - successCount - errorCount - instabilityCount - warningCount - noResultCount,
      successRate,
      errorRate,
      instabilityRate: rate(instabilityCount, total),
      warningRate: rate(warningCount, total),
      noResultRate: rate(noResultCount, total),
      problemScore,
      status: "unknown",
      topProblems,
      statusDistribution,
      environments,
    };
    analysis.status = healthStatus(analysis);
    robots.push(analysis);
  }

  return robots.sort((a, b) => b.problemScore - a.problemScore || b.total - a.total);
}
