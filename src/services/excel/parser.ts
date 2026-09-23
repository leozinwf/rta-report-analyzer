import type { ParsedReport } from "../../types";
import { classifyExecution } from "../analysis/classifier";
export { detectReportType } from "./detection";
export type { ReportDetection, ReportKind } from "./detection";

export class ExcelParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelParseError";
  }
}

export interface ParseProgress {
  phase: "reading" | "extracting" | "normalizing" | "classifying";
  percent: number;
}

export async function parseExcelFile(
  file: File,
  onProgress?: (progress: ParseProgress) => void,
): Promise<Omit<ParsedReport, "executions"> & { executions: ReturnType<typeof classifyExecution>[] }> {
  onProgress?.({ phase: "reading", percent: 10 });
  const buffer = await file.arrayBuffer();
  try {
    const { parseWorkbook, readWorkbook } = await import("./workbook");
    return parseWorkbook(readWorkbook(buffer), file.name, onProgress);
  } catch {
    throw new ExcelParseError(
      "Não foi possível ler o relatório. Verifique se o arquivo possui uma aba de execuções válida.",
    );
  }
}
