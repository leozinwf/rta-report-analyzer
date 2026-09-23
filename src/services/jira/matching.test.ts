import { describe, expect, it } from "vitest";
import { makeClassified } from "../../fixtures/sampleExecutions";
import { analyzeReport } from "../analysis";
import { findJiraMatchesForRobot } from "./matching";
import type { JiraIssue } from "./storage";

function issue(summary: string): JiraIssue {
  return {
    key: "DM-4730",
    summary,
    status: "Em Revisão - BPO",
    priority: "Alta",
    assignee: "",
    description: "",
    created: "2026-09-20T12:00:00.000Z",
    updated: "2026-09-23T12:00:00.000Z",
    issueType: "Bug",
    labels: [],
    components: [],
    url: "https://example.atlassian.net/browse/DM-4730",
  };
}

describe("Jira matching", () => {
  it("matches an abbreviated Dívida Ativa card using structural terms and UF", () => {
    const robot = "Certidão Negativa de Débitos Tributários da Dívida Ativa do estado de SP";
    const executions = [makeClassified({ robot, message: "Tempo de execução excedido. Tente novamente." })];
    const problem = analyzeReport(executions).problems[0];

    const matches = findJiraMatchesForRobot(problem, robot, [
      issue("[AUT] Certidão Dívida Ativa SP - Não foi possível fazer o download do arquivo no intervalo de 60 segundos."),
    ]);

    expect(matches[0]?.issue.key).toBe("DM-4730");
    expect(matches[0]?.confidence).toBe("Alta");
    expect(matches[0]?.closed).toBe(false);
  });
});
