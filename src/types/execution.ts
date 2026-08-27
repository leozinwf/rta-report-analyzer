export type EventType =
  | "technical_error"
  | "business_result"
  | "instability"
  | "warning"
  | "success"
  | "unknown";

export type ProblemCategory =
  | "infrastructure"
  | "automation"
  | "download"
  | "data"
  | "business_rule"
  | "authentication"
  | "unknown";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type CanonicalStatus =
  | "success"
  | "error"
  | "instability"
  | "no_result"
  | "warning"
  | "pending"
  | "processing"
  | "cancelled"
  | "unknown";

export interface Execution {
  id: string;
  robot: string;
  robotId?: string;
  status: string;
  canonicalStatus: CanonicalStatus;
  message: string;
  tenant?: string;
  environment?: string;
  attempt?: number;
  date?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  published?: string;
  origin?: string;
  responseQueue?: string;
  rawData: Record<string, unknown>;
}

export interface Classification {
  eventType: EventType;
  category: ProblemCategory;
  severity: Severity;
  stage?: string;
  matchedRuleId?: string;
}

export interface ClassifiedExecution extends Execution, Classification {}
