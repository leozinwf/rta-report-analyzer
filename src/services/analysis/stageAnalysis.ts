import type { ClassifiedExecution, StageAnalysis } from "../../types";
import { extractStage } from "./stages";

export function analyzeStages(executions: ClassifiedExecution[]): StageAnalysis[] {
  const groups = new Map<string, ClassifiedExecution[]>();

  for (const row of executions) {
    if (row.canonicalStatus === "success") continue;
    const stage = row.stage || extractStage(row.message);
    if (!stage) continue;
    const list = groups.get(stage);
    if (list) list.push(row);
    else groups.set(stage, [row]);
  }

  return [...groups.entries()]
    .map(([stage, rows]) => {
      const messages = new Map<string, number>();
      const robots = new Set<string>();
      for (const row of rows) {
        robots.add(row.robot);
        messages.set(row.message || "N/D", (messages.get(row.message || "N/D") ?? 0) + 1);
      }
      const sample = rows[0];
      return {
        stage,
        count: rows.length,
        robotCount: robots.size,
        robots: [...robots].sort(),
        messages: [...messages.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([message, count]) => ({ message, count })),
        severity: sample.severity,
        category: sample.category,
      };
    })
    .sort((a, b) => b.count - a.count);
}
