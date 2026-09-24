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
  it("groups similar error cards for the same identified robot", () => {
    const groups = analyzeJiraRecurrences([
      issue("DM-1", "[RTA] CRTCNDPELOTAS apresentando erro no download 123"),
      issue("DM-2", "Falha de download no robô CRTCNDPELOTAS 456"),
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

  it("does not group the same generic failure for different robots", () => {
    const groups = analyzeJiraRecurrences([
      issue("DM-4728", "[RTA->AUT] CRTCNDBIRIGUI - Não foi possível fazer o download do arquivo no intervalo de 60 segundos."),
      issue("DM-4712", "[RTA->AUT] Certidão CRTCNDSAOBERNARDO - Não foi possível fazer o download do arquivo no intervalo de 60 segundos."),
      issue("DM-4678", "[AUT] CRTCNDRS - Não foi possível fazer o download do PDF"),
      issue("DM-4603", "[RTA -> AUT] CRTCNDJABOATAODOSGUARARAPES - Não foi possível fazer o download do PDF"),
    ]);

    expect(groups).toEqual([]);
  });

  it("groups repeated failures only when they refer to the same robot", () => {
    const groups = analyzeJiraRecurrences([
      issue("DM-4692", "[AUT] Certidão CRTCNDPELOTAS - Há cenários não mapeados para essa execução."),
      issue("DM-4430", "[RTA] CRTCNDPELOTAS - Há cenários não mapeados para essa execução."),
      issue("DM-4709", "[RTA][CETIL] Certidão CRTCNDCONTAGEM - Há cenários não mapeados para essa execução"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].issues.map((item) => item.key)).toEqual(["DM-4692", "DM-4430"]);
  });

  it("does not group guide tasks for different municipalities or document codes", () => {
    const groups = analyzeJiraRecurrences([
      issue("DM-4233", "[PDF] Criar o scraping para a guia DAM do município de Registro"),
      issue("DM-4236", "[PDF] Criar o scraping para a guia DAM do município de Maranguape"),
      issue("DM-4342", "[PDF] Corrigir DARE 108"),
      issue("DM-4410", "[PDF] Erro no scraping da guia DARE 4014"),
    ]);

    expect(groups).toEqual([]);
  });
});
