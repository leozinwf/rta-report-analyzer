import { useMemo, useState } from "react";
import { CategoryBadge, EventTypeBadge, SeverityBadge, StatusBadge } from "../components/common/Badge";
import { DataTable, type Column } from "../components/common/DataTable";
import { SectionHeader } from "../components/common/SectionHeader";
import { useReport } from "../context/ReportContext";
import { exportExecutionsCsv } from "../services/export/csv";
import type { ClassifiedExecution } from "../types";
import { formatDateTime } from "../utils/date";

export function ExecutionsPage() {
  const { filteredExecutions } = useReport();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredExecutions;
    return filteredExecutions.filter((row) =>
      [row.id, row.robot, row.status, row.message, row.tenant, row.environment]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [filteredExecutions, query]);

  const columns: Column<ClassifiedExecution>[] = [
    { key: "id", header: "ID", className: "max-w-[140px] truncate font-mono text-xs", sortValue: (row) => row.id, render: (row) => row.id || "N/D" },
    { key: "robot", header: "Robô", sortValue: (row) => row.robot, render: (row) => row.robot || "N/D" },
    { key: "status", header: "Status", sortValue: (row) => row.status, render: (row) => <StatusBadge value={row.status} /> },
    { key: "message", header: "Mensagem", className: "max-w-[360px]", sortValue: (row) => row.message, render: (row) => row.message || "N/D" },
    { key: "category", header: "Categoria", sortValue: (row) => row.category, render: (row) => <CategoryBadge value={row.category} /> },
    { key: "severity", header: "Severidade", sortValue: (row) => row.severity, render: (row) => <SeverityBadge value={row.severity} /> },
    { key: "event", header: "Tipo", render: (row) => <EventTypeBadge value={row.eventType} /> },
    { key: "tenant", header: "Tenant", sortValue: (row) => row.tenant ?? "", render: (row) => row.tenant ?? "N/D" },
    { key: "env", header: "Ambiente", sortValue: (row) => row.environment ?? "", render: (row) => (row.environment ?? "N/D").toUpperCase() },
    { key: "attempt", header: "Tentativa", align: "right", sortValue: (row) => row.attempt ?? 0, render: (row) => row.attempt ?? "N/D" },
    { key: "date", header: "Data/Hora", sortValue: (row) => row.date?.getTime() ?? 0, render: (row) => formatDateTime(row.date) },
  ];

  return (
    <div>
      <SectionHeader
        title="Execuções"
        description="Tabela paginada. A exportação respeita os filtros globais."
        action={
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar nesta tabela"
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => exportExecutionsCsv(rows)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm hover:bg-panel-2"
            >
              Exportar filtradas
            </button>
          </div>
        }
      />
      <DataTable rows={rows} columns={columns} rowKey={(row) => row.id} pageSize={25} />
    </div>
  );
}
