import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { HealthBadge, StatusBadge } from "../components/common/Badge";
import { DataTable, type Column } from "../components/common/DataTable";
import { EmptyState } from "../components/common/EmptyState";
import { Modal } from "../components/common/Modal";
import { RobotNameCell } from "../components/common/RobotNameCell";
import { SectionHeader } from "../components/common/SectionHeader";
import { TokenCell } from "../components/common/TokenCell";
import { useReport } from "../context/ReportContext";
import type { RobotAnalysis } from "../types";
import { formatNumber, formatPercent } from "../utils/format";
import { CHART_COLORS, CHART_TOOLTIP } from "../utils/chartTheme";
import { Bot } from "lucide-react";

const COLORS = [
  CHART_COLORS.success,
  CHART_COLORS.danger,
  CHART_COLORS.unstable,
  CHART_COLORS.muted,
  CHART_COLORS.warning,
  CHART_COLORS.accent,
  "#475569",
];

export function RobotsPage() {
  const { filteredAnalysis } = useReport();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const navigate = useNavigate();
  const robots = filteredAnalysis?.robots ?? [];

  const rows = useMemo(() => {
    return robots.filter((robot) => {
      if (status !== "all" && robot.status !== status) return false;
      if (query && !robot.robot.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [robots, query, status]);

  const columns: Column<RobotAnalysis>[] = [
    { key: "robot", header: "Robô", sortValue: (row) => row.robot, render: (row) => <RobotNameCell name={row.robot} /> },
    { key: "total", header: "Execuções", align: "right", sortValue: (row) => row.total, render: (row) => formatNumber(row.total) },
    { key: "success", header: "Sucessos", align: "right", sortValue: (row) => row.successCount, render: (row) => formatNumber(row.successCount) },
    { key: "error", header: "Erros", align: "right", sortValue: (row) => row.errorCount, render: (row) => formatNumber(row.errorCount) },
    { key: "rate", header: "Taxa de sucesso", align: "right", sortValue: (row) => row.successRate, render: (row) => formatPercent(row.successRate) },
    { key: "score", header: "Score", align: "right", sortValue: (row) => row.problemScore, render: (row) => row.problemScore.toFixed(1) },
    { key: "status", header: "Status", sortValue: (row) => row.status, render: (row) => <HealthBadge value={row.status} /> },
  ];

  return (
    <div>
      <SectionHeader
        title="Robôs"
        action={
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar robô"
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
              <option value="all">Todos os status</option>
              <option value="healthy">Saudável</option>
              <option value="watch">Atenção</option>
              <option value="critical">Crítico</option>
            </select>
          </div>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/robos/${encodeURIComponent(row.id)}`)}
      />
    </div>
  );
}

export function RobotDetailPage() {
  const { robotId } = useParams();
  const { filteredAnalysis, parsed, setFilters, filters } = useReport();
  const navigate = useNavigate();
  const robot = filteredAnalysis?.robots.find((item) => item.id === decodeURIComponent(robotId ?? ""));

  if (!robot) {
    return <EmptyState icon={Bot} title="Robô não encontrado" description="Selecione um robô na lista." />;
  }

  const pieData = Object.entries(robot.statusDistribution).map(([name, value]) => ({ name, value }));
  const sampleStatuses = parsed?.executions.filter((row) => (row.robotId || row.robot) === robot.id).slice(0, 8);

  return (
    <Modal open title={robot.robot} onClose={() => navigate("/robos")} wide>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Info label="Execuções" value={formatNumber(robot.total)} />
          <Info label="Taxa de sucesso" value={formatPercent(robot.successRate)} />
          <Info label="Taxa de falha" value={formatPercent(robot.errorRate)} />
          <Info label="Problem score" value={robot.problemScore.toFixed(1)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HealthBadge value={robot.status} />
          <RobotNameCell name={robot.robot} />
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Principais problemas</h3>
          <ol className="space-y-2 text-sm">
            {robot.topProblems.map((problem, index) => (
              <li key={problem.message} className="flex justify-between gap-4">
                <span>
                  {index + 1}. {problem.message || "N/D"}
                </span>
                <span className="font-mono text-muted">{formatNumber(problem.count)}</span>
              </li>
            ))}
          </ol>
        </div>
        {sampleStatuses?.length ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Amostra de execuções</h3>
            <ul className="space-y-2">
              {sampleStatuses.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <TokenCell token={row.id} />
                    <p className="mt-1 truncate text-muted">{row.message || "N/D"}</p>
                  </div>
                  <StatusBadge value={row.status} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <button
          type="button"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
          onClick={() => {
            setFilters({ ...filters, robots: [robot.robot] });
            navigate("/execucoes");
          }}
        >
          Ver execuções deste robô
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
