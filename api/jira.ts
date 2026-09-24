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

async function jiraJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const jiraResponse = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  const data = await jiraResponse.json().catch(() => ({})) as T & { errorMessages?: string[]; message?: string };
  if (!jiraResponse.ok) {
    const detail = data.errorMessages?.join(" ") || data.message || `HTTP ${jiraResponse.status}`;
    throw new Error(`Jira recusou a consulta: ${detail}`);
  }
  return data;
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
    const mainResult = await searchIssues(baseUrl, headers, jql, resultLimit);
    let latestRelease: { id: string; name: string; releaseDate: string; issueKeys: string[] } | null = null;
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
    } catch {
      // A consulta principal continua disponível quando o projeto não usa sprints ou o board não permite acesso.
    }

    const byKey = new Map(mainResult.issues.map((issue) => [issue.key, issue]));
    releaseIssues.forEach((issue) => byKey.set(issue.key, issue));
    const issues = [...byKey.values()];
    send(response, 200, {
      readOnly: true,
      jql,
      count: issues.length,
      issues,
      truncated: mainResult.truncated,
      maxResults: resultLimit,
      latestRelease,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar Jira.";
    send(response, 502, { error: message });
  }
}
