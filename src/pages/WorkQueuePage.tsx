import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardList, ExternalLink, Eye, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "../components/common/CopyButton";
import { EmptyState } from "../components/common/EmptyState";
import { Modal } from "../components/common/Modal";
import { TokenCell } from "../components/common/TokenCell";
import { useReport } from "../context/ReportContext";
import { loadJiraIssues, type JiraIssue } from "../services/jira/storage";
import { buildWorkQueue, type WorkDecision, type WorkItem } from "../services/workQueue";
import { formatNumber, formatPercent } from "../utils/format";

const DECISION_LABEL: Record<WorkDecision, string> = {
  open: "Precisa de card",
  existing: "Já possui card",
  regression: "Erro voltou a ocorrer",
  verify: "Possível card — revisar",
  monitor: "Monitorar",
};

const DECISION_DESCRIPTION: Record<WorkDecision, string> = {
  open: "Nenhum card relacionado foi encontrado; há evidências suficientes para avaliar a criação.",
  existing: "Foi encontrado um card aberto da mesma certidão, robô ou fornecedor.",
  regression: "Foi encontrado um card concluído, mas o mesmo problema voltou a aparecer.",
  verify: "Existe um card parecido, mas os dados não são suficientes para confirmar que é o mesmo caso.",
  monitor: "O sinal ainda parece temporário ou tem volume insuficiente para recomendar um card.",
};

interface ConcentrationItem {
  robot: string;
  total: number;
  instability: number;
  siteError: number;
  errors: number;
  successes: number;
  rate: number;
  statusCounts: Array<[string, number]>;
  tokens: string[];
}

const DECISION_STYLE: Record<WorkDecision, string> = {
  open: "border-red-200 bg-red-50 text-red-800",
  existing: "border-blue-200 bg-blue-50 text-blue-800",
  regression: "border-orange-200 bg-orange-50 text-orange-800",
  verify: "border-amber-200 bg-amber-50 text-amber-800",
  monitor: "border-slate-200 bg-slate-50 text-slate-700",
};

function buildCardText(item: WorkItem): string {
  const robot = item.robots[0] || "Robô";
  const title = `[RTA] ${robot} - ${item.problem.message}`;
  const body = [
    `Problema\n${item.problem.message}`,
    `Evidências\n- Ocorrências: ${item.total}\n- Execuções do robô: ${item.robotTotal}\n- Erros: ${item.robotErrors}\n- Site instável: ${item.robotInstabilities}\n- Site Error: ${item.robotSiteErrors}\n- Sucessos: ${item.robotSuccesses}\n- Prioridade sugerida: ${item.priority}`,
    `Robô/Type\n${robot}`,
    `Tokens de exemplo\n${item.tokens.length ? item.tokens.map((token) => `- ${token}`).join("\n") : "N/D"}`,
  ].join("\n\n");
  return `${title}\n\n${body}`;
}

export function WorkQueuePage() {
  const { filteredAnalysis, filteredExecutions } = useReport();
  const [jira, setJira] = useState<JiraIssue[]>([]);
  const [filter, setFilter] = useState<WorkDecision | "all">("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<WorkItem | null>(null);
  const [concentrationsOpen, setConcentrationsOpen] = useState(true);
  const [concentrationDetail, setConcentrationDetail] = useState<ConcentrationItem | null>(null);

  useEffect(() => {
    const refresh = () => void loadJiraIssues().then(setJira).catch(() => setJira([]));
    refresh();
    window.addEventListener("jira-issues-updated", refresh);
    return () => window.removeEventListener("jira-issues-updated", refresh);
  }, []);

  const queue = useMemo(
    () => filteredAnalysis ? buildWorkQueue(filteredAnalysis, filteredExecutions, jira) : [],
    [filteredAnalysis, filteredExecutions, jira],
  );

  const concentrations = useMemo<ConcentrationItem[]>(() => {
    const byRobot = new Map<string, typeof filteredExecutions>();
    filteredExecutions.forEach((row) => byRobot.set(row.robot, [...(byRobot.get(row.robot) ?? []), row]));
    return [...byRobot.entries()].map(([robot, rows]) => {
      const statusCounts = new Map<string, number>();
      rows.forEach((row) => statusCounts.set(row.status || "N/D", (statusCounts.get(row.status || "N/D") ?? 0) + 1));
      const instability = rows.filter((row) => row.canonicalStatus === "instability").length;
      const siteError = rows.filter((row) => /site[\s_-]*error/i.test(row.status)).length;
      const errors = rows.filter((row) => row.canonicalStatus === "error").length;
      const successes = rows.filter((row) => row.canonicalStatus === "success").length;
      const suspicious = instability + siteError;
      return {
        robot,
        total: rows.length,
        instability,
        siteError,
        errors,
        successes,
        rate: rows.length ? suspicious / rows.length : 0,
        statusCounts: [...statusCounts.entries()].sort((a, b) => b[1] - a[1]),
        tokens: rows.slice(0, 20).map((row) => row.id),
      };
    }).filter((item) => item.total >= 3 && item.rate >= 0.5).sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [filteredExecutions]);

  const normalizedQuery = query.trim().toLowerCase();
  const visible = queue.filter((item) => {
    if (filter !== "all" && item.decision !== filter) return false;
    if (!normalizedQuery) return true;
    return `${item.problem.message} ${item.robots.join(" ")} ${item.matches.map((match) => `${match.issue.key} ${match.issue.summary}`).join(" ")}`.toLowerCase().includes(normalizedQuery);
  });

  if (!filteredAnalysis) {
    return <EmptyState icon={ClipboardList} title="Nenhuma análise disponível" description="Carregue e analise um relatório para cruzar os casos com os cards do Jira." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fila de trabalho</h1>
        <p className="mt-1 text-sm text-muted">Cruza o relatório atual com os {jira.length.toLocaleString("pt-BR")} cards sincronizados do Jira.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(["open", "regression", "existing", "verify", "monitor"] as WorkDecision[]).map((decision) => {
          const count = queue.filter((item) => item.decision === decision).length;
          return (
            <button key={decision} type="button" onClick={() => setFilter(filter === decision ? "all" : decision)} title={DECISION_DESCRIPTION[decision]} className={`rounded-2xl border p-4 text-left transition ${filter === decision ? DECISION_STYLE[decision] : "border-line bg-panel hover:border-accent/40"}`}>
              <p className="text-xs font-medium">{DECISION_LABEL[decision]}</p>
              <p className="mt-1 text-2xl font-semibold">{count.toLocaleString("pt-BR")}</p>
              <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted">{DECISION_DESCRIPTION[decision]}</p>
            </button>
          );
        })}
      </section>

      {concentrations.length ? (
        <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-orange-700" />
              <div>
                <h2 className="font-semibold text-orange-950">Concentração por certidão ou robô</h2>
                <p className="mt-1 text-sm text-orange-900/75">Casos com pelo menos 50% das execuções em Site Instável ou Site Error. Concentração alta pode indicar erro persistente do robô, não apenas indisponibilidade temporária.</p>
              </div>
            </div>
            <button type="button" onClick={() => setConcentrationsOpen((value) => !value)} aria-expanded={concentrationsOpen} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-200 bg-panel px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100">
              {concentrationsOpen ? "Minimizar" : `Mostrar ${concentrations.length}`}
              <ChevronDown className={`size-3.5 transition-transform ${concentrationsOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          {concentrationsOpen ? <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {concentrations.slice(0, 12).map((item) => (
              <article key={item.robot} className="rounded-xl border border-orange-200 bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" title={item.robot}>{item.robot}</p>
                    <p className="mt-1 text-xs text-muted">{formatNumber(item.total)} execuções · {formatNumber(item.successes)} sucessos</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${item.rate >= 0.9 ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}`}>{formatPercent(item.rate)}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full bg-orange-600" style={{ width: `${item.rate * 100}%` }} /></div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {item.statusCounts.slice(0, 4).map(([status, count]) => <span key={status} className="rounded-full bg-panel-2 px-2.5 py-1">{status}: {count}</span>)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  {item.rate >= 0.9 && item.successes === 0 ? <p className="text-xs font-semibold text-red-700">Revisão prioritária: nenhuma execução bem-sucedida.</p> : <span />}
                  <button type="button" onClick={() => setConcentrationDetail(item)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-panel-2"><Eye className="size-3.5" /> Evidências</button>
                </div>
              </article>
            ))}
          </div> : null}
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar robô, mensagem ou chave Jira…" className="w-full rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none focus:border-accent" />
          </label>
          {filter !== "all" ? <button type="button" onClick={() => setFilter("all")} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">Mostrar todos</button> : null}
        </div>

        <div className="mt-4 space-y-3">
          {visible.map((item) => {
            const best = item.matches[0];
            return (
              <article key={item.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${DECISION_STYLE[item.decision]}`}>{DECISION_LABEL[item.decision]}</span>
                      <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs font-bold">{item.priority}</span>
                    </div>
                    <h3 className="mt-3 font-semibold">{item.robots[0]}</h3>
                    <p className="mt-1 text-sm text-muted">{item.problem.message}</p>
                    <p className="mt-2 text-xs text-muted">{item.total} ocorrências · {formatPercent(item.problemRate)} das execuções desta certidão/robô</p>
                    {best ? (
                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                        <strong>{best.issue.key}</strong> · {best.issue.status} · Correspondência {best.confidence}
                        <p className="mt-1 text-blue-800/80">{best.issue.summary}</p>
                      </div>
                    ) : <p className="mt-3 text-xs text-muted">Nenhum card correspondente encontrado no recorte sincronizado.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPreview(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-panel-2"><Eye className="size-3.5" /> Evidências</button>
                    <CopyButton value={buildCardText(item)} label="Copiar card" copiedLabel="Card copiado" />
                    {best?.issue.url ? <a href={best.issue.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-panel-2"><ExternalLink className="size-3.5" /> Abrir {best.issue.key}</a> : null}
                  </div>
                </div>
              </article>
            );
          })}
          {!visible.length ? <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center text-sm text-muted"><CheckCircle2 className="mx-auto mb-2 size-8" />Nenhum item neste filtro.</div> : null}
        </div>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><div className="flex gap-2"><ShieldAlert className="size-4 shrink-0" /><span>A correspondência é determinística e serve para triagem. Confirme o card do Jira e as evidências antes de criar ou alterar qualquer chamado.</span></div></div>

      <Modal open={Boolean(preview)} title={preview?.robots[0] ?? "Evidências"} onClose={() => setPreview(null)} wide>
        {preview ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <Info label="Execuções" value={preview.robotTotal} />
              <Info label="Sucessos" value={preview.robotSuccesses} />
              <Info label="Erros" value={preview.robotErrors} />
              <Info label="Site instável" value={preview.robotInstabilities} />
            </div>
            <div className="rounded-xl border border-line p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Problema</p><p className="mt-2 text-sm">{preview.problem.message}</p></div>
            {preview.matches.length ? <div><h3 className="text-sm font-semibold">Cards Jira relacionados</h3><div className="mt-2 space-y-2">{preview.matches.map((match) => <div key={match.issue.key} className="rounded-xl bg-panel-2 p-3 text-sm"><strong>{match.issue.key}</strong> · {match.issue.status} · {match.confidence}<p className="mt-1 text-xs text-muted">{match.issue.summary}</p><p className="mt-1 text-xs text-muted">{match.reasons.join("; ")}</p></div>)}</div></div> : null}
            <div><h3 className="text-sm font-semibold">Tokens para validação</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{preview.tokens.map((token) => <div key={token} className="rounded-lg border border-line bg-panel-2 px-3 py-2"><TokenCell token={token} full /></div>)}</div></div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(concentrationDetail)} title={concentrationDetail?.robot ?? "Concentração"} onClose={() => setConcentrationDetail(null)} wide>
        {concentrationDetail ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-5">
              <Info label="Execuções" value={concentrationDetail.total} />
              <Info label="Sucessos" value={concentrationDetail.successes} />
              <Info label="Erros" value={concentrationDetail.errors} />
              <Info label="Site instável" value={concentrationDetail.instability} />
              <Info label="Site Error" value={concentrationDetail.siteError} />
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">Leitura do recorte</p>
              <p className="mt-2 text-sm text-orange-950">{formatPercent(concentrationDetail.rate)} das execuções estão classificadas como Site Instável ou Site Error.{concentrationDetail.successes === 0 ? " Não houve nenhuma execução bem-sucedida." : ` Houve ${concentrationDetail.successes} execuções bem-sucedidas.`}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Distribuição completa dos status</h3>
              <div className="mt-2 space-y-2">{concentrationDetail.statusCounts.map(([status, count]) => <div key={status} className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2 text-sm"><span>{status}</span><span className="font-mono">{formatNumber(count)} · {formatPercent(count / concentrationDetail.total)}</span></div>)}</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Tokens para validação</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">{concentrationDetail.tokens.map((token) => <div key={token} className="rounded-lg border border-line bg-panel-2 px-3 py-2"><TokenCell token={token} full /></div>)}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-panel-2 p-3"><p className="text-[11px] uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-xl font-semibold">{formatNumber(value)}</p></div>;
}
