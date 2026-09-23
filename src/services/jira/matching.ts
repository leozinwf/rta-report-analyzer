import { getSupplierForType } from "../../data/typeSupplierMap";
import type { ErrorAnalysis } from "../../types";
import type { JiraIssue } from "./storage";

export interface JiraMatch {
  issue: JiraIssue;
  confidence: "Alta" | "Média";
  score: number;
  reasons: string[];
  closed: boolean;
}

function normalize(value: string): string {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compact(value: string): string {
  return normalize(value).replace(/\s+/g, "");
}

function isClosed(status: string): boolean {
  return /concluid|done|closed|resolvid|finaliz/.test(normalize(status));
}

function robotAliases(robot: string): string[] {
  const aliases = new Set<string>();
  const add = (value: string) => {
    const alias = compact(value);
    if (alias.length >= 5) aliases.add(alias);
  };
  add(robot);
  add(robot.replace(/\s*\([A-Z]{2}\)\s*$/i, ""));
  add(robot.replace(/\s*[-–—]\s*[A-Z]{2}\s*$/i, ""));
  return [...aliases];
}

function robotSignal(robot: string, raw: string): { hit: boolean; reason: string } {
  const text = normalize(raw);
  if (robotAliases(robot).some((alias) => compact(raw).includes(alias))) {
    return { hit: true, reason: `robô/Type: ${robot}` };
  }

  const ignored = new Set(["certidao", "negativa", "debitos", "tributarios", "tributaria", "estado", "municipio", "municipal"]);
  const terms = [...new Set(normalize(robot).split(" ").filter((term) => term.length >= 3 && !ignored.has(term)))];
  const words = new Set(text.split(" "));
  const hits = terms.filter((term) => words.has(term));
  const uf = normalize(robot).match(/(?:^| )(sp|rj|mg|es|pr|sc|rs|ba|go|mt|ms|df|ce|rn|pb|pe|al|se|pi|ma|pa|am|rr|ro|ac|ap|to)(?: |$)/)?.[1];
  const structural = ["divida", "ativa"].filter((term) => normalize(robot).split(" ").includes(term) && words.has(term));
  const ufHit = Boolean(uf && words.has(uf));
  const hit = hits.length >= 2 || (structural.length === 2 && ufHit) || (hits.length >= 1 && ufHit);
  return { hit, reason: hit ? `mesma certidão/escopo${ufHit ? ` · UF ${uf?.toUpperCase()}` : ""}` : "" };
}

function messageSignal(message: string, raw: string): { strong: boolean; reason: string } {
  const ignored = new Set(["ocorreu", "executar", "execucao", "instrucao", "passo", "erro", "exception", "problema", "suporte"]);
  const terms = [...new Set(normalize(message).split(" ").filter((term) => term.length >= 5 && !ignored.has(term)))];
  const text = normalize(raw);
  const hits = terms.filter((term) => text.includes(term));
  const exact = compact(message).length >= 12 && compact(raw).includes(compact(message));
  const strong = exact || (hits.length >= 1 && hits.length / Math.max(terms.length, 1) >= 0.6);
  return { strong, reason: exact ? "mensagem exata" : `mensagem/etapa: ${hits.slice(0, 4).join(", ")}` };
}

export function findJiraMatchesForRobot(problem: ErrorAnalysis, robot: string, issues: JiraIssue[]): JiraMatch[] {
  const supplier = getSupplierForType(robot);
  return issues
    .map((issue) => {
      const raw = `${issue.summary} ${issue.description}`;
      const robotMatch = robotSignal(robot, raw);
      const supplierScoped = Boolean(supplier && normalize(raw).includes(normalize(supplier.supplier)) && /fornecedor|template|migra|todos|geral|base/.test(normalize(raw)));
      if (!robotMatch.hit && !supplierScoped) return null;

      const messageMatch = messageSignal(problem.message, raw);
      let score = robotMatch.hit ? 60 : 0;
      const reasons: string[] = robotMatch.hit ? [robotMatch.reason] : [];
      if (supplierScoped) {
        score += 55;
        reasons.push(`fornecedor/template: ${supplier?.supplier}`);
      }
      if (messageMatch.strong) {
        score += 35;
        reasons.push(messageMatch.reason);
      }

      return {
        issue,
        confidence: robotMatch.hit || supplierScoped ? "Alta" as const : "Média" as const,
        score,
        reasons,
        closed: isClosed(issue.status),
      };
    })
    .filter((match): match is JiraMatch => Boolean(match))
    .sort((a, b) => b.score - a.score || b.issue.updated.localeCompare(a.issue.updated))
    .slice(0, 5);
}
