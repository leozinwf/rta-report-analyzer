import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { analyzeReport } from "../services/analysis";
import { filterExecutions } from "../services/analysis/filterExecutions";
import { ExcelParseError, parseExcelFile, type ParseProgress } from "../services/excel/parser";
import {
  emptyFilters,
  type ClassifiedExecution,
  type DashboardAnalysis,
  type GlobalFilters,
  type ParsedReport,
} from "../types";

type Phase = "idle" | "parsing" | "parsed" | "analyzing" | "ready" | "error";

interface ReportContextValue {
  phase: Phase;
  progress: ParseProgress | { phase: "analyzing"; percent: number } | null;
  error: string | null;
  warnings: string[];
  parsed: ParsedReport | null;
  analysis: DashboardAnalysis | null;
  filters: GlobalFilters;
  setFilters: (updater: GlobalFilters | ((current: GlobalFilters) => GlobalFilters)) => void;
  filteredExecutions: ClassifiedExecution[];
  filteredAnalysis: DashboardAnalysis | null;
  loadFile: (file: File) => Promise<void>;
  runAnalysis: () => Promise<void>;
  reset: () => void;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<ReportContextValue["progress"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [analysis, setAnalysis] = useState<DashboardAnalysis | null>(null);
  const [filters, setFilters] = useState<GlobalFilters>(emptyFilters());

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setAnalysis(null);
    setFilters(emptyFilters());
    setPhase("parsing");
    try {
      const result = await parseExcelFile(file, setProgress);
      setParsed(result);
      setPhase("parsed");
      setProgress(null);
    } catch (err) {
      const message =
        err instanceof ExcelParseError
          ? err.message
          : "Não foi possível ler o relatório. Verifique se o arquivo possui uma aba de execuções válida.";
      setError(message);
      setParsed(null);
      setPhase("error");
      setProgress(null);
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!parsed) return;
    setPhase("analyzing");
    setProgress({ phase: "analyzing", percent: 40 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    const result = analyzeReport(parsed.executions);
    setProgress({ phase: "analyzing", percent: 100 });
    setAnalysis(result);
    setPhase("ready");
    setProgress(null);
  }, [parsed]);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(null);
    setError(null);
    setParsed(null);
    setAnalysis(null);
    setFilters(emptyFilters());
  }, []);

  const filteredExecutions = useMemo(() => {
    if (!parsed) return [];
    return filterExecutions(parsed.executions, filters);
  }, [parsed, filters]);

  const filteredAnalysis = useMemo(() => {
    if (phase !== "ready") return null;
    return analyzeReport(filteredExecutions);
  }, [filteredExecutions, phase]);

  const value = useMemo<ReportContextValue>(
    () => ({
      phase,
      progress,
      error,
      warnings: parsed?.meta.warnings ?? [],
      parsed,
      analysis,
      filters,
      setFilters,
      filteredExecutions,
      filteredAnalysis,
      loadFile,
      runAnalysis,
      reset,
    }),
    [
      phase,
      progress,
      error,
      parsed,
      analysis,
      filters,
      filteredExecutions,
      filteredAnalysis,
      loadFile,
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
