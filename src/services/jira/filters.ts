import type { JiraIssue } from "./storage";

export type JiraPeriod = "release" | "30" | "60" | "90" | "120" | "180" | "all";

export interface JiraRelease {
  id: string;
  name: string;
  releaseDate: string;
}

export function getLatestRelease(issues: JiraIssue[]): JiraRelease | null {
  const releases = new Map<string, JiraRelease>();
  for (const issue of issues) {
    for (const version of issue.fixVersions ?? []) {
      if (!version.released || !version.id) continue;
      const current = releases.get(version.id);
      if (!current || version.releaseDate > current.releaseDate) {
        releases.set(version.id, {
          id: version.id,
          name: version.name || "Versão sem nome",
          releaseDate: version.releaseDate,
        });
      }
    }
  }

  return [...releases.values()].sort((left, right) =>
    right.releaseDate.localeCompare(left.releaseDate) || right.name.localeCompare(left.name)
  )[0] ?? null;
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
    return issues.filter((issue) =>
      (issue.fixVersions ?? []).some((version) => version.id === latestRelease.id),
    );
  }

  const cutoff = now - Number(period) * 24 * 60 * 60 * 1000;
  return issues.filter((issue) => {
    const updated = new Date(issue.updated).getTime();
    return Number.isFinite(updated) && updated >= cutoff;
  });
}
