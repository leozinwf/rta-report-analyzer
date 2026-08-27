import { Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataTable, type Column } from "../components/common/DataTable";
import { EmptyState } from "../components/common/EmptyState";
import { Modal } from "../components/common/Modal";
import { SectionHeader } from "../components/common/SectionHeader";
import { CategoryBadge, SeverityBadge } from "../components/common/Badge";
import { useReport } from "../context/ReportContext";
import type { TenantAnalysis } from "../types";
import { formatNumber, formatPercent } from "../utils/format";

export function TenantsPage() {
  const { filteredAnalysis } = useReport();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const tenants = filteredAnalysis?.tenants ?? [];
  const rows = useMemo(
    () => tenants.filter((tenant) => tenant.tenant.toLowerCase().includes(query.toLowerCase())),
    [tenants, query],
  );

  const columns: Column<TenantAnalysis>[] = [
    { key: "tenant", header: "Tenant", sortValue: (row) => row.tenant, render: (row) => row.tenant },
    { key: "total", header: "Execuções", align: "right", sortValue: (row) => row.total, render: (row) => formatNumber(row.total) },
    { key: "success", header: "Sucessos", align: "right", sortValue: (row) => row.successCount, render: (row) => formatNumber(row.successCount) },
    { key: "error", header: "Erros", align: "right", sortValue: (row) => row.errorCount, render: (row) => formatNumber(row.errorCount) },
    { key: "rate", header: "Taxa de sucesso", align: "right", sortValue: (row) => row.successRate, render: (row) => formatPercent(row.successRate) },
  ];

  return (
    <div>
      <SectionHeader
        title="Tenants"
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar tenant"
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
          />
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.tenant}
        onRowClick={(row) => navigate(`/tenants/${encodeURIComponent(row.tenant)}`)}
      />
    </div>
  );
}

export function TenantDetailPage() {
  const { tenantId } = useParams();
  const { filteredAnalysis, setFilters, filters } = useReport();
  const navigate = useNavigate();
  const tenant = filteredAnalysis?.tenants.find((item) => item.tenant === decodeURIComponent(tenantId ?? ""));

  if (!tenant) {
    return <EmptyState icon={Building2} title="Tenant não encontrado" description="Selecione um tenant na lista." />;
  }

  return (
    <Modal open title={tenant.tenant} onClose={() => navigate("/tenants")} wide>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Info label="Execuções" value={formatNumber(tenant.total)} />
          <Info label="Sucessos" value={formatNumber(tenant.successCount)} />
          <Info label="Erros" value={formatNumber(tenant.errorCount)} />
          <Info label="Taxa de sucesso" value={formatPercent(tenant.successRate)} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Principais problemas</h3>
          <ul className="space-y-2">
            {tenant.topProblems.map((problem) => (
              <li key={problem.message} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  {problem.message}
                  <span className="mt-1 flex gap-2">
                    <CategoryBadge value={problem.category} />
                    <SeverityBadge value={problem.severity} />
                  </span>
                </span>
                <span className="font-mono">{formatNumber(problem.count)}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
          onClick={() => {
            setFilters({ ...filters, tenants: [tenant.tenant] });
            navigate("/execucoes");
          }}
        >
          Ver execuções deste tenant
        </button>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel-2 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}
