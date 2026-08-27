import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionHeader } from "../components/common/SectionHeader";
import { useReport } from "../context/ReportContext";
import { formatNumber, formatPercent } from "../utils/format";

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
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
                <p className="mb-2 inline-flex items-center gap-2 font-medium text-amber-200">
                  <AlertTriangle className="size-4" /> Problemas concentrados neste ambiente
                </p>
                {env.concentratedProblems.map((problem) => (
                  <p key={problem.message} className="text-amber-100/90">
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
              <XAxis dataKey="name" stroke="#8ea0b8" />
              <YAxis stroke="#8ea0b8" />
              <Tooltip contentStyle={{ background: "#0e1626", border: "1px solid #22324a" }} />
              <Bar dataKey="sucessos" fill="#34d399" />
              <Bar dataKey="erros" fill="#f87171" />
              <Bar dataKey="instavel" fill="#fb923c" />
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
