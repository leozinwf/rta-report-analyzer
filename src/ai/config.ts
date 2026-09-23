export type AIProviderName = "disabled" | "openai" | "gemini" | "ollama";

const configuredProvider = import.meta.env.VITE_AI_PROVIDER ?? "disabled";

export const AI_PROVIDER: AIProviderName = configuredProvider;
export const AI_ENABLED = import.meta.env.VITE_AI_ENABLED === "true" && AI_PROVIDER !== "disabled";
