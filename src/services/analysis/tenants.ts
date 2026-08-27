import type { ClassifiedExecution, TenantAnalysis } from "../../types";
import { rate } from "../../utils/format";

export function analyzeTenants(executions: ClassifiedExecution[]): TenantAnalysis[] {
  const groups = new Map<string, ClassifiedExecution[]>();
  for (const row of executions) {
    const key = row.tenant || "N/D";
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .map(([tenant, rows]) => {
      let successCount = 0;
      let errorCount = 0;
      let instabilityCount = 0;
      let warningCount = 0;
      let noResultCount = 0;
      const problems = new Map<string, ClassifiedExecution>();
      const problemCounts = new Map<string, number>();
      const robots = new Map<string, number>();

      for (const row of rows) {
        robots.set(row.robot, (robots.get(row.robot) ?? 0) + 1);
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
          problemCounts.set(row.message || "N/D", (problemCounts.get(row.message || "N/D") ?? 0) + 1);
          if (!problems.has(row.message || "N/D")) problems.set(row.message || "N/D", row);
        }
      }

      return {
        tenant,
        total: rows.length,
        successCount,
        errorCount,
        instabilityCount,
        warningCount,
        noResultCount,
        successRate: rate(successCount, rows.length),
        errorRate: rate(errorCount, rows.length),
        topProblems: [...problemCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([message, count]) => {
            const sample = problems.get(message)!;
            return {
              message,
              count,
              category: sample.category,
              severity: sample.severity,
            };
          }),
        topRobots: [...robots.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([robot, count]) => ({ robot, count })),
      };
    })
    .sort((a, b) => b.total - a.total);
}
