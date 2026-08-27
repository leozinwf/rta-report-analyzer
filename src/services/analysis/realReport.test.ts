import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseWorkbook } from "../excel/parser";
import { analyzeReport } from "./index";

const SAMPLE = "C:\\Users\\LeonardoSabatini\\Desktop\\01a042fd-041d-768e-8671-224d8b58d1c5.xlsx";

describe("real RTA excel report", () => {
  it("matches the known execution counts from the sample file", { timeout: 30000 }, () => {
    if (!existsSync(SAMPLE)) return;
    const workbook = XLSX.read(readFileSync(SAMPLE), { type: "buffer", cellDates: true });
    const parsed = parseWorkbook(workbook, "01a042fd-041d-768e-8671-224d8b58d1c5.xlsx");
    const analysis = analyzeReport(parsed.executions);

    expect(parsed.meta.analyzedSheet).toBe("Execuções");
    expect(parsed.meta.columns).toHaveLength(14);
    expect(parsed.meta.rowCount).toBe(7401);
    expect(analysis.metrics.total).toBe(7401);
    expect(analysis.metrics.successCount).toBe(2600);
    expect(analysis.metrics.errorCount).toBe(1661);
    expect(analysis.metrics.instabilityCount).toBe(1476);
    expect(analysis.metrics.noResultCount).toBe(1306);
    expect(analysis.metrics.warningCount).toBe(334);
    expect(analysis.retries.neededRetry).toBe(243);
    expect(analysis.robots.some((robot) => robot.robot === "BB8_CES")).toBe(true);
    expect(analysis.problems.some((problem) => /Downloaded file not found/i.test(problem.message))).toBe(true);
    expect(analysis.stages[0]?.stage).toBe("ClicarOpcaoCertidoes");
  });
});
