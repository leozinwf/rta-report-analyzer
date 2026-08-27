import type { AIAnalysis, AIErrorAnalysis, AIProvider } from "../types";

export class DisabledProvider implements AIProvider {
  readonly name = "disabled";

  async analyzeReport(): Promise<AIAnalysis> {
    throw new Error("IA indisponível nesta versão");
  }

  async analyzeError(): Promise<AIErrorAnalysis> {
    throw new Error("IA indisponível nesta versão");
  }
}
