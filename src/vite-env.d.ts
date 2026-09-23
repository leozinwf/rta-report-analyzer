/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_ENABLED?: string;
  readonly VITE_AI_PROVIDER?: "disabled" | "openai" | "gemini" | "ollama";
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_OLLAMA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
