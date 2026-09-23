import { describe, expect, it } from "vitest";
import { analyzeJiraRecurrences } from "./recurrence";
import type { JiraIssue } from "./storage";

function issue(key: string, summary: string, updated = "2026-09-20T12:00:00.000Z"): JiraIssue {
  return {
    key,
    summary,
    status: "Aberto",
    priority: "Alta",
    assignee: "",
    description: "",
    created: updated,
    updated,
    issueType: "Bug",
    labels: [],
    components: [],
    url: `https://example.atlassian.net/browse/${key}`,
  };
}

describe("Jira recurrence analysis", () => {
  it("groups similar error cards while ignoring generic words and numbers", () => {
    const groups = analyzeJiraRecurrences([
      issue("DM-1", "[RTA] Robô fiscal apresentando erro no download 123"),
      issue("DM-2", "Falha de download no robô fiscal 456"),
      issue("DM-3", "Erro de autenticação no portal municipal"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
    expect(groups[0].issues.map((item) => item.key)).toEqual(["DM-1", "DM-2"]);
  });

  it("does not report isolated cards as recurrence", () => {
    expect(analyzeJiraRecurrences([
      issue("DM-1", "Erro de download"),
      issue("DM-2", "Certidão municipal indisponível"),
    ])).toEqual([]);
  });

  it("does not group creation cards from different suppliers", () => {
    const groups = analyzeJiraRecurrences([
      issue("DM-1", "[CRIAR] Incluir municípios ao fornecedor GRP"),
      issue("DM-2", "[CRIAR] Incluir municípios ao fornecedor CETIL"),
      issue("DM-3", "[CRIAR] Incluir municípios ao fornecedor FIORILLI"),
    ]);

    expect(groups).toEqual([]);
  });
});
