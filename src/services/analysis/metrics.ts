import type { ClassifiedExecution, DashboardMetrics, EventType, Severity } from "../../types";
import { rate } from "../../utils/format";

export function computeMetrics(executions: ClassifiedExecution[]): DashboardMetrics {
  const total = executions.length;
  let successCount = 0;
  let errorCount = 0;
  let instabilityCount = 0;
  let noResultCount = 0;
  let warningCount = 0;
  let pendingCount = 0;
  let processingCount = 0;
  let cancelledCount = 0;
  let technicalErrorCount = 0;
  let businessResultCount = 0;

  for (const row of executions) {
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
      case "no_result":
        noResultCount += 1;
        break;
      case "warning":
        warningCount += 1;
        break;
      case "pending":
        pendingCount += 1;
        break;
      case "processing":
        processingCount += 1;
        break;
      case "cancelled":
        cancelledCount += 1;
        break;
      default:
        break;
    }
    if (row.eventType === "technical_error") technicalErrorCount += 1;
    if (row.eventType === "business_result") businessResultCount += 1;
  }

  const accounted =
    successCount +
    errorCount +
    instabilityCount +
    noResultCount +
    warningCount +
    pendingCount +
    processingCount +
    cancelledCount;

  return {
    total,
    successCount,
    errorCount,
    instabilityCount,
    noResultCount,
    warningCount,
    pendingCount,
    processingCount,
    cancelledCount,
    otherCount: Math.max(0, total - accounted),
    successRate: rate(successCount, total),
    errorRate: rate(errorCount, total),
    instabilityRate: rate(instabilityCount, total),
    noResultRate: rate(noResultCount, total),
    warningRate: rate(warningCount, total),
    technicalErrorCount,
    businessResultCount,
  };
}

export function countByEventType(executions: ClassifiedExecution[]): Record<EventType, number> {
  const counts: Record<EventType, number> = {
    technical_error: 0,
    business_result: 0,
    instability: 0,
    warning: 0,
    success: 0,
    unknown: 0,
  };
  for (const row of executions) counts[row.eventType] += 1;
  return counts;
}

export function countBySeverity(executions: ClassifiedExecution[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const row of executions) counts[row.severity] += 1;
  return counts;
}
