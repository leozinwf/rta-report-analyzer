import type {
  ErrorAnalysis,
  ReportContext,
} from "../types";

export interface ErrorContext {
  message: string;
  category: string;
  severity: string;
  eventType: string;
  count: number;
  robots: string[];
  environments: Record<string, number>;
}

export interface AIAnalysis {
  summary: string;
  recommendations: string[];
  risks: string[];
  provider: string;
}

export interface AIErrorAnalysis {
  explanation: string;
  likelyCause: string;
  suggestedActions: string[];
  provider: string;
}

export interface AIProvider {
  readonly name: string;
  analyzeReport(context: ReportContext): Promise<AIAnalysis>;
  analyzeError(error: ErrorContext): Promise<AIErrorAnalysis>;
}

export type { ErrorAnalysis, ReportContext };
