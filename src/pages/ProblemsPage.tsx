import { useMemo, useState } from "react";
import { CategoryBadge, EventTypeBadge, SeverityBadge } from "../components/common/Badge";
import { DataTable, type Column } from "../components/common/DataTable";
import { ProblemDetail } from "../components/details/ProblemDetail";
import { SectionHeader } from "../components/common/SectionHeader";
import { useReport } from "../context/ReportContext";
import type { ErrorAnalysis } from "../types";
import { formatNumber, formatPercent } from "../utils/format";

export function ProblemsPage() {
  const { filteredAnalysis } = useReport();
  const [sort, setSort] = useState<"count" | "percent" | "robots" | "severity">("count");
  const [selected, setSelected] = useState<ErrorAnalysis | null>(null);
  const problems = filteredAnalysis?.problems ?? [];

  const rows = useMemo(() => {
    const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return [...problems].sort((a, b) => {
      if (sort === "percent") return b.percent - a.percent;
      if (sort === "robots") return b.robotCount - a.robotCount;
      if (sort === "severity") return order[b.severity] - order[a.severity] || b.count - a.count;
      return b.count - a.count;
    });
  }, [problems, sort]);

  const columns: Column<ErrorAnalysis>[] = [
    { key: "message", header: "Mensagem", className: "max-w-[420px]", sortValue: (row) => row.message, render: (row) => row.message || "N/D" },
    { key: "count", header: "Qtd", align: "right", sortValue: (row) => row.count, render: (row) => formatNumber(row.count) },
    { key: "percent", header: "%", align: "right", sortValue: (row) => row.percent, render: (row) => formatPercent(row.percent) },
    { key: "category", header: "Categoria", render: (row) => <CategoryBadge value={row.category} /> },
    { key: "severity", header: "Severidade", render: (row) => <SeverityBadge value={row.severity} /> },
    { key: "type", header: "Tipo", render: (row) => <EventTypeBadge value={row.eventType} /> },
    { key: "robots", header: "Robôs", align: "right", sortValue: (row) => row.robotCount, render: (row) => formatNumber(row.robotCount) },
  ];

  return (
    <div>
      <SectionHeader
        title="Problemas"
        description="Clique em uma linha para ver impacto, robôs, ambientes e tentativas."
        action={
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <option value="count">Maior quantidade</option>
            <option value="percent">Percentual</option>
            <option value="robots">Robôs afetados</option>
            <option value="severity">Severidade</option>
          </select>
        }
      />
      <DataTable rows={rows} columns={columns} rowKey={(row) => row.id} onRowClick={setSelected} />
      <ProblemDetail problem={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
