import { Download, Menu, Search } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useReport } from "../../context/ReportContext";
import { exportAnalysisExcel } from "../../services/export/excel";
import { exportExecutionsCsv, exportProblemsCsv, exportRobotsCsv, exportStagesCsv } from "../../services/export/csv";
import { formatNumber } from "../../utils/format";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { parsed, filters, setFilters, filteredExecutions, filteredAnalysis } = useReport();
  const [exportOpen, setExportOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const analysis = filteredAnalysis;
  const isUploadPage = pathname === "/relatorios";
  const isJiraPage = pathname === "/jira";
  const showReportControls = Boolean(parsed && !isUploadPage && !isJiraPage);

  const heading = isUploadPage
    ? {
        eyebrow: "Área de dados",
        title: "Carregar relatórios",
        subtitle: "Automation e CRT Geral",
      }
    : isJiraPage
      ? {
          eyebrow: "Central operacional",
          title: "Cards Jira",
          subtitle: "Acompanhe chamados abertos e recorrências",
        }
      : {
          eyebrow: "Relatório atual",
          title: parsed?.meta.fileName ?? "Nenhum relatório carregado",
          subtitle: parsed
            ? `${formatNumber(parsed.meta.rowCount)} execuções${
                filteredExecutions.length !== parsed.meta.rowCount
                  ? ` · ${formatNumber(filteredExecutions.length)} filtradas`
                  : ""
              }`
            : "Carregue um relatório para iniciar a análise",
        };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-6 py-3">
      <div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-lg border border-line p-2 hover:bg-panel-2 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-4" />
          </button>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{heading.eyebrow}</p>
        </div>
        <p className="font-medium">{heading.title}</p>
        <p className="text-xs text-muted">{heading.subtitle}</p>
      </div>
      {showReportControls ? <div className="flex flex-1 items-center justify-end gap-2">
        <label className="relative min-w-56 flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" />
          <input
            value={filters.search}
            onChange={(event) => {
              setFilters({ ...filters, search: event.target.value });
              navigate("/execucoes");
            }}
            placeholder="Buscar robô, erro, etapa, tenant..."
            className="w-full rounded-lg border border-line bg-panel px-9 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm hover:bg-panel-2"
          >
            <Download className="size-4" />
            Exportar análise
          </button>
          {exportOpen && analysis ? (
            <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
              <button className="block w-full px-4 py-2 text-left text-sm hover:bg-panel-2" onClick={() => { void exportAnalysisExcel(analysis, filteredExecutions); setExportOpen(false); }}>
                Excel completo
              </button>
              <button className="block w-full px-4 py-2 text-left text-sm hover:bg-panel-2" onClick={() => { exportProblemsCsv(analysis); setExportOpen(false); }}>
                CSV · problemas
              </button>
              <button className="block w-full px-4 py-2 text-left text-sm hover:bg-panel-2" onClick={() => { exportRobotsCsv(analysis); setExportOpen(false); }}>
                CSV · robôs
              </button>
              <button className="block w-full px-4 py-2 text-left text-sm hover:bg-panel-2" onClick={() => { exportStagesCsv(analysis); setExportOpen(false); }}>
                CSV · etapas
              </button>
              <button className="block w-full px-4 py-2 text-left text-sm hover:bg-panel-2" onClick={() => { exportExecutionsCsv(filteredExecutions); setExportOpen(false); }}>
                CSV · execuções filtradas
              </button>
            </div>
          ) : null}
        </div>
      </div> : null}
    </header>
  );
}
