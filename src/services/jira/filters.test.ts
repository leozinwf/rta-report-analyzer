import { describe, expect, it } from "vitest";
import { filterIssuesByPeriod } from "./filters";
import type { JiraIssue } from "./storage";

function issue(key: string, updated: string): JiraIssue {
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

  it("filters cards that belong to the latest Jira release", () => {
    const issues = [
      issue("DM-1", "2026-09-20T12:00:00.000Z"),
      issue("DM-2", "2026-09-10T12:00:00.000Z"),
    ];
    const release = { id: "11", name: "Sprint 11", releaseDate: "2026-09-15", issueKeys: ["DM-1"] };

    expect(filterIssuesByPeriod(issues, "release", release).map((item) => item.key)).toEqual(["DM-1"]);
  });
});
