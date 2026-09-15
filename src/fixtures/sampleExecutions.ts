import type { ClassifiedExecution, Execution, ExecutionPlatform } from "../types";

function platformFromId(id: string): ExecutionPlatform {
  const normalized = id.trim().toUpperCase();
  if (normalized.startsWith("R")) return "RTA";
  if (normalized.startsWith("A")) return "Automation";
  return "N/D";
}

export function makeExecution(overrides: Partial<Execution> = {}): Execution {
  const id = overrides.id ?? "A-1";
  return {
    ...overrides,
    id,
    robot: overrides.robot ?? "BB8_CES",
    robotId: overrides.robotId ?? "robot-1",
    status: overrides.status ?? "Erro",
    canonicalStatus: overrides.canonicalStatus ?? "error",
    message: overrides.message ?? "Downloaded file not found",
    platform: overrides.platform ?? platformFromId(id),
    tenant: overrides.tenant ?? "grupoilm",
    environment: overrides.environment ?? "prod",
    attempt: overrides.attempt ?? 1,
    date: overrides.date ?? new Date(2026, 7, 26, 1, 0, 0),
    rawData: overrides.rawData ?? {},
  };
}

export function makeClassified(overrides: Partial<ClassifiedExecution> = {}): ClassifiedExecution {
  const execution = makeExecution(overrides);
  return {
    ...execution,
    eventType: overrides.eventType ?? "technical_error",
    category: overrides.category ?? "download",
    severity: overrides.severity ?? "high",
    stage: overrides.stage,
    matchedRuleId: overrides.matchedRuleId,
  };
}
