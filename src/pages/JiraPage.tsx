import { AlertTriangle, ExternalLink, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  filterIssuesByPeriod,
  loadLatestRelease,
  saveLatestRelease,
  type JiraPeriod,
  type JiraRelease,
} from "../services/jira/filters";
import { analyzeJiraRecurrences } from "../services/jira/recurrence";
import {
  clearJiraIssues,
  loadJiraIssues,
  saveJiraIssues,
  type JiraIssue,
} from "../services/jira/storage";

interface JiraApiResponse {
  readOnly?: boolean;
  jql?: string;
  count?: number;
  issues?: JiraIssue[];
  syncedAt?: string;
  truncated?: boolean;
  maxResults?: number;
  latestRelease?: JiraRelease | null;
  error?: string;
}

function formatDate(value: string): string {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function isClosed(status: string): boolean {
  return /conclu|done|closed|resolvid|finaliz/i.test(status);
}

function isHighPriority(priority: string): boolean {
  return /highest|high|alta|alto|cr[ií]tic/i.test(priority);
}

type MetricFilter = "all" | "open" | "high" | "recurring";

export function JiraPage() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [jql, setJql] = useState("");
  const [period, setPeriod] = useState<JiraPeriod>(() => loadLatestRelease() ? "release" : "all");
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all");
  const [latestRelease, setLatestRelease] = useState<JiraRelease | null>(() => loadLatestRelease());

  useEffect(() => {
    void loadJiraIssues()
      .then((cached) => setIssues(cached))
      .catch(() => setError("Não foi possível restaurar o cache local dos cards."));
  }, []);

  const periodIssues = useMemo(
    () => filterIssuesByPeriod(issues, period, latestRelease),
    [issues, latestRelease, period],
  );
  const statuses = useMemo(
    () => [...new Set(periodIssues.map((issue) => issue.status || "N/D"))].sort(),
    [periodIssues],
  );
  const priorities = useMemo(
    () => [...new Set(periodIssues.map((issue) => issue.priority || "N/D"))].sort(),
    [periodIssues],
  );
  const recurrences = useMemo(() => analyzeJiraRecurrences(periodIssues), [periodIssues]);
  const recurringIssueKeys = useMemo(
    () => new Set(recurrences.flatMap((group) => group.issues.map((issue) => issue.key))),
    [recurrences],
  );
  const openCount = useMemo(() => periodIssues.filter((issue) => !isClosed(issue.status)).length, [periodIssues]);
  const highPriorityCount = useMemo(
    () => periodIssues.filter((issue) => isHighPriority(issue.priority) && !isClosed(issue.status)).length,
    [periodIssues],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return periodIssues.filter((issue) => {
      if (metricFilter === "open" && isClosed(issue.status)) return false;
      if (metricFilter === "high" && (!isHighPriority(issue.priority) || isClosed(issue.status))) return false;
      if (metricFilter === "recurring" && !recurringIssueKeys.has(issue.key)) return false;
      if (status !== "all" && (issue.status || "N/D") !== status) return false;
      if (priority !== "all" && (issue.priority || "N/D") !== priority) return false;
      if (!normalizedQuery) return true;
      return [issue.key, issue.summary, issue.status, issue.priority, issue.assignee, issue.description]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [metricFilter, periodIssues, priority, query, recurringIssueKeys, status]);

  function changePeriod(value: JiraPeriod) {
    setPeriod(value);
    setMetricFilter("all");
    setStatus("all");
    setPriority("all");
  }

  async function syncJira() {
    setSyncing(true);
    setError("");
    setInfo("");
    try {
      const response = await fetch("/api/jira", { method: "GET" });
      const result = await response.json().catch(() => ({})) as JiraApiResponse;
      if (!response.ok) throw new Error(result.error || `Falha HTTP ${response.status}`);
      const synced = result.issues ?? [];
      await saveJiraIssues(synced);
      setIssues(synced);
      window.dispatchEvent(new Event("jira-issues-updated"));
      setJql(result.jql ?? "");
      setLatestRelease(result.latestRelease ?? null);
      saveLatestRelease(result.latestRelease ?? null);
      setPeriod(result.latestRelease ? "release" : "all");
      setMetricFilter("all");
      setStatus("all");
      setPriority("all");
      setLastSync(formatDate(result.syncedAt ?? new Date().toISOString()));
      setInfo(
        result.truncated
          ? `${synced.length.toLocaleString("pt-BR")} cards sincronizados (limite de segurança atingido). Restrinja o JIRA_JQL para cards abertos ou recentes.`
          : `${synced.length.toLocaleString("pt-BR")} cards sincronizados em modo somente leitura.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao sincronizar o Jira.");
    } finally {
      setSyncing(false);
    }
  }

  async function clearCache() {
    await clearJiraIssues();
    setIssues([]);
    window.dispatchEvent(new Event("jira-issues-updated"));
    setInfo("");
    setJql("");
    setLastSync("");
    setLatestRelease(null);
    saveLatestRelease(null);
    setPeriod("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-ink">Cards Jira</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck className="size-3.5" /> Somente leitura
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">Analise cards abertos, prioridades e possíveis recorrências sem precisar carregar um relatório.</p>
          {lastSync ? <p className="mt-1 text-xs text-muted">Última sincronização: {lastSync}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void syncJira()}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Sincronizar Jira"}
        </button>
      </div>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <p className="text-sm font-semibold">Fase atual</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Consulta e análise são somente leitura. Criação de cards e alteração de prioridade serão adicionadas depois com permissões separadas, confirmação explícita e registro das alterações.
        </p>
        {jql ? <p className="mt-3 break-all font-mono text-xs text-muted">JQL: {jql}</p> : null}
      </section>

      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">{info}</div> : null}

      <section className="sticky top-0 z-30 -mx-2 !mt-0 space-y-2 rounded-b-2xl border border-line bg-panel p-3 shadow-md">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="grid gap-1 text-xs font-medium text-muted">
            Período dos cards
            <select
              value={period}
              onChange={(event) => changePeriod(event.target.value as JiraPeriod)}
              className="min-w-48 rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink"
            >
              <option value="release" disabled={!latestRelease}>
                {latestRelease ? `Última release · ${latestRelease.name}` : "Última release · sincronize novamente"}
              </option>
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="120">Últimos 120 dias</option>
              <option value="180">Últimos 180 dias</option>
              <option value="all">Todos os cards</option>
            </select>
          </label>
          <p className="text-xs text-muted">
            {periodIssues.length.toLocaleString("pt-BR")} de {issues.length.toLocaleString("pt-BR")} cards sincronizados
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Cards carregados" value={periodIssues.length} active={metricFilter === "all"} onClick={() => setMetricFilter("all")} hint="Mostrar todos do período" />
          <Metric label="Cards abertos" value={openCount} active={metricFilter === "open"} onClick={() => setMetricFilter(metricFilter === "open" ? "all" : "open")} hint="Filtrar cards ainda abertos" />
          <Metric label="Prioridade alta/crítica" value={highPriorityCount} active={metricFilter === "high"} onClick={() => setMetricFilter(metricFilter === "high" ? "all" : "high")} hint="Filtrar prioridades altas em aberto" />
          <Metric label="Grupos recorrentes" value={recurrences.length} active={metricFilter === "recurring"} onClick={() => setMetricFilter(metricFilter === "recurring" ? "all" : "recurring")} hint={`${recurringIssueKeys.size.toLocaleString("pt-BR")} cards relacionados`} />
        </div>
      </section>

      {recurrences.length && (metricFilter === "all" || metricFilter === "recurring") ? (
        <section>
          <div className="mb-3">
            <h3 className="text-lg font-semibold">Possíveis recorrências</h3>
            <p className="text-sm text-muted">Cards do mesmo robô, fornecedor ou local com sintomas semelhantes. Revise antes de tomar qualquer decisão.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {recurrences.slice(0, 8).map((group) => (
              <article key={group.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <AlertTriangle className="size-4" /> {group.title}
                    </p>
                    <p className="mt-1 text-xs text-amber-800">{group.count} ocorrências relacionadas · atualizado em {formatDate(group.latestUpdated)}</p>
                  </div>
                  <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950">{group.count}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.issues.slice(0, 6).map((issue) => (
                    <a key={issue.key} href={issue.url} target="_blank" rel="noreferrer" className="rounded-lg border border-amber-300 bg-white px-2 py-1 font-mono text-xs text-amber-900 hover:border-amber-500">
                      {issue.key}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar chave, resumo, responsável ou erro…" className="w-full rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none focus:border-accent" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">
            <option value="all">Todos os status</option>
            {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">
            <option value="all">Todas as prioridades</option>
            {priorities.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          {issues.length ? (
            <button type="button" onClick={() => void clearCache()} className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm text-muted hover:text-danger">
              <Trash2 className="size-4" /> Limpar cache
            </button>
          ) : null}
        </div>

        {!issues.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
            <ShieldCheck className="mx-auto size-10 text-muted" />
            <h3 className="mt-3 font-semibold">Nenhum card sincronizado</h3>
            <p className="mt-1 text-sm text-muted">Use “Sincronizar Jira” para carregar os cards definidos no JIRA_JQL.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-panel">
            <div className="overflow-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-panel-2 text-xs text-muted">
                  <tr><th className="p-3">Chave</th><th className="p-3">Resumo</th><th className="p-3">Status</th><th className="p-3">Prioridade</th><th className="p-3">Responsável</th><th className="p-3">Atualizado</th></tr>
                </thead>
                <tbody>
                  {filtered.map((issue) => (
                    <tr key={issue.key} className="border-t border-line hover:bg-panel-2/60">
                      <td className="p-3 font-semibold text-accent">
                        <a href={issue.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{issue.key}<ExternalLink className="size-3" /></a>
                      </td>
                      <td className="max-w-xl p-3">{issue.summary || "N/D"}</td>
                      <td className="p-3">{issue.status || "N/D"}</td>
                      <td className="p-3">{issue.priority || "N/D"}</td>
                      <td className="p-3">{issue.assignee || "Não atribuído"}</td>
                      <td className="p-3 text-xs text-muted">{formatDate(issue.updated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-4 py-3 text-xs text-muted">Mostrando {filtered.length.toLocaleString("pt-BR")} de {periodIssues.length.toLocaleString("pt-BR")} cards do período.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, active, onClick, hint }: { label: string; value: number; active: boolean; onClick: () => void; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-4 py-2.5 text-left transition ${active ? "border-accent bg-cyan-50 shadow-sm" : "border-line bg-panel hover:border-accent/50 hover:bg-panel-2"}`}
    >
      <p className={`text-xs font-medium ${active ? "text-accent" : "text-muted"}`}>{label}</p>
      <p className="mt-0.5 text-xl font-semibold leading-6">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-0.5 truncate text-[10px] leading-4 text-muted" title={hint}>{hint}</p>
    </button>
  );
}
