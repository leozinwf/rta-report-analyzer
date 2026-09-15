import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { mapColumns, resolveExecutionSheet } from "./columnMap";
import { normalizeRows } from "./normalize";
import { detectReportType, parseWorkbook } from "./parser";

describe("column mapping", () => {
  it("maps the real Automation report headers", () => {
    const mapping = mapColumns([
      "Token",
      "ID do Robô",
      "Nome do Robô",
      "Publicado",
      "Status",
      "Origem",
      "Criação",
      "Inicio de Processamento",
      "Fim de Processamento",
      "Mensagem",
      "Tentativa",
      "Ambiente",
      "Tenant Alias",
      "Destino de Resposta",
    ]);
    expect(mapping.id).toBe("Token");
    expect(mapping.robot).toBe("Nome do Robô");
    expect(mapping.robotId).toBe("ID do Robô");
    expect(mapping.status).toBe("Status");
    expect(mapping.message).toBe("Mensagem");
    expect(mapping.tenant).toBe("Tenant Alias");
    expect(mapping.environment).toBe("Ambiente");
    expect(mapping.attempt).toBe("Tentativa");
    expect(mapping.date).toBe("Criação");
  });

  it("maps the CRT Geral report headers", () => {
    const mapping = mapColumns([
      "Token",
      "Tipo",
      "Ambiente",
      "Status",
      "Cliente",
      "Origem",
      "Data Criação",
      "Data Início de Processamento",
      "Data Fim de Processamento",
      "Mensagem",
      "Tentativa",
    ]);
    expect(mapping.id).toBe("Token");
    expect(mapping.robot).toBe("Tipo");
    expect(mapping.tenant).toBe("Cliente");
    expect(mapping.date).toBe("Data Criação");
    expect(mapping.startedAt).toBe("Data Início de Processamento");
    expect(mapping.finishedAt).toBe("Data Fim de Processamento");
  });

  it("resolves the Execuções sheet even with extra tabs", () => {
    expect(resolveExecutionSheet(["Capa", "Execuções", "Resumo"])).toBe("Execuções");
  });
});

describe("report type detection", () => {
  it("detects Automation reports", () => {
    const detection = detectReportType(["Token", "ID do Robô", "Nome do Robô", "Tenant Alias", "Status"]);
    expect(detection.kind).toBe("automation");
    expect(detection.confidence).toBe("high");
  });

  it("detects CRT Geral reports", () => {
    const detection = detectReportType(["Token", "Tipo", "Cliente", "Data Criação", "Status"]);
    expect(detection.kind).toBe("crt");
    expect(detection.confidence).toBe("high");
  });
});

describe("normalizeRows", () => {
  it("parses Brazilian dates, attempts and optional blanks", () => {
    const mapping = mapColumns(["Token", "Nome do Robô", "Status", "Mensagem", "Tentativa", "Criação", "Ambiente"]);
    const rows = normalizeRows(
      [
        {
          Token: "A-1",
          "Nome do Robô": "BB8_CES",
          Status: "Sucesso",
          Mensagem: "BB8_CES gerada com sucesso",
          Tentativa: "2",
          Criação: "26/08/2026 00:00:14",
          Ambiente: "prod",
        },
      ],
      mapping,
    );
    expect(rows[0].id).toBe("A-1");
    expect(rows[0].attempt).toBe(2);
    expect(rows[0].canonicalStatus).toBe("success");
    expect(rows[0].date?.getDate()).toBe(26);
    expect(rows[0].date?.getMonth()).toBe(7);
  });

  it("normalizes a CRT row using Tipo and Cliente", () => {
    const mapping = mapColumns(["Token", "Tipo", "Status", "Mensagem", "Tentativa", "Data Criação", "Cliente", "Ambiente"]);
    const rows = normalizeRows(
      [
        {
          Token: "R-1",
          Tipo: "CRTCNDMANHUACU",
          Status: "Erro",
          Mensagem: "Erro ao emitir certidão",
          Tentativa: "1",
          "Data Criação": "14/09/2026 08:00:00",
          Cliente: "cliente-x",
          Ambiente: "prod",
        },
      ],
      mapping,
    );
    expect(rows[0].robot).toBe("CRTCNDMANHUACU");
    expect(rows[0].tenant).toBe("cliente-x");
    expect(rows[0].id).toBe("R-1");
  });

  it("does not break when optional columns are missing", () => {
    const mapping = mapColumns(["Status"]);
    const rows = normalizeRows([{ Status: "Erro" }], mapping);
    expect(rows[0].robot).toBe("N/D");
    expect(rows[0].tenant).toBeUndefined();
    expect(rows[0].id).toBe("row-1");
  });
});

describe("parseWorkbook", () => {
  it("reads the Execuções sheet from an Automation workbook", () => {
    const sheet = XLSX.utils.json_to_sheet([
      {
        Token: "A-1",
        "Nome do Robô": "BB8_CES",
        Status: "Erro",
        Mensagem: "Downloaded file not found",
        Tentativa: 1,
        Ambiente: "prod",
        "Tenant Alias": "grupoilm",
        Criação: "26/08/2026 01:00:00",
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Execuções");
    const parsed = parseWorkbook(workbook, "relatorio.xlsx");
    expect(parsed.meta.rowCount).toBe(1);
    expect(parsed.meta.columns).toContain("Mensagem");
    expect(parsed.executions[0].category).toBe("download");
  });

  it("reads a CRT Geral workbook without losing Tipo, Cliente or dates", () => {
    const sheet = XLSX.utils.json_to_sheet([
      {
        Token: "R-1",
        Tipo: "CRTCNDCONTAGEM",
        Ambiente: "prod",
        Status: "Erro",
        Cliente: "cliente-x",
        Origem: "SQS - Dootax",
        "Data Criação": "14/09/2026 08:30:30",
        "Data Início de Processamento": "14/09/2026 08:30:32",
        "Data Fim de Processamento": "14/09/2026 08:31:00",
        Mensagem: "Erro ao emitir certidão",
        Tentativa: 1,
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Execuções");
    const parsed = parseWorkbook(workbook, "crt.xlsx");
    expect(parsed.executions[0].robot).toBe("CRTCNDCONTAGEM");
    expect(parsed.executions[0].tenant).toBe("cliente-x");
    expect(parsed.executions[0].date).toBeInstanceOf(Date);
  });

  it("warns when expected columns are missing", () => {
    const sheet = XLSX.utils.json_to_sheet([{ Status: "Sucesso", Extra: "x" }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Execuções");
    const parsed = parseWorkbook(workbook, "parcial.xlsx");
    expect(parsed.meta.warnings[0]).toMatch(/colunas não foram encontradas/i);
  });
});
