import { AI_ENABLED, AI_PROVIDER } from "./config";
import { DisabledProvider } from "./providers/DisabledProvider";
import { GeminiProvider } from "./providers/GeminiProvider";
import { OllamaProvider } from "./providers/OllamaProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import type { AIAnalysis, AIErrorAnalysis, AIProvider, ErrorContext } from "./types";
import type { ReportContext } from "../types";

function createProvider(): AIProvider {
  if (!AI_ENABLED) return new DisabledProvider();
  switch (AI_PROVIDER) {
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      return new DisabledProvider();
  }
}

class AIServiceImpl {
  private provider: AIProvider = createProvider();

  get enabled(): boolean {
    return AI_ENABLED;
  }

  get providerName(): string {
    return this.provider.name;
  }

  async analyzeReport(context: ReportContext): Promise<AIAnalysis> {
    if (!AI_ENABLED) {
      throw new Error("IA indisponível nesta versão");
    }
    return this.provider.analyzeReport(context);
  }

  async analyzeError(error: ErrorContext): Promise<AIErrorAnalysis> {
    if (!AI_ENABLED) {
      throw new Error("IA indisponível nesta versão");
    }
    return this.provider.analyzeError(error);
  }
}

export const AIService = new AIServiceImpl();
