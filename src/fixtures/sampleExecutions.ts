import type { ClassifiedExecution, Execution } from "../types";

export function makeExecution(overrides: Partial<Execution> = {}): Execution {
  return {
    id: overrides.id ?? "A-1",
    robot: overrides.robot ?? "BB8_CES",
    robotId: overrides.robotId ?? "robot-1",
    status: overrides.status ?? "Erro",
    canonicalStatus: overrides.canonicalStatus ?? "error",
    message: overrides.message ?? "Downloaded file not found",
    tenant: overrides.tenant ?? "grupoilm",
    environment: overrides.environment ?? "prod",
    attempt: overrides.attempt ?? 1,
    date: overrides.date ?? new Date(2026, 7, 26, 1, 0, 0),
    rawData: overrides.rawData ?? {},
    ...overrides,
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
