import type { CanonicalStatus } from "../types";

export const STATUS_ALIASES: Record<string, CanonicalStatus> = {
  sucesso: "success",
  success: "success",
  ok: "success",
  erro: "error",
  error: "error",
  falha: "error",
  fail: "error",
  failed: "error",
  "site instavel": "instability",
  "site instável": "instability",
  instavel: "instability",
  instável: "instability",
  instability: "instability",
  "sem resultados": "no_result",
  "sem resultado": "no_result",
  "no result": "no_result",
  aviso: "warning",
  warning: "warning",
  warn: "warning",
  pendente: "pending",
  pending: "pending",
  processando: "processing",
  processing: "processing",
  cancelado: "cancelled",
  canceled: "cancelled",
  cancelled: "cancelled",
};

export function canonicalStatusFromLabel(status: string): CanonicalStatus {
  const key = status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return STATUS_ALIASES[key] ?? STATUS_ALIASES[status.trim().toLowerCase()] ?? "unknown";
}
