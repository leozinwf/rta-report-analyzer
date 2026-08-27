import type { ClassifiedExecution, EnvironmentAnalysis } from "../../types";
import { rate } from "../../utils/format";

export function analyzeEnvironments(executions: ClassifiedExecution[]): EnvironmentAnalysis[] {
  const groups = new Map<string, ClassifiedExecution[]>();
  for (const row of executions) {
    const key = row.environment || "N/D";
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const totalByMessage = new Map<string, number>();
  for (const row of executions) {
    if (row.canonicalStatus === "success") continue;
    totalByMessage.set(row.message || "N/D", (totalByMessage.get(row.message || "N/D") ?? 0) + 1);
  }

  return [...groups.entries()]
    .map(([environment, rows]) => {
      let successCount = 0;
      let errorCount = 0;
      let instabilityCount = 0;
      let warningCount = 0;
      let noResultCount = 0;
      const problems = new Map<string, number>();
      for (const row of rows) {
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
          problems.set(row.message || "N/D", (problems.get(row.message || "N/D") ?? 0) + 1);
        }
      }

      const topProblems = [...problems.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([message, count]) => ({ message, count }));

      const envShare = rate(rows.length, executions.length);
      const concentratedProblems = [...problems.entries()]
        .map(([message, count]) => {
          const global = totalByMessage.get(message) ?? count;
          return { message, count, share: rate(count, global) };
        })
        .filter((item) => item.share >= 0.8 && envShare < 0.7 && item.count >= 8)
        .sort((a, b) => b.share - a.share)
        .slice(0, 6);

      return {
        environment,
        total: rows.length,
        successCount,
        errorCount,
        instabilityCount,
        warningCount,
        noResultCount,
        successRate: rate(successCount, rows.length),
        errorRate: rate(errorCount, rows.length),
        topProblems,
        concentratedProblems,
      };
    })
    .sort((a, b) => b.total - a.total);
}
