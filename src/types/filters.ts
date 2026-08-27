import type { EventType, ProblemCategory, Severity } from "./execution";

export interface GlobalFilters {
  dateFrom?: string;
  dateTo?: string;
  robots: string[];
  statuses: string[];
  categories: ProblemCategory[];
  severities: Severity[];
  environments: string[];
  tenants: string[];
  attempts: number[];
  eventTypes: EventType[];
  search: string;
}

export function emptyFilters(): GlobalFilters {
  return {
    robots: [],
    statuses: [],
    categories: [],
    severities: [],
    environments: [],
    tenants: [],
    attempts: [],
    eventTypes: [],
    search: "",
  };
}

export function hasActiveFilters(filters: GlobalFilters): boolean {
  return Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.robots.length ||
      filters.statuses.length ||
      filters.categories.length ||
      filters.severities.length ||
      filters.environments.length ||
      filters.tenants.length ||
      filters.attempts.length ||
      filters.eventTypes.length ||
      filters.search.trim(),
  );
}
