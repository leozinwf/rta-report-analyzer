import * as XLSX from "xlsx";
import { EXPECTED_FIELDS } from "../../data/columnAliases";
import type { ParsedReport, ReportMeta } from "../../types";
import { classifyExecution } from "../analysis/classifier";
import { mapColumns, resolveExecutionSheet } from "./columnMap";
import { detectReportType } from "./detection";
import { normalizeRows } from "./normalize";
import { ExcelParseError, type ParseProgress } from "./parser";

export function readWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "array", cellDates: true });
}

export function parseWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  onProgress?: (progress: ParseProgress) => void,
): ParsedReport {
  const sheetNames = workbook.SheetNames;
  if (!sheetNames.length) {
    throw new ExcelParseError(
      "Não foi possível ler o relatório. Verifique se o arquivo possui uma aba de execuções válida.",
    );
  }

  const analyzedSheet = resolveExecutionSheet(sheetNames);
  if (!analyzedSheet || !workbook.Sheets[analyzedSheet]) {
    throw new ExcelParseError(
      "Não foi possível ler o relatório. Verifique se o arquivo possui uma aba de execuções válida.",
    );
  }

  onProgress?.({ phase: "extracting", percent: 35 });
  const sheet = workbook.Sheets[analyzedSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });

  const headerRow = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
  })[0];
  const columns = (headerRow ?? [])
    .map((value) => (value === null || value === undefined ? "" : String(value).trim()))
    .filter(Boolean);

  if (!columns.length || !rows.length) {
    throw new ExcelParseError(
      "Não foi possível ler o relatório. Verifique se o arquivo possui uma aba de execuções válida.",
    );
  }

  const mapping = mapColumns(columns);
  const missingExpectedColumns = EXPECTED_FIELDS.filter((field) => !mapping[field]).map((field) => field);
  const warnings: string[] = [];
  if (missingExpectedColumns.length) {
    warnings.push("Algumas colunas não foram encontradas. O relatório poderá ser analisado parcialmente.");
  }

  const detection = detectReportType(columns);
  if (detection.kind === "generic") {
    warnings.push("O formato do relatório não foi reconhecido como Automation ou CRT Geral. Foi aplicado o mapeamento genérico.");
  }

  onProgress?.({ phase: "normalizing", percent: 60 });
  const executions = normalizeRows(rows, mapping);

  onProgress?.({ phase: "classifying", percent: 85 });
  const classified = executions.map(classifyExecution);

  const meta: ReportMeta = {
    fileName,
    sheetNames,
    analyzedSheet,
    columns,
    missingExpectedColumns,
    warnings,
    rowCount: classified.length,
  };

  onProgress?.({ phase: "classifying", percent: 100 });
  return { meta, executions: classified };
}
