import type { ClassifiedExecution, GlobalFilters } from "../../types";
import { endOfDay, startOfDay } from "../../utils/date";
import { normalizeKey } from "../../utils/text";

export function filterExecutions(
  executions: ClassifiedExecution[],
  filters: GlobalFilters,
): ClassifiedExecution[] {
  const search = normalizeKey(filters.search);
  const from = filters.dateFrom ? startOfDay(filters.dateFrom) : undefined;
  const to = filters.dateTo ? endOfDay(filters.dateTo) : undefined;

  return executions.filter((row) => {
    if (from && (!row.date || row.date < from)) return false;
    if (to && (!row.date || row.date > to)) return false;
    if (filters.robots.length && !filters.robots.includes(row.robot)) return false;
    if (filters.statuses.length && !filters.statuses.includes(row.status)) return false;
    if (filters.categories.length && !filters.categories.includes(row.category)) return false;
    if (filters.severities.length && !filters.severities.includes(row.severity)) return false;
    if (filters.environments.length && !filters.environments.includes(row.environment || "N/D")) return false;
    if (filters.tenants.length && !filters.tenants.includes(row.tenant || "N/D")) return false;
    if (filters.attempts.length && !filters.attempts.includes(row.attempt ?? 1)) return false;
    if (filters.eventTypes.length && !filters.eventTypes.includes(row.eventType)) return false;
    if (search) {
      const haystack = normalizeKey(
        [row.id, row.robot, row.robotId, row.status, row.message, row.tenant, row.environment, row.stage]
          .filter(Boolean)
          .join(" "),
      );
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
