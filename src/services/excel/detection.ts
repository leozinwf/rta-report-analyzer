import { normalizeKey } from "../../utils/text";

export type ReportKind = "automation" | "crt" | "generic";

export interface ReportDetection {
  kind: ReportKind;
  label: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

export function detectReportType(columns: string[]): ReportDetection {
  const normalized = new Set(columns.map(normalizeKey));
  const has = (...headers: string[]) => headers.some((header) => normalized.has(normalizeKey(header)));

  const automationEvidence: string[] = [];
  if (has("ID do Robô")) automationEvidence.push("ID do Robô");
  if (has("Nome do Robô")) automationEvidence.push("Nome do Robô");
  if (has("Tenant Alias")) automationEvidence.push("Tenant Alias");
  if (has("Destino de Resposta")) automationEvidence.push("Destino de Resposta");

  if (automationEvidence.length >= 2) {
    return {
      kind: "automation",
      label: "Relatório Automation",
      confidence: automationEvidence.length >= 3 ? "high" : "medium",
      evidence: automationEvidence,
    };
  }

  const crtEvidence: string[] = [];
  if (has("Tipo")) crtEvidence.push("Tipo");
  if (has("Cliente")) crtEvidence.push("Cliente");
  if (has("Data Criação")) crtEvidence.push("Data Criação");
  if (has("Data Início de Processamento")) crtEvidence.push("Data Início de Processamento");

  if (crtEvidence.length >= 2) {
    return {
      kind: "crt",
      label: "Relatório CRT Geral",
      confidence: crtEvidence.length >= 3 ? "high" : "medium",
      evidence: crtEvidence,
    };
  }

  return {
    kind: "generic",
    label: "Relatório RTA genérico",
    confidence: "low",
    evidence: [],
  };
}
