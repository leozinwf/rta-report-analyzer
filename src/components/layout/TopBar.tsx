import { Download, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReport } from "../../context/ReportContext";
import { exportAnalysisExcel } from "../../services/export/excel";
import { exportExecutionsCsv, exportProblemsCsv, exportRobotsCsv, exportStagesCsv } from "../../services/export/csv";
import { formatNumber } from "../../utils/format";

export function TopBar() {
  const { parsed, filters, setFilters, filteredExecutions, filteredAnalysis } = useReport();
  const [exportOpen, setExportOpen] = useState(false);
  const navigate = useNavigate();
  const analysis = filteredAnalysis;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink/70 px-6 py-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Relatório atual</p>
        <p className="font-medium">{parsed?.meta.fileName ?? "N/D"}</p>
        <p className="text-xs text-muted">
          {formatNumber(parsed?.meta.rowCount ?? 0)} execuções
          {filteredExecutions.length !== parsed?.meta.rowCount
            ? ` · ${formatNumber(filteredExecutions.length)} filtradas`
            : ""}
        </p>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
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
              <button className="block w-full px-4 py-2 text-left text-sm hover:bg-panel-2" onClick={() => { exportAnalysisExcel(analysis, filteredExecutions); setExportOpen(false); }}>
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
      </div>
    </header>
  );
}
