interface ApiRequest {
  method?: string;
}

interface JiraSprint {
  id?: number;
  name?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: Record<string, unknown>): void;
}

interface JiraPayload {
  readOnly: true;
  jql: string;
  count: number;
  issues: ReturnType<typeof issueToDto>[];
  truncated: boolean;
  maxResults: number;
  latestRelease: { id: string; name: string; releaseDate: string; issueKeys: string[] } | null;
  syncedAt: string;
}

interface CachedPayload {
  signature: string;
  payload: JiraPayload;
  expiresAt: number;
  staleUntil: number;
}

export class JiraHttpError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number;

  constructor(message: string, status: number, retryAfterSeconds = 0) {
    super(message);
    this.name = "JiraHttpError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

let cachedPayload: CachedPayload | null = null;
let inFlight: { signature: string; promise: Promise<JiraPayload> } | null = null;
let blockedUntil = 0;

interface JiraApiIssue {
  key?: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
    priority?: { name?: string };
    assignee?: { displayName?: string };
    description?: unknown;
    created?: string;
    updated?: string;
    issuetype?: { name?: string };
    labels?: string[];
    components?: Array<{ name?: string }>;
  };
}

function adfToText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(adfToText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const node = value as { type?: string; text?: string; content?: unknown };
    if (node.type === "text" && typeof node.text === "string") return node.text;
    return adfToText(node.content);
  }
  return "";
}

function send(response: ApiResponse, status: number, body: Record<string, unknown>): void {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(body);
}

function issueToDto(issue: JiraApiIssue, baseUrl: string) {
  const fields = issue.fields ?? {};
  return {
    key: issue.key ?? "",
    summary: fields.summary ?? "",
    status: fields.status?.name ?? "",
    priority: fields.priority?.name ?? "",
    assignee: fields.assignee?.displayName ?? "",
    description: adfToText(fields.description),
    created: fields.created ?? "",
    updated: fields.updated ?? "",
    issueType: fields.issuetype?.name ?? "",
    labels: fields.labels ?? [],
    components: (fields.components ?? []).map((component) => component.name).filter(Boolean),
    url: issue.key ? `${baseUrl}/browse/${issue.key}` : "",
  };
}

export function retryAfterMilliseconds(value: string | null, attempt: number, now = Date.now()): number {
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1_000);
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(0, date - now);
  }
  return 500 * (2 ** attempt);
}

export async function jiraJson<T>(
  url: string,
  headers: Record<string, string>,
  options: { fetcher?: typeof fetch; sleep?: (milliseconds: number) => Promise<void>; maxRetries?: number } = {},
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const maxRetries = options.maxRetries ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const jiraResponse = await fetcher(url, { headers, signal: AbortSignal.timeout(20_000) });
    const data = await jiraResponse.json().catch(() => ({})) as T & { errorMessages?: string[]; message?: string };
    if (jiraResponse.ok) return data;

    const detail = data.errorMessages?.join(" ") || data.message || `HTTP ${jiraResponse.status}`;
    const retryMs = retryAfterMilliseconds(jiraResponse.headers.get("retry-after"), attempt);
    if (jiraResponse.status === 429 && attempt < maxRetries && retryMs <= 3_000) {
      await sleep(Math.max(250, retryMs));
      continue;
    }
    throw new JiraHttpError(
      `Jira recusou a consulta: ${detail}`,
      jiraResponse.status,
      jiraResponse.status === 429 ? Math.max(1, Math.ceil(retryMs / 1_000)) : 0,
    );
  }

  throw new JiraHttpError("Jira recusou a consulta após novas tentativas.", 429, 1);
}

async function searchIssues(
  baseUrl: string,
  headers: Record<string, string>,
  jql: string,
  resultLimit: number,
): Promise<{ issues: ReturnType<typeof issueToDto>[]; truncated: boolean }> {
  const fields = "summary,status,priority,assignee,description,created,updated,issuetype,labels,components";
  const issues: ReturnType<typeof issueToDto>[] = [];
  let nextPageToken = "";

  do {
    const params = new URLSearchParams({ jql, fields, maxResults: "100" });
    if (nextPageToken) params.set("nextPageToken", nextPageToken);
    const data = await jiraJson<{ issues?: JiraApiIssue[]; nextPageToken?: string }>(
      `${baseUrl}/rest/api/3/search/jql?${params}`,
      headers,
    );
    issues.push(...(data.issues ?? []).map((issue) => issueToDto(issue, baseUrl)));
    nextPageToken = data.nextPageToken ?? "";
  } while (nextPageToken && issues.length < resultLimit);

  return { issues: issues.slice(0, resultLimit), truncated: Boolean(nextPageToken) || issues.length > resultLimit };
}

async function latestClosedSprint(baseUrl: string, headers: Record<string, string>, boardId: string): Promise<JiraSprint | null> {
  const params = new URLSearchParams({ state: "closed", startAt: "0", maxResults: "100" });
  const data = await jiraJson<{ values?: JiraSprint[] }>(
    `${baseUrl}/rest/agile/1.0/board/${encodeURIComponent(boardId)}/sprint?${params}`,
    headers,
  );
  return [...(data.values ?? [])].sort((left, right) => {
    const leftDate = left.completeDate || left.endDate || "";
    const rightDate = right.completeDate || right.endDate || "";
    return rightDate.localeCompare(leftDate);
  })[0] ?? null;
}

async function buildJiraPayload(config: {
  baseUrl: string;
  headers: Record<string, string>;
  jql: string;
  boardId: string;
  resultLimit: number;
}): Promise<JiraPayload> {
  const { baseUrl, headers, jql, boardId, resultLimit } = config;
  const mainResult = await searchIssues(baseUrl, headers, jql, resultLimit);
  let latestRelease: JiraPayload["latestRelease"] = null;
  let releaseIssues: ReturnType<typeof issueToDto>[] = [];

  try {
    const sprint = await latestClosedSprint(baseUrl, headers, boardId);
    if (sprint?.id) {
      const releaseResult = await searchIssues(baseUrl, headers, `sprint = ${sprint.id} ORDER BY updated DESC`, resultLimit);
      releaseIssues = releaseResult.issues;
      latestRelease = {
        id: String(sprint.id),
        name: sprint.name || `Sprint ${sprint.id}`,
        releaseDate: sprint.completeDate || sprint.endDate || "",
        issueKeys: releaseIssues.map((issue) => issue.key),
      };
    }
  } catch (error) {
    if (error instanceof JiraHttpError && error.status === 429) throw error;
    // A consulta principal continua disponível quando o projeto não usa sprints ou o board não permite acesso.
  }

  const byKey = new Map(mainResult.issues.map((issue) => [issue.key, issue]));
  releaseIssues.forEach((issue) => byKey.set(issue.key, issue));
  const issues = [...byKey.values()];
  return {
    readOnly: true,
    jql,
    count: issues.length,
    issues,
    truncated: mainResult.truncated,
    maxResults: resultLimit,
    latestRelease,
    syncedAt: new Date().toISOString(),
  };
}

async function protectedJiraPayload(config: {
  signature: string;
  cacheTtlMs: number;
  staleTtlMs: number;
  baseUrl: string;
  headers: Record<string, string>;
  jql: string;
  boardId: string;
  resultLimit: number;
}): Promise<{ payload: JiraPayload; cacheStatus: "fresh" | "hit" | "shared" | "stale"; warning?: string }> {
  const now = Date.now();
  if (cachedPayload?.signature === config.signature && cachedPayload.expiresAt > now) {
    return { payload: cachedPayload.payload, cacheStatus: "hit" };
  }
  if (blockedUntil > now) {
    if (cachedPayload?.signature === config.signature && cachedPayload.staleUntil > now) {
      return { payload: cachedPayload.payload, cacheStatus: "stale", warning: "Jira temporariamente limitado; exibindo o último cache seguro." };
    }
    throw new JiraHttpError("Jira temporariamente limitado. Aguarde antes de sincronizar novamente.", 429, Math.ceil((blockedUntil - now) / 1_000));
  }
  if (inFlight?.signature === config.signature) {
    return { payload: await inFlight.promise, cacheStatus: "shared" };
  }

  const promise = buildJiraPayload(config);
  inFlight = { signature: config.signature, promise };
  try {
    const payload = await promise;
    const completedAt = Date.now();
    cachedPayload = {
      signature: config.signature,
      payload,
      expiresAt: completedAt + config.cacheTtlMs,
      staleUntil: completedAt + config.staleTtlMs,
    };
    return { payload, cacheStatus: "fresh" };
  } catch (error) {
    if (error instanceof JiraHttpError && error.status === 429) {
      blockedUntil = Date.now() + Math.max(1, error.retryAfterSeconds) * 1_000;
    }
    if (cachedPayload?.signature === config.signature && cachedPayload.staleUntil > Date.now()) {
      return { payload: cachedPayload.payload, cacheStatus: "stale", warning: "Falha temporária no Jira; exibindo o último cache seguro." };
    }
    throw error;
  } finally {
    if (inFlight?.promise === promise) inFlight = null;
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    send(response, 405, { error: "Método não permitido." });
    return;
  }

  const baseUrl = String(process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL ?? "";
  const token = process.env.JIRA_API_TOKEN ?? "";
  const jql = process.env.JIRA_JQL ?? "project = DM AND statusCategory != Done ORDER BY updated DESC";
  const boardId = String(process.env.JIRA_BOARD_ID ?? "3");
  const configuredLimit = Number(process.env.JIRA_MAX_RESULTS ?? 500);
  const resultLimit = Math.min(2_000, Math.max(100, Number.isFinite(configuredLimit) ? configuredLimit : 500));
  const configuredCacheSeconds = Number(process.env.JIRA_CACHE_TTL_SECONDS ?? 300);
  const cacheTtlMs = Math.min(1_800, Math.max(60, Number.isFinite(configuredCacheSeconds) ? configuredCacheSeconds : 300)) * 1_000;
  const staleTtlMs = Math.max(cacheTtlMs, 30 * 60 * 1_000);

  if (!baseUrl || !email || !token) {
    send(response, 503, {
      error: "Integração Jira não configurada no servidor.",
      missing: [!baseUrl && "JIRA_BASE_URL", !email && "JIRA_EMAIL", !token && "JIRA_API_TOKEN"].filter(Boolean),
    });
    return;
  }

  if (!/^https:\/\/[a-z0-9.-]+\.atlassian\.net$/i.test(baseUrl)) {
    send(response, 500, { error: "JIRA_BASE_URL deve apontar para um domínio Jira Cloud (*.atlassian.net)." });
    return;
  }

  const authorization = Buffer.from(`${email}:${token}`).toString("base64");
  const headers = { Authorization: `Basic ${authorization}`, Accept: "application/json" };
  try {
    const signature = `${baseUrl}|${jql}|${boardId}|${resultLimit}`;
    const result = await protectedJiraPayload({
      signature,
      cacheTtlMs,
      staleTtlMs,
      baseUrl,
      headers,
      jql,
      boardId,
      resultLimit,
    });
    response.setHeader("X-Jira-Cache", result.cacheStatus);
    send(response, 200, { ...result.payload, cacheStatus: result.cacheStatus, ...(result.warning ? { warning: result.warning } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar Jira.";
    if (error instanceof JiraHttpError && error.status === 429) {
      response.setHeader("Retry-After", String(Math.max(1, error.retryAfterSeconds)));
      send(response, 429, { error: message, retryAfterSeconds: Math.max(1, error.retryAfterSeconds) });
      return;
    }
    send(response, 502, { error: message });
  }
}
