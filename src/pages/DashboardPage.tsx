import { AlertTriangle, Ban, CheckCircle2, Gauge, Siren, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS } from "../data/labels";
import { useReport } from "../context/ReportContext";
import type { ErrorAnalysis } from "../types";
import { formatNumber, formatPercent } from "../utils/format";
import { CategoryBadge, EventTypeBadge, SeverityBadge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { SectionHeader } from "../components/common/SectionHeader";
import { StatCard } from "../components/common/StatCard";
import { ProblemDetail } from "../components/details/ProblemDetail";

const PIE_COLORS = ["#34d399", "#f87171", "#fb923c", "#94a3b8", "#fbbf24", "#64748b"];

export function DashboardPage() {
  const { filteredAnalysis } = useReport();
  const [problem, setProblem] = useState<ErrorAnalysis | null>(null);
  const [sort, setSort] = useState<"count" | "percent" | "robots" | "severity">("count");
  const analysis = filteredAnalysis;

  const healthData = useMemo(() => {
    if (!analysis) return [];
    return [
      { name: "Sucesso", value: analysis.metrics.successRate },
      { name: "Falha", value: analysis.metrics.errorRate },
      { name: "Instabilidade", value: analysis.metrics.instabilityRate },
      { name: "Sem dados", value: analysis.metrics.noResultRate },
      { name: "Avisos", value: analysis.metrics.warningRate },
    ];
  }, [analysis]);

  const pieData = useMemo(() => {
    if (!analysis) return [];
    return [
      { name: "Sucesso", value: analysis.metrics.successCount },
      { name: "Erro", value: analysis.metrics.errorCount },
      { name: "Site instável", value: analysis.metrics.instabilityCount },
      { name: "Sem resultados", value: analysis.metrics.noResultCount },
      { name: "Aviso", value: analysis.metrics.warningCount },
    ].filter((item) => item.value > 0);
  }, [analysis]);

  if (!analysis) {
    return <EmptyState icon={Gauge} title="Nenhum relatório analisado" description="Carregue um Excel para ver o dashboard." />;
  }

  const { metrics } = analysis;
  const problems = [...analysis.problems].sort((a, b) => {
    if (sort === "percent") return b.percent - a.percent;
    if (sort === "robots") return b.robotCount - a.robotCount;
    if (sort === "severity") {
      const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return order[b.severity] - order[a.severity] || b.count - a.count;
    }
    return b.count - a.count;
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total" value={formatNumber(metrics.total)} icon={Gauge} />
        <StatCard label="Sucessos" value={formatNumber(metrics.successCount)} hint={formatPercent(metrics.successRate)} icon={CheckCircle2} tone="success" />
        <StatCard label="Erros" value={formatNumber(metrics.errorCount)} hint={formatPercent(metrics.errorRate)} icon={Ban} tone="danger" />
        <StatCard label="Site instável" value={formatNumber(metrics.instabilityCount)} hint={formatPercent(metrics.instabilityRate)} icon={Siren} tone="unstable" />
        <StatCard label="Sem resultados" value={formatNumber(metrics.noResultCount)} hint={formatPercent(metrics.noResultRate)} icon={TriangleAlert} tone="muted" />
        <StatCard label="Avisos" value={formatNumber(metrics.warningCount)} hint={formatPercent(metrics.warningRate)} icon={AlertTriangle} tone="warning" />
      </div>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <SectionHeader title="Resumo do relatório" description="Gerado automaticamente a partir dos dados, sem IA." />
        <div className="space-y-2 text-sm leading-relaxed text-slate-200">
          {analysis.summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <SectionHeader title="Saúde dos robôs" description="Taxas calculadas sobre o recorte atual." />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={healthData}>
                <XAxis dataKey="name" stroke="#8ea0b8" fontSize={12} />
                <YAxis stroke="#8ea0b8" fontSize={12} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                <Tooltip formatter={(value) => formatPercent(Number(value))} contentStyle={{ background: "#0e1626", border: "1px solid #22324a" }} />
                <Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-5">
          <SectionHeader title="Distribuição de status" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(Number(value))} contentStyle={{ background: "#0e1626", border: "1px solid #22324a" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            {pieData.map((item, index) => (
              <span key={item.name} className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: PIE_COLORS[index] }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <SectionHeader title="Classificação dos eventos" description="Erro técnico versus resultado de negócio." />
          <ul className="space-y-2">
            {Object.entries(analysis.eventTypeDistribution).map(([key, count]) => (
              <li key={key} className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2 text-sm">
                <span>{EVENT_TYPE_LABELS[key as keyof typeof EVENT_TYPE_LABELS]}</span>
                <span className="font-mono">{formatNumber(count)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-5">
          <SectionHeader title="Categorias" />
          <ul className="space-y-2">
            {analysis.categories.map((category) => (
              <li key={category.category} className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2 text-sm">
                <span>{CATEGORY_LABELS[category.category]}</span>
                <span className="font-mono">
                  {formatNumber(category.count)} · {formatPercent(category.percent)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {analysis.anomalies.length ? (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <SectionHeader title="Anomalias detectadas" description="Regras estatísticas simples sobre este relatório. Sem histórico externo." />
          <ul className="space-y-3">
            {analysis.anomalies.map((anomaly) => (
              <li key={anomaly.id} className="rounded-xl border border-line bg-panel px-4 py-3">
                <p className="text-sm font-semibold text-amber-200">⚠ {anomaly.title}</p>
                <p className="mt-1 text-sm text-slate-300">{anomaly.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Principais problemas"
          action={
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            >
              <option value="count">Maior quantidade</option>
              <option value="percent">Percentual</option>
              <option value="robots">Robôs afetados</option>
              <option value="severity">Severidade</option>
            </select>
          }
        />
        <div className="grid gap-3">
          {problems.slice(0, 8).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setProblem(item)}
              className="rounded-2xl border border-line bg-panel p-5 text-left hover:border-accent/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-3xl text-sm font-medium leading-relaxed">{item.message}</p>
                <div className="flex gap-2">
                  <CategoryBadge value={item.category} />
                  <SeverityBadge value={item.severity} />
                  <EventTypeBadge value={item.eventType} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                <span className="font-mono text-white">{formatNumber(item.count)} ocorrências</span>
                <span>{formatPercent(item.percent)} das execuções</span>
                <span>{formatNumber(item.robotCount)} robôs afetados</span>
              </div>
            </button>
          ))}
        </div>
        <Link to="/problemas" className="mt-3 inline-block text-sm text-accent hover:underline">
          Ver ranking completo
        </Link>
      </section>

      <section>
        <SectionHeader title="Robôs que precisam de atenção" description="Ordenados por problem score (erro + volume + severidade + recorrência)." />
        <div className="grid gap-3 md:grid-cols-2">
          {analysis.robots.slice(0, 6).map((robot) => (
            <Link
              key={robot.id}
              to={`/robos/${encodeURIComponent(robot.id)}`}
              className="rounded-2xl border border-line bg-panel p-5 hover:border-accent/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{robot.robot}</p>
                  <p className="text-xs text-muted">{formatNumber(robot.total)} execuções</p>
                </div>
                <p className="font-mono text-lg text-orange-300">{robot.problemScore.toFixed(1)}</p>
              </div>
              <p className="mt-3 text-sm text-muted">
                Sucesso {formatPercent(robot.successRate)} · Erros {formatPercent(robot.errorRate)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <ProblemDetail problem={problem} onClose={() => setProblem(null)} />
    </div>
  );
}
