import { DataTable, type Column } from "../components/common/DataTable";
import { SectionHeader } from "../components/common/SectionHeader";
import { CategoryBadge, SeverityBadge } from "../components/common/Badge";
import { useReport } from "../context/ReportContext";
import type { StageAnalysis } from "../types";
import { formatNumber } from "../utils/format";

export function StagesPage() {
  const { filteredAnalysis } = useReport();
  const stages = filteredAnalysis?.stages ?? [];

  const columns: Column<StageAnalysis>[] = [
    { key: "stage", header: "Etapa", sortValue: (row) => row.stage, render: (row) => <span className="font-mono text-accent">{row.stage}</span> },
    { key: "count", header: "Falhas", align: "right", sortValue: (row) => row.count, render: (row) => formatNumber(row.count) },
    { key: "robots", header: "Robôs afetados", align: "right", sortValue: (row) => row.robotCount, render: (row) => formatNumber(row.robotCount) },
    { key: "category", header: "Categoria", render: (row) => <CategoryBadge value={row.category} /> },
    { key: "severity", header: "Severidade", render: (row) => <SeverityBadge value={row.severity} /> },
    {
      key: "messages",
      header: "Mensagens relacionadas",
      className: "max-w-[420px]",
      render: (row) => row.messages[0]?.message || "N/D",
    },
  ];

  return (
    <div>
      <SectionHeader
        title="Etapas que mais falham"
        description="Métodos e instruções extraídos automaticamente das mensagens."
      />
      <DataTable rows={stages} columns={columns} rowKey={(row) => row.stage} />
      {stages[0] ? (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
          <h3 className="text-sm font-semibold">Robôs afetados em {stages[0].stage}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {stages[0].robots.map((robot) => (
              <span key={robot} className="rounded-md bg-panel-2 px-2 py-1 text-xs">
                {robot}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
