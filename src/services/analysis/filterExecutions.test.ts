import { describe, expect, it } from "vitest";
import { makeClassified } from "../../fixtures/sampleExecutions";
import { emptyFilters } from "../../types";
import { filterExecutions } from "./filterExecutions";

const executions = [
  makeClassified({
    id: "A-1",
    robot: "Robô Emissor",
    status: "Erro",
    tenant: "cliente-a",
    environment: "prod",
    attempt: 2,
    date: new Date(2026, 8, 20, 12, 0, 0),
    message: "Falha no download",
  }),
  makeClassified({
    id: "R-2",
    robot: "Consulta Fiscal",
    status: "Sucesso",
    canonicalStatus: "success",
    eventType: "success",
    category: "unknown",
    severity: "info",
    tenant: "cliente-b",
    environment: "hom",
    attempt: 1,
    date: new Date(2026, 8, 22, 9, 0, 0),
    message: "Concluído com sucesso",
  }),
];

describe("global execution filters", () => {
  it("combines dimensions instead of applying them independently", () => {
    const result = filterExecutions(executions, {
      ...emptyFilters(),
      robots: ["Robô Emissor"],
      environments: ["prod"],
      attempts: [2],
    });

    expect(result.map((row) => row.id)).toEqual(["A-1"]);
  });

  it("searches normalized text with accents and respects date limits", () => {
    const result = filterExecutions(executions, {
      ...emptyFilters(),
      search: "robo emissor",
      dateFrom: "2026-09-20",
      dateTo: "2026-09-20",
    });

    expect(result.map((row) => row.id)).toEqual(["A-1"]);
  });
});
