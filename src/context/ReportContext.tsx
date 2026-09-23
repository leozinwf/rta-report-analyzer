import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { analyzeReport } from "../services/analysis";
import { filterExecutions } from "../services/analysis/filterExecutions";
import {
  detectReportType,
  ExcelParseError,
  parseExcelFile,
  type ParseProgress,
  type ReportDetection,
} from "../services/excel/parser";
import {
  emptyFilters,
  type ClassifiedExecution,
  type DashboardAnalysis,
  type GlobalFilters,
  type ParsedReport,
} from "../types";

type Phase = "idle" | "parsing" | "parsed" | "analyzing" | "ready" | "error";

export interface LoadedReportInfo {
  fileName: string;
  rowCount: number;
  detection: ReportDetection;
  report: ParsedReport;
}

interface ReportContextValue {
  phase: Phase;
  progress: ParseProgress | { phase: "analyzing"; percent: number } | null;
  error: string | null;
  warnings: string[];
  parsed: ParsedReport | null;
  loadedReports: LoadedReportInfo[];
  analysis: DashboardAnalysis | null;
  filters: GlobalFilters;
  setFilters: (updater: GlobalFilters | ((current: GlobalFilters) => GlobalFilters)) => void;
  filteredExecutions: ClassifiedExecution[];
  filteredAnalysis: DashboardAnalysis | null;
  loadFile: (file: File) => Promise<void>;
  loadFiles: (files: File[]) => Promise<void>;
  runAnalysis: () => Promise<void>;
  reset: () => void;
}

const ReportContext = createContext<ReportContextValue | null>(null);

function combineReports(reports: LoadedReportInfo[]): ParsedReport {
  if (reports.length === 1) return reports[0].report;

  const warnings = new Set<string>();
  const columns = new Set<string>();
  const missingExpectedColumns = new Set<string>();
  const sheetNames: string[] = [];

  for (const item of reports) {
    item.report.meta.warnings.forEach((warning) => warnings.add(warning));
    item.report.meta.columns.forEach((column) => columns.add(column));
    item.report.meta.missingExpectedColumns.forEach((column) => missingExpectedColumns.add(column));
    item.report.meta.sheetNames.forEach((sheet) => sheetNames.push(`${item.fileName}: ${sheet}`));
  }

  warnings.add(`${reports.length} relatórios foram combinados em uma única análise.`);

  return {
    meta: {
      fileName: `${reports.length} relatórios combinados`,
      sheetNames,
      analyzedSheet: "Múltiplas abas",
      columns: [...columns],
      missingExpectedColumns: [...missingExpectedColumns],
      warnings: [...warnings],
      rowCount: reports.reduce((sum, item) => sum + item.rowCount, 0),
    },
    executions: reports.flatMap((item) => item.report.executions),
  };
}

export function ReportProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<ReportContextValue["progress"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [loadedReports, setLoadedReports] = useState<LoadedReportInfo[]>([]);
  const [analysis, setAnalysis] = useState<DashboardAnalysis | null>(null);
  const [filters, setFilters] = useState<GlobalFilters>(emptyFilters());

  const loadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    setError(null);
    setAnalysis(null);
    setParsed(null);
    setLoadedReports([]);
    setFilters(emptyFilters());
    setPhase("parsing");

    try {
      const reports: LoadedReportInfo[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const report = await parseExcelFile(file, (current) => {
          const percent = Math.round(((index + current.percent / 100) / files.length) * 100);
          setProgress({ phase: current.phase, percent });
        });
        reports.push({
          fileName: file.name,
          rowCount: report.meta.rowCount,
          detection: detectReportType(report.meta.columns),
          report,
        });
      }

      setLoadedReports(reports);
      setParsed(combineReports(reports));
      setPhase("parsed");
      setProgress(null);
    } catch (err) {
      const message =
        err instanceof ExcelParseError
          ? err.message
          : "Não foi possível ler o relatório. Verifique se o arquivo possui uma aba de execuções válida.";
      setError(message);
      setParsed(null);
      setLoadedReports([]);
      setPhase("error");
      setProgress(null);
    }
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      await loadFiles([file]);
    },
    [loadFiles],
  );

  const runAnalysis = useCallback(async () => {
    if (!parsed) return;
    setPhase("analyzing");
    setProgress({ phase: "analyzing", percent: 12 });
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    setProgress({ phase: "analyzing", percent: 38 });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const result = analyzeReport(parsed.executions);
    setProgress({ phase: "analyzing", percent: 92 });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    setAnalysis(result);
    setProgress({ phase: "analyzing", percent: 100 });
    setPhase("ready");
    setProgress(null);
  }, [parsed]);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(null);
    setError(null);
    setParsed(null);
    setLoadedReports([]);
    setAnalysis(null);
    setFilters(emptyFilters());
  }, []);

  const filteredExecutions = useMemo(() => {
    if (!parsed) return [];
    return filterExecutions(parsed.executions, filters);
  }, [parsed, filters]);

  const deferredExecutions = useDeferredValue(filteredExecutions);

  const filteredAnalysis = useMemo(() => {
    if (phase !== "ready") return null;
    return analyzeReport(deferredExecutions);
  }, [deferredExecutions, phase]);

  const value = useMemo<ReportContextValue>(
    () => ({
      phase,
      progress,
      error,
      warnings: parsed?.meta.warnings ?? [],
      parsed,
      loadedReports,
      analysis,
      filters,
      setFilters,
      filteredExecutions,
      filteredAnalysis,
      loadFile,
      loadFiles,
      runAnalysis,
      reset,
    }),
    [
      phase,
      progress,
      error,
      parsed,
      loadedReports,
      analysis,
      filters,
      filteredExecutions,
      filteredAnalysis,
      loadFile,
      loadFiles,
      runAnalysis,
      reset,
    ],
  );

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("useReport must be used within ReportProvider");
  return ctx;
}
