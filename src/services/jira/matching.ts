import type { ErrorAnalysis } from "../../types";
import { getSupplierForType } from "../../data/typeSupplierMap";
import type { JiraIssue } from "./storage";

export type JiraMatch = { issue: JiraIssue; confidence: "Alta" | "Média"; score: number; reasons: string[]; closed: boolean };

function normalize(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function compact(value: string) { return normalize(value).replace(/\s+/g, ""); }
function terms(value: string) { return normalize(value).split(" ").filter((x) => x.length >= 5); }
function isClosed(status: string) { const s=normalize(status); return /concluid|done|closed|resolvid|finaliz/.test(s); }
function messageSignal(message: string, text: string) {
  const tokens = [...new Set(terms(message))].filter((x)=>!["ocorreu","executar","execucao","instrucao","passo","erro","exception"].includes(x));
  const hits = tokens.filter((token)=>text.includes(token));
  return { hits, ratio: tokens.length ? hits.length/tokens.length : 0 };
}

export function findJiraMatchesForRobot(problem: ErrorAnalysis, robot: string, issues: JiraIssue[]): JiraMatch[] {
  const supplier=getSupplierForType(robot);
  return issues.map((issue) => {
    const raw=`${issue.summary} ${issue.description}`, text=normalize(raw), compactText=compact(raw);
    let score=0; const reasons:string[]=[];
    const robotHit=compactText.includes(compact(robot));
    if(robotHit){score+=60;reasons.push(`robô/Type: ${robot}`);}
    const signal=messageSignal(problem.message,text);
    if(signal.ratio>=.6&&signal.hits.length){score+=30;reasons.push(`mensagem/etapa: ${signal.hits.slice(0,4).join(", ")}`);}
    else if(signal.hits.length){score+=15;reasons.push(`termo do erro: ${signal.hits.slice(0,3).join(", ")}`);}
    if(supplier&&text.includes(normalize(supplier.supplier))){score+=10;reasons.push(`fornecedor: ${supplier.supplier}`);}
    // Sem o mesmo robô/Type, termos genéricos ou fornecedor não são suficientes para cobrir este item.
    if(!robotHit)return null;
    const confidence:JiraMatch["confidence"]=score>=75?"Alta":"Média";
    return {issue,confidence,score,reasons,closed:isClosed(issue.status)};
  }).filter((x):x is JiraMatch=>Boolean(x)).sort((a,b)=>b.score-a.score||b.issue.updated.localeCompare(a.issue.updated)).slice(0,5);
}

export function findJiraMatches(problem: ErrorAnalysis, issues: JiraIssue[]): JiraMatch[] {
  const all=problem.robots.slice(0,20).flatMap(robot=>findJiraMatchesForRobot(problem,robot,issues));
  const unique=new Map<string,JiraMatch>();
  all.forEach(match=>{const current=unique.get(match.issue.key);if(!current||match.score>current.score)unique.set(match.issue.key,match);});
  return [...unique.values()].sort((a,b)=>b.score-a.score||b.issue.updated.localeCompare(a.issue.updated)).slice(0,5);
}
