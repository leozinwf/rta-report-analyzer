import { AlertTriangle, ExternalLink, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    void loadJiraIssues()
      .then((cached) => setIssues(cached))
      .catch(() => setError("Não foi possível restaurar o cache local dos cards."));
  }, []);

  const statuses = useMemo(
    () => [...new Set(issues.map((issue) => issue.status || "N/D"))].sort(),
    [issues],
  );
  const priorities = useMemo(
    () => [...new Set(issues.map((issue) => issue.priority || "N/D"))].sort(),
    [issues],
  );
  const recurrences = useMemo(() => analyzeJiraRecurrences(issues), [issues]);
  const openCount = useMemo(() => issues.filter((issue) => !isClosed(issue.status)).length, [issues]);
  const highPriorityCount = useMemo(
    () => issues.filter((issue) => isHighPriority(issue.priority) && !isClosed(issue.status)).length,
    [issues],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return issues.filter((issue) => {
      if (status !== "all" && (issue.status || "N/D") !== status) return false;
      if (priority !== "all" && (issue.priority || "N/D") !== priority) return false;
      if (!normalizedQuery) return true;
      return [issue.key, issue.summary, issue.status, issue.priority, issue.assignee, issue.description]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [issues, priority, query, status]);

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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Cards carregados" value={issues.length} />
        <Metric label="Cards abertos" value={openCount} />
        <Metric label="Prioridade alta/crítica" value={highPriorityCount} />
        <Metric label="Grupos recorrentes" value={recurrences.length} />
      </section>

      {recurrences.length ? (
        <section>
          <div className="mb-3">
            <h3 className="text-lg font-semibold">Possíveis recorrências</h3>
            <p className="text-sm text-muted">Agrupamento por semelhança dos títulos. Revise os cards antes de tomar qualquer decisão.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {recurrences.slice(0, 8).map((group) => (
              <article key={group.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <AlertTriangle className="size-4" /> {group.title}
                    </p>
                    <p className="mt-1 text-xs text-amber-800">{group.count} cards semelhantes · atualizado em {formatDate(group.latestUpdated)}</p>
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
                  {filtered.slice(0, 500).map((issue) => (
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
            <p className="border-t border-line px-4 py-3 text-xs text-muted">Mostrando {Math.min(filtered.length, 500).toLocaleString("pt-BR")} de {filtered.length.toLocaleString("pt-BR")} cards filtrados.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-line bg-panel p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value.toLocaleString("pt-BR")}</p></div>;
}
