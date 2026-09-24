import type { JiraIssue } from "./storage";

export interface JiraRecurrence {
  id: string;
  title: string;
  count: number;
  issues: JiraIssue[];
  statuses: string[];
  priorities: string[];
  latestUpdated: string;
}

const IGNORED_TERMS = new Set([
  "apresentando", "automation", "card", "com", "da", "das", "de", "do", "dos", "erro", "falha",
  "jira", "na", "nas", "no", "nos", "para", "problema", "robo", "rta", "sem", "the", "uma",
]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b[a-z]+-\d+\b/g, " ")
    .replace(/\b[0-9a-f]{8,}\b/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedSource(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b[a-z]+-\d+\b/g, " ")
    .replace(/\b[0-9a-f]{8,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTerms(summary: string): Set<string> {
  return new Set(
    normalize(summary)
      .split(/\s+/)
      .filter((term) => term.length >= 3 && !IGNORED_TERMS.has(term)),
  );
}

function supplierScope(summary: string): string {
  return normalize(summary).match(/fornecedor\s+([a-z0-9]+)/)?.[1] ?? "";
}

interface IssueScope {
  type: "robot" | "supplier" | "document" | "location" | "exact";
  value: string;
}

function cleanScope(value: string): string {
  return value
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function issueScope(summary: string): IssueScope {
  const source = normalizedSource(summary);
  const robot = source.match(/\bcrt[a-z0-9]{4,}\b/)?.[0];
  if (robot) return { type: "robot", value: robot };

  const supplier = supplierScope(summary);
  if (supplier) return { type: "supplier", value: supplier };

  const document = source.match(/\b(dare|darf|dae|dam)\s*[-/]?\s*(\d{2,})\b/);
  if (document) return { type: "document", value: `${document[1]}-${document[2]}` };

  const location = source.match(
    /\b(?:municipio(?:\s+de)?|estado\s+de)\s+(.+?)(?=\s+-\s+(?:[a-z]{2}\b|ocorreu\b|tempo\b|ha\b|nao\b)|\s+(?:ocorreu|tempo|ha cenarios|nao foi)\b|$)/,
  )?.[1];
  if (location) return { type: "location", value: cleanScope(location) };

  return { type: "exact", value: cleanScope(source) };
}

function similarity(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const term of left) if (right.has(term)) intersection += 1;
  return intersection / Math.min(left.size, right.size);
}

export function analyzeJiraRecurrences(issues: JiraIssue[]): JiraRecurrence[] {
  const groups: Array<{ terms: Set<string>; scope: IssueScope; issues: JiraIssue[] }> = [];

  for (const issue of issues) {
    const terms = meaningfulTerms(issue.summary);
    const scope = issueScope(issue.summary);
    if (!terms.size) continue;
    const group = groups.find((candidate) => {
      if (candidate.scope.type !== scope.type || candidate.scope.value !== scope.value) return false;
      if (scope.type === "exact") return true;
      return similarity(candidate.terms, terms) >= 0.7;
    });
    if (group) {
      group.issues.push(issue);
    } else {
      groups.push({ terms, scope, issues: [issue] });
    }
  }

  return groups
    .filter((group) => group.issues.length >= 2)
    .map((group) => {
      const sorted = [...group.issues].sort((a, b) => b.updated.localeCompare(a.updated));
      const title = [...group.issues].sort((a, b) => a.summary.length - b.summary.length)[0]?.summary ?? "Recorrência";
      return {
        id: [...group.terms].sort().join("-"),
        title,
        count: group.issues.length,
        issues: sorted,
        statuses: [...new Set(group.issues.map((issue) => issue.status || "N/D"))],
        priorities: [...new Set(group.issues.map((issue) => issue.priority || "N/D"))],
        latestUpdated: sorted[0]?.updated ?? "",
      };
    })
    .sort((a, b) => b.count - a.count || b.latestUpdated.localeCompare(a.latestUpdated));
}
