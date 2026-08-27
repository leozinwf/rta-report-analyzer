import { errorRules } from "../../data/errorRules";
import type {
  Classification,
  ClassifiedExecution,
  EventType,
  Execution,
  ProblemCategory,
  Severity,
} from "../../types";
import { includesNormalized } from "../../utils/text";
import { extractStage } from "./stages";

const STATUS_DEFAULTS: Record<
  Execution["canonicalStatus"],
  Pick<Classification, "eventType" | "category" | "severity">
> = {
  success: { eventType: "success", category: "unknown", severity: "info" },
  error: { eventType: "technical_error", category: "unknown", severity: "high" },
  instability: { eventType: "instability", category: "infrastructure", severity: "high" },
  no_result: { eventType: "business_result", category: "business_rule", severity: "info" },
  warning: { eventType: "warning", category: "unknown", severity: "low" },
  pending: { eventType: "unknown", category: "unknown", severity: "low" },
  processing: { eventType: "unknown", category: "unknown", severity: "low" },
  cancelled: { eventType: "unknown", category: "unknown", severity: "low" },
  unknown: { eventType: "unknown", category: "unknown", severity: "low" },
};

export function matchErrorRule(message: string) {
  if (!message) return undefined;
  return errorRules.find((rule) => rule.keywords.some((keyword) => includesNormalized(message, keyword)));
}

export function classifyMessage(message: string): Classification {
  const stage = extractStage(message);
  const rule = matchErrorRule(message);
  if (rule) {
    return {
      eventType: rule.eventType,
      category: rule.category,
      severity: rule.severity,
      stage,
      matchedRuleId: rule.id,
    };
  }
  return {
    eventType: "unknown",
    category: stage ? "automation" : "unknown",
    severity: "medium",
    stage,
  };
}

function mergeWithStatus(
  execution: Execution,
  fromMessage: Classification,
): Classification {
  const fallback = STATUS_DEFAULTS[execution.canonicalStatus];

  if (execution.canonicalStatus === "success") {
    return { ...fallback, stage: fromMessage.stage };
  }

  if (fromMessage.matchedRuleId) {
    let eventType: EventType = fromMessage.eventType;
    if (execution.canonicalStatus === "instability" && fromMessage.eventType === "technical_error") {
      eventType = "instability";
    }
    if (execution.canonicalStatus === "warning" && fromMessage.eventType === "technical_error") {
      eventType = "warning";
    }
    if (execution.canonicalStatus === "no_result") {
      eventType = "business_result";
    }
    return { ...fromMessage, eventType };
  }

  return {
    ...fallback,
    stage: fromMessage.stage,
    category: (fromMessage.stage ? "automation" : fallback.category) as ProblemCategory,
    severity: fallback.severity as Severity,
  };
}

export function classifyExecution(execution: Execution): ClassifiedExecution {
  const fromMessage = classifyMessage(execution.message);
  const merged = mergeWithStatus(execution, fromMessage);
  return { ...execution, ...merged };
}

export function severityWeight(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 1;
    case "high":
      return 0.75;
    case "medium":
      return 0.45;
    case "low":
      return 0.2;
    default:
      return 0.05;
  }
}
