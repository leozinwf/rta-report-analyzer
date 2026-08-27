import { errorPrompt, reportPrompt } from "../prompts";
import type { AIAnalysis, AIErrorAnalysis, AIProvider, ErrorContext, ReportContext } from "../types";

/**
 * Stub — no network calls in this version.
 * Wire an HTTP client here when AI is enabled.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  async analyzeReport(context: ReportContext): Promise<AIAnalysis> {
    void reportPrompt(context);
    throw new Error("OpenAIProvider não está habilitado nesta versão");
  }

  async analyzeError(error: ErrorContext): Promise<AIErrorAnalysis> {
    void errorPrompt(error);
    throw new Error("OpenAIProvider não está habilitado nesta versão");
  }
}
