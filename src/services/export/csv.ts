import type { DashboardAnalysis, ClassifiedExecution } from "../../types";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SEVERITY_LABELS } from "../../data/labels";
import { formatDateTime } from "../../utils/date";
import { downloadBlob } from "../../utils/format";

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvEscape).join(";"), ...rows.map((row) => row.map(csvEscape).join(";"))].join("\n");
}

export function exportProblemsCsv(analysis: DashboardAnalysis): void {
  const csv = toCsv(
    ["Mensagem", "Quantidade", "Percentual", "Categoria", "Severidade", "Tipo", "Robôs afetados"],
    analysis.problems.map((problem) => [
      problem.message,
      problem.count,
      (problem.percent * 100).toFixed(2),
      CATEGORY_LABELS[problem.category],
      SEVERITY_LABELS[problem.severity],
      EVENT_TYPE_LABELS[problem.eventType],
      problem.robotCount,
    ]),
  );
  downloadBlob("rta-problemas.csv", new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
}

export function exportRobotsCsv(analysis: DashboardAnalysis): void {
  const csv = toCsv(
    ["Robô", "Execuções", "Sucessos", "Erros", "Instabilidade", "Taxa de sucesso", "Score", "Status"],
    analysis.robots.map((robot) => [
      robot.robot,
      robot.total,
      robot.successCount,
      robot.errorCount,
      robot.instabilityCount,
      (robot.successRate * 100).toFixed(1),
      robot.problemScore,
      robot.status,
    ]),
  );
  downloadBlob("rta-robos.csv", new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
}

export function exportStagesCsv(analysis: DashboardAnalysis): void {
  const csv = toCsv(
    ["Etapa", "Falhas", "Robôs afetados", "Categoria", "Severidade"],
    analysis.stages.map((stage) => [
      stage.stage,
      stage.count,
      stage.robotCount,
      CATEGORY_LABELS[stage.category],
      SEVERITY_LABELS[stage.severity],
    ]),
  );
  downloadBlob("rta-etapas.csv", new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
}

export function exportExecutionsCsv(executions: ClassifiedExecution[]): void {
  const csv = toCsv(
    ["ID", "Robô", "Status", "Mensagem", "Categoria", "Severidade", "Tipo", "Tenant", "Ambiente", "Tentativa", "Data/Hora"],
    executions.map((row) => [
      row.id,
      row.robot,
      row.status,
      row.message,
      CATEGORY_LABELS[row.category],
      SEVERITY_LABELS[row.severity],
      EVENT_TYPE_LABELS[row.eventType],
      row.tenant ?? "N/D",
      row.environment ?? "N/D",
      row.attempt ?? "N/D",
      formatDateTime(row.date),
    ]),
  );
  downloadBlob("rta-execucoes.csv", new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
}
