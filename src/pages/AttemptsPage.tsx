import { ArrowDown, Ban, CheckCircle2, RotateCcw } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionHeader } from "../components/common/SectionHeader";
import { StatCard } from "../components/common/StatCard";
import { useReport } from "../context/ReportContext";
import { formatNumber, formatPercent } from "../utils/format";

export function AttemptsPage() {
  const { filteredAnalysis } = useReport();
  const retries = filteredAnalysis?.retries;
  const attempts = filteredAnalysis?.attempts ?? [];

  if (!retries) return null;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Recuperação automática"
        description="Cada linha possui Token único; a análise usa a coluna Tentativa, sem inventar vínculo entre execuções."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Precisaram de retry" value={formatNumber(retries.neededRetry)} icon={RotateCcw} />
        <StatCard label="Recuperadas" value={formatNumber(retries.recovered)} hint={formatPercent(retries.recoveredRate)} icon={CheckCircle2} tone="success" />
        <StatCard label="Continuaram com problema" value={formatNumber(retries.stillFailing)} icon={Ban} tone="danger" />
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <SectionHeader title="Distribuição por tentativa" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attempts.map((item) => ({ name: `Tentativa ${item.attempt}`, total: item.total, sucessos: item.successCount, erros: item.errorCount }))}>
              <XAxis dataKey="name" stroke="#8ea0b8" fontSize={12} />
              <YAxis stroke="#8ea0b8" fontSize={12} />
              <Tooltip contentStyle={{ background: "#0e1626", border: "1px solid #22324a" }} />
              <Bar dataKey="total" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              <Bar dataKey="sucessos" fill="#34d399" radius={[6, 6, 0, 0]} />
              <Bar dataKey="erros" fill="#f87171" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <SectionHeader title="Padrões de persistência" description="Mesmo problema reaparece em tentativas seguintes — maior prioridade." />
          {retries.persistentPatterns.length === 0 ? (
            <p className="text-sm text-muted">Nenhum padrão persistente evidente neste recorte.</p>
          ) : (
            <ul className="space-y-4">
              {retries.persistentPatterns.map((pattern) => (
                <li key={pattern.steps.join()} className="rounded-xl bg-panel-2 p-4 text-sm">
                  {pattern.steps.map((step, index) => (
                    <div key={`${step}-${index}`}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Tentativa {index + 1}</p>
                      <p className="mt-1">{step}</p>
                      {index < pattern.steps.length - 1 ? <ArrowDown className="my-2 size-4 text-orange-300" /> : null}
                    </div>
                  ))}
                  <p className="mt-3 text-xs text-muted">
                    Prioridade {pattern.priority} · {pattern.robots.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-panel p-5">
          <SectionHeader title="Padrões de recuperação" description="Falha seguida de sucesso em tentativa posterior." />
          {retries.recoveryPatterns.length === 0 ? (
            <p className="text-sm text-muted">Nenhum padrão de recuperação agregado neste recorte.</p>
          ) : (
            <ul className="space-y-4">
              {retries.recoveryPatterns.map((pattern) => (
                <li key={pattern.steps.join()} className="rounded-xl bg-panel-2 p-4 text-sm">
                  {pattern.steps.map((step, index) => (
                    <div key={`${step}-${index}`}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Tentativa {index + 1}</p>
                      <p className="mt-1">{step}</p>
                      {index < pattern.steps.length - 1 ? <ArrowDown className="my-2 size-4 text-emerald-300" /> : null}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {retries.persistentFailures.length ? (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <SectionHeader title="Falhas que repetem no retry" />
          <ul className="space-y-2 text-sm">
            {retries.persistentFailures.slice(0, 12).map((item) => (
              <li key={`${item.robot}-${item.message}`} className="flex justify-between gap-4 rounded-lg bg-panel-2 px-3 py-2">
                <span>
                  <span className="font-medium">{item.robot}</span>
                  <span className="block text-muted">{item.message}</span>
                </span>
                <span className="font-mono text-xs text-muted">
                  t2 {formatNumber(item.attempt2)} · t3+ {formatNumber(item.attempt3Plus)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
