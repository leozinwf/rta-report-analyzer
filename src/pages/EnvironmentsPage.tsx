import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionHeader } from "../components/common/SectionHeader";
import { useReport } from "../context/ReportContext";
import { formatNumber, formatPercent } from "../utils/format";
import { CHART_AXIS, CHART_COLORS, CHART_TOOLTIP } from "../utils/chartTheme";

export function EnvironmentsPage() {
  const { filteredAnalysis } = useReport();
  const environments = filteredAnalysis?.environments ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Ambientes" description="Comparação entre ambientes presentes no relatório." />
      <div className="grid gap-4 md:grid-cols-2">
        {environments.map((env) => (
          <article key={env.environment} className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-semibold uppercase">{env.environment}</h3>
              <p className="font-mono text-muted">{formatNumber(env.total)}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Item label="Sucessos" value={formatNumber(env.successCount)} />
              <Item label="Erros" value={formatNumber(env.errorCount)} />
              <Item label="Instabilidade" value={formatNumber(env.instabilityCount)} />
              <Item label="Taxa de sucesso" value={formatPercent(env.successRate)} />
            </dl>
            {env.concentratedProblems.length ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="mb-2 inline-flex items-center gap-2 font-medium text-amber-800">
                  <AlertTriangle className="size-4" /> Problemas concentrados neste ambiente
                </p>
                {env.concentratedProblems.map((problem) => (
                  <p key={problem.message} className="text-amber-900">
                    {problem.message} · {formatPercent(problem.share)} das ocorrências
                  </p>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {environments.length ? (
        <div className="h-72 rounded-2xl border border-line bg-panel p-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={environments.map((env) => ({ name: env.environment.toUpperCase(), sucessos: env.successCount, erros: env.errorCount, instavel: env.instabilityCount }))}>
              <XAxis dataKey="name" stroke={CHART_AXIS} />
              <YAxis stroke={CHART_AXIS} />
              <Tooltip contentStyle={CHART_TOOLTIP} />
              <Bar dataKey="sucessos" fill={CHART_COLORS.success} />
              <Bar dataKey="erros" fill={CHART_COLORS.danger} />
              <Bar dataKey="instavel" fill={CHART_COLORS.unstable} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
