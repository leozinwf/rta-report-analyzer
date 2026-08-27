import type { ErrorContext, ReportContext } from "./types";

export function reportPrompt(context: ReportContext): string {
  return [
    "Analise o resumo operacional abaixo e produza um diagnóstico objetivo.",
    "Não receba as linhas brutas; use apenas este contexto agregado.",
    JSON.stringify(context, null, 2),
  ].join("\n\n");
}

export function errorPrompt(error: ErrorContext): string {
  return [
    "Explique o problema abaixo e sugira ações de correção.",
    JSON.stringify(error, null, 2),
  ].join("\n\n");
}
