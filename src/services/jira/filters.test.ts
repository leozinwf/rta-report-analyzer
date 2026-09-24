import { describe, expect, it } from "vitest";
import { filterIssuesByPeriod, getLatestRelease } from "./filters";
import type { JiraIssue } from "./storage";

function issue(key: string, updated: string, versions: JiraIssue["fixVersions"] = []): JiraIssue {
  return {
    key,
    summary: key,
    status: "Aberto",
    priority: "Alta",
    assignee: "",
    description: "",
    created: updated,
    updated,
    issueType: "Bug",
    labels: [],
    components: [],
    fixVersions: versions,
  };
}

describe("Jira period filters", () => {
  it("filters cards by their updated date", () => {
    const now = new Date("2026-09-24T12:00:00.000Z").getTime();
    const issues = [
      issue("DM-1", "2026-09-20T12:00:00.000Z"),
      issue("DM-2", "2026-07-01T12:00:00.000Z"),
    ];

    expect(filterIssuesByPeriod(issues, "30", null, now).map((item) => item.key)).toEqual(["DM-1"]);
    expect(filterIssuesByPeriod(issues, "120", null, now)).toHaveLength(2);
  });

  it("finds the latest released Jira version and filters its cards", () => {
    const oldRelease = { id: "10", name: "2026.08", released: true, releaseDate: "2026-08-15" };
    const latestRelease = { id: "11", name: "2026.09", released: true, releaseDate: "2026-09-15" };
    const futureRelease = { id: "12", name: "2026.10", released: false, releaseDate: "2026-10-15" };
    const issues = [
      issue("DM-1", "2026-09-20T12:00:00.000Z", [latestRelease]),
      issue("DM-2", "2026-09-10T12:00:00.000Z", [oldRelease]),
      issue("DM-3", "2026-09-21T12:00:00.000Z", [futureRelease]),
    ];

    const release = getLatestRelease(issues);
    expect(release?.name).toBe("2026.09");
    expect(filterIssuesByPeriod(issues, "release", release).map((item) => item.key)).toEqual(["DM-1"]);
  });
});
