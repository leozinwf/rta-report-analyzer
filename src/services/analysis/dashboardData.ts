import type { CanonicalStatus, ClassifiedExecution, DashboardMetrics } from "../../types";

export interface StatusDistributionItem {
  key: string;
  name: string;
  value: number;
  rate: number;
  color: string;
}

export function buildStatusDistribution(metrics: DashboardMetrics): StatusDistributionItem[] {
  return [
    { key: "success", name: "Sucesso", value: metrics.successCount, color: "#059669" },
    { key: "error", name: "Erro", value: metrics.errorCount, color: "#dc2626" },
    { key: "instability", name: "Site instável", value: metrics.instabilityCount, color: "#ea580c" },
    { key: "no-result", name: "Sem resultados", value: metrics.noResultCount, color: "#64748b" },
    { key: "warning", name: "Aviso", value: metrics.warningCount, color: "#d97706" },
    { key: "pending", name: "Pendente", value: metrics.pendingCount, color: "#7c3aed" },
    { key: "processing", name: "Processando", value: metrics.processingCount, color: "#0284c7" },
    { key: "cancelled", name: "Cancelado", value: metrics.cancelledCount, color: "#475569" },
    { key: "other", name: "Não identificado", value: metrics.otherCount, color: "#94a3b8" },
  ]
    .filter((item) => item.value > 0)
    .map((item) => ({ ...item, rate: metrics.total ? item.value / metrics.total : 0 }));
}

const STATUS_COLORS: Record<CanonicalStatus, string> = {
  success: "#059669",
  error: "#dc2626",
  instability: "#ea580c",
  no_result: "#64748b",
  warning: "#d97706",
  pending: "#7c3aed",
  processing: "#0284c7",
  cancelled: "#475569",
  unknown: "#94a3b8",
};

export function buildRawStatusDistribution(
  executions: Array<Pick<ClassifiedExecution, "status" | "canonicalStatus">>,
): StatusDistributionItem[] {
  const grouped = new Map<string, { value: number; canonicalStatus: CanonicalStatus }>();

  for (const execution of executions) {
    const name = execution.status.trim() || "N/D";
    const current = grouped.get(name);
    grouped.set(name, {
      value: (current?.value ?? 0) + 1,
      canonicalStatus: current?.canonicalStatus ?? execution.canonicalStatus,
    });
  }

  return [...grouped.entries()]
    .map(([name, item]) => ({
      key: name,
      name,
      value: item.value,
      rate: executions.length ? item.value / executions.length : 0,
      color: STATUS_COLORS[item.canonicalStatus],
    }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"));
}
