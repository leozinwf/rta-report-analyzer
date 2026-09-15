import type { ClassifiedExecution } from "../../types";

export type MigrationState = "rta_only" | "automation_only" | "migrated" | "transition" | "inconsistent" | "unknown";

export interface MigrationAnalysis {
  robot: string;
  state: MigrationState;
  rtaCount: number;
  automationCount: number;
  firstAutomation?: Date;
  lastRta?: Date;
  rtaAfterAutomation: number;
  rtaAfterTolerance: number;
  toleranceMinutes: number;
}

const DEFAULT_TOLERANCE_MINUTES = 60;

function executionTime(row: ClassifiedExecution) {
  return row.date ?? row.startedAt ?? row.finishedAt;
}

export function analyzePlatformMigration(rows: ClassifiedExecution[], toleranceMinutes = DEFAULT_TOLERANCE_MINUTES): MigrationAnalysis[] {
  const byRobot = new Map<string, ClassifiedExecution[]>();
  rows.forEach(row => {
    if (row.platform === "N/D") return;
    const list = byRobot.get(row.robot) ?? [];
    list.push(row);
    byRobot.set(row.robot, list);
  });

  const analyses: MigrationAnalysis[] = [...byRobot.entries()].map(([robot, robotRows]): MigrationAnalysis => {
    const rta = robotRows.filter(r => r.platform === "RTA");
    const automation = robotRows.filter(r => r.platform === "Automation");
    if (!rta.length) {
      const state: MigrationState = automation.length ? "automation_only" : "unknown";
      return { robot, state, rtaCount: 0, automationCount: automation.length, rtaAfterAutomation: 0, rtaAfterTolerance: 0, toleranceMinutes };
    }
    if (!automation.length) return { robot, state: "rta_only", rtaCount: rta.length, automationCount: 0, rtaAfterAutomation: 0, rtaAfterTolerance: 0, toleranceMinutes };

    const datedRta = rta.map(r => executionTime(r)).filter((d): d is Date => Boolean(d)).sort((a,b) => a.getTime()-b.getTime());
    const datedAutomation = automation.map(r => executionTime(r)).filter((d): d is Date => Boolean(d)).sort((a,b) => a.getTime()-b.getTime());
    if (!datedRta.length || !datedAutomation.length) return { robot, state: "unknown", rtaCount: rta.length, automationCount: automation.length, rtaAfterAutomation: 0, rtaAfterTolerance: 0, toleranceMinutes };

    const firstAutomation = datedAutomation[0];
    const lastRta = datedRta[datedRta.length-1];
    const toleranceEnd = firstAutomation.getTime() + toleranceMinutes * 60_000;
    const rtaAfterAutomation = datedRta.filter(d => d.getTime() > firstAutomation.getTime()).length;
    const rtaAfterTolerance = datedRta.filter(d => d.getTime() > toleranceEnd).length;
    const state: MigrationState = rtaAfterTolerance > 0 ? "inconsistent" : rtaAfterAutomation > 0 ? "transition" : "migrated";
    return { robot, state, rtaCount: rta.length, automationCount: automation.length, firstAutomation, lastRta, rtaAfterAutomation, rtaAfterTolerance, toleranceMinutes };
  });

  return analyses.sort((a,b) => (b.state === "inconsistent" ? 1 : 0) - (a.state === "inconsistent" ? 1 : 0) || (b.rtaAfterTolerance-a.rtaAfterTolerance));
}

export function cardPlatformLabel(rows: ClassifiedExecution[]) {
  const platforms = new Set(rows.map(r => r.platform).filter(p => p !== "N/D"));
  if (platforms.size === 1) return platforms.has("Automation") ? "AUT" : "RTA";
  return platforms.size > 1 ? "RTA/AUT" : "N/D";
}
