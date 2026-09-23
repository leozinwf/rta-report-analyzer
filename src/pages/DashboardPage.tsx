import { Gauge } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS } from "../data/labels";
import { useReport } from "../context/ReportContext";
import type { Anomaly, DashboardAnalysis, ErrorAnalysis } from "../types";
import { formatNumber, formatPercent } from "../utils/format";
import { CategoryBadge, EventTypeBadge, SeverityBadge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { Modal } from "../components/common/Modal";
import { RobotNameCell } from "../components/common/RobotNameCell";
import { SectionHeader } from "../components/common/SectionHeader";
import { ProblemDetail } from "../components/details/ProblemDetail";
import { buildRawStatusDistribution } from "../services/analysis/dashboardData";

const ANOMALY_TYPE_LABELS: Record<Anomaly["type"], string> = {
  robot_failure_rate: "Taxa de falha do robô",
  error_concentration: "Concentração de erros",
  environment_concentration: "Concentração por ambiente",
  retry_persistence: "Persistência após retry",
  volume_spike: "Pico de volume",
};

export function DashboardPage() {
  const { filteredAnalysis, filteredExecutions } = useReport();
  const [problem, setProblem] = useState<ErrorAnalysis | null>(null);
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [sort, setSort] = useState<"count" | "percent" | "robots" | "severity">("count");
  const analysis = filteredAnalysis;

  const statusData = useMemo(() => {
    return buildRawStatusDistribution(filteredExecutions);
  }, [filteredExecutions]);

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
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Visão geral</p>
            <h2 className="mt-1 text-lg font-semibold">Distribuição das execuções</h2>
            <p className="mt-1 text-sm text-muted">Percentuais calculados sobre o recorte exibido.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-panel-2 px-4 py-3">
            <Gauge className="size-5 text-accent" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Total analisado</p>
              <p className="font-mono text-xl font-semibold">{formatNumber(metrics.total)}</p>
            </div>
          </div>
        </div>

        <div className="px-5 pt-5">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-panel-2" aria-label="Distribuição percentual das execuções">
            {statusData.map((item) => (
              <div key={item.key} style={{ width: `${item.rate * 100}%`, backgroundColor: item.color }} title={`${item.name}: ${formatPercent(item.rate)}`} />
            ))}
          </div>
        </div>

        <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-5 mt-5">
          {statusData.map((item) => (
            <article key={item.key} className="bg-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="text-xs text-muted">{formatNumber(item.value)}</span>
              </div>
              <p className="mt-3 font-mono text-3xl font-semibold tracking-tight" style={{ color: item.color }}>{formatPercent(item.rate)}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel-2">
                <div className="h-full rounded-full" style={{ width: `${item.rate * 100}%`, backgroundColor: item.color }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <SectionHeader title="Resumo do relatório" description="Gerado automaticamente a partir dos dados, sem IA." />
        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
          {analysis.summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
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
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <SectionHeader title="Anomalias detectadas" description="Regras estatísticas simples sobre este relatório. Sem histórico externo." />
          <ul className="space-y-3">
            {analysis.anomalies.map((item) => (
              <li key={item.id} className="rounded-xl border border-line bg-panel px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-800">⚠ {item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnomaly(item)}
                    className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200"
                  >
                    Ver detalhes
                  </button>
                </div>
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
                <span className="font-mono text-ink">{formatNumber(item.count)} ocorrências</span>
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
                  <div className="font-semibold">
                    <RobotNameCell name={robot.robot} />
                  </div>
                  <p className="text-xs text-muted">{formatNumber(robot.total)} execuções</p>
                </div>
                <p className="font-mono text-lg text-orange-700">{robot.problemScore.toFixed(1)}</p>
              </div>
              <p className="mt-3 text-sm text-muted">
                Sucesso {formatPercent(robot.successRate)} · Erros {formatPercent(robot.errorRate)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <ProblemDetail problem={problem} onClose={() => setProblem(null)} />
      <AnomalyDetail anomaly={anomaly} analysis={analysis} onClose={() => setAnomaly(null)} />
    </div>
  );
}

function AnomalyDetail({ anomaly, analysis, onClose }: { anomaly: Anomaly | null; analysis: DashboardAnalysis; onClose: () => void }) {
  if (!anomaly) return null;

  const robot = anomaly.entity ? analysis.robots.find((item) => item.robot === anomaly.entity) : undefined;
  const environment = anomaly.entity ? analysis.environments.find((item) => item.environment === anomaly.entity) : undefined;
  const problem = anomaly.entity ? analysis.problems.find((item) => item.message === anomaly.entity) : undefined;

  return (
    <Modal open title={anomaly.title} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <DetailInfo label="Tipo" value={ANOMALY_TYPE_LABELS[anomaly.type]} />
          <DetailInfo label="Severidade" value={anomaly.severity.toUpperCase()} />
          <DetailInfo label="Entidade" value={anomaly.entity || "Relatório geral"} />
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Por que foi sinalizada</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{anomaly.description}</p>
        </div>

        {robot ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Dados do robô relacionado</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <DetailInfo label="Execuções" value={formatNumber(robot.total)} />
              <DetailInfo label="Sucessos" value={formatNumber(robot.successCount)} />
              <DetailInfo label="Erros" value={formatNumber(robot.errorCount)} />
              <DetailInfo label="Taxa de falha" value={formatPercent(robot.errorRate)} />
            </div>
            {robot.topProblems.length ? (
              <div className="mt-4 rounded-xl border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Principais problemas</p>
                <ol className="mt-2 space-y-2 text-sm">
                  {robot.topProblems.slice(0, 5).map((item, index) => (
                    <li key={item.message} className="flex justify-between gap-4">
                      <span>{index + 1}. {item.message || "N/D"}</span>
                      <span className="font-mono text-muted">{formatNumber(item.count)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <Link
              to={`/robos/${encodeURIComponent(robot.id)}`}
              className="mt-4 inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
            >
              Abrir detalhes do robô
            </Link>
          </div>
        ) : null}

        {environment ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Dados do ambiente relacionado</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <DetailInfo label="Execuções" value={formatNumber(environment.total)} />
              <DetailInfo label="Sucessos" value={formatNumber(environment.successCount)} />
              <DetailInfo label="Erros" value={formatNumber(environment.errorCount)} />
              <DetailInfo label="Taxa de falha" value={formatPercent(environment.errorRate)} />
            </div>
          </div>
        ) : null}

        {problem ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Dados do erro relacionado</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailInfo label="Ocorrências" value={formatNumber(problem.count)} />
              <DetailInfo label="Robôs afetados" value={formatNumber(problem.robotCount)} />
              <DetailInfo label="Percentual" value={formatPercent(problem.percent)} />
            </div>
          </div>
        ) : null}

        {anomaly.type === "retry_persistence" ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Retries</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailInfo label="Precisaram retry" value={formatNumber(analysis.retries.neededRetry)} />
              <DetailInfo label="Recuperados" value={formatNumber(analysis.retries.recovered)} />
              <DetailInfo label="Ainda falhando" value={formatNumber(analysis.retries.stillFailing)} />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function DetailInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel-2 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
