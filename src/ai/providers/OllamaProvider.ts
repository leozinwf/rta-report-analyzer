import { errorPrompt, reportPrompt } from "../prompts";
import type { AIAnalysis, AIErrorAnalysis, AIProvider, ErrorContext, ReportContext } from "../types";

/**
 * Stub — no network calls in this version.
 */
export class OllamaProvider implements AIProvider {
  readonly name = "ollama";

  async analyzeReport(context: ReportContext): Promise<AIAnalysis> {
    void reportPrompt(context);
    throw new Error("OllamaProvider não está habilitado nesta versão");
  }

  async analyzeError(error: ErrorContext): Promise<AIErrorAnalysis> {
    void errorPrompt(error);
    throw new Error("OllamaProvider não está habilitado nesta versão");
  }
}
