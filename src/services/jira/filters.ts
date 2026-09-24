import type { JiraIssue } from "./storage";

export type JiraPeriod = "release" | "30" | "60" | "90" | "120" | "180" | "all";

export interface JiraRelease {
  id: string;
  name: string;
  releaseDate: string;
  issueKeys: string[];
}

const RELEASE_STORAGE_KEY = "rta-report-analyzer-latest-release";

export function saveLatestRelease(release: JiraRelease | null): void {
  if (!release) localStorage.removeItem(RELEASE_STORAGE_KEY);
  else localStorage.setItem(RELEASE_STORAGE_KEY, JSON.stringify(release));
}

export function loadLatestRelease(): JiraRelease | null {
  try {
    const value = localStorage.getItem(RELEASE_STORAGE_KEY);
    return value ? JSON.parse(value) as JiraRelease : null;
  } catch {
    return null;
  }
}

export function filterIssuesByPeriod(
  issues: JiraIssue[],
  period: JiraPeriod,
  latestRelease: JiraRelease | null,
  now = Date.now(),
): JiraIssue[] {
  if (period === "all") return issues;
  if (period === "release") {
    if (!latestRelease) return [];
    const keys = new Set(latestRelease.issueKeys);
    return issues.filter((issue) => keys.has(issue.key));
  }

  const cutoff = now - Number(period) * 24 * 60 * 60 * 1000;
  return issues.filter((issue) => {
    const updated = new Date(issue.updated).getTime();
    return Number.isFinite(updated) && updated >= cutoff;
  });
}
