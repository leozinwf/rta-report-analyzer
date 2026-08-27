import * as XLSX from "xlsx";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SEVERITY_LABELS } from "../../data/labels";
import type { ClassifiedExecution, DashboardAnalysis } from "../../types";
import { formatDateTime } from "../../utils/date";
import { downloadBlob } from "../../utils/format";

function sheetFrom(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(rows);
}

export function exportAnalysisExcel(analysis: DashboardAnalysis, executions: ClassifiedExecution[]): void {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFrom(
      analysis.problems.map((problem) => ({
        Mensagem: problem.message,
        Quantidade: problem.count,
        Percentual: Number((problem.percent * 100).toFixed(2)),
        Categoria: CATEGORY_LABELS[problem.category],
        Severidade: SEVERITY_LABELS[problem.severity],
        Tipo: EVENT_TYPE_LABELS[problem.eventType],
        "Robôs afetados": problem.robotCount,
        "Tenants afetados": problem.tenantCount,
      })),
    ),
    "Problemas",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFrom(
      analysis.robots.map((robot) => ({
        Robô: robot.robot,
        Execuções: robot.total,
        Sucessos: robot.successCount,
        Erros: robot.errorCount,
        Instabilidade: robot.instabilityCount,
        Avisos: robot.warningCount,
        "Sem resultados": robot.noResultCount,
        "Taxa de sucesso": Number((robot.successRate * 100).toFixed(1)),
        Score: robot.problemScore,
        Status: robot.status,
      })),
    ),
    "Robôs",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFrom(
      analysis.stages.map((stage) => ({
        Etapa: stage.stage,
        Falhas: stage.count,
        "Robôs afetados": stage.robotCount,
        Categoria: CATEGORY_LABELS[stage.category],
        Severidade: SEVERITY_LABELS[stage.severity],
      })),
    ),
    "Etapas",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFrom(
      executions.map((row) => ({
        ID: row.id,
        Robô: row.robot,
        Status: row.status,
        Mensagem: row.message,
        Categoria: CATEGORY_LABELS[row.category],
        Severidade: SEVERITY_LABELS[row.severity],
        Tipo: EVENT_TYPE_LABELS[row.eventType],
        Tenant: row.tenant ?? "N/D",
        Ambiente: row.environment ?? "N/D",
        Tentativa: row.attempt ?? "N/D",
        "Data/Hora": formatDateTime(row.date),
      })),
    ),
    "Execuções",
  );

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadBlob(
    "rta-analise.xlsx",
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
}
