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

function robotAliases(robot: string) {
  const aliases = new Set<string>();
  const add = (value: string) => { const c=compact(value); if(c.length>=5) aliases.add(c); };
  add(robot);
  add(robot.replace(/\s*\([A-Z]{2}\)\s*$/i, ""));
  add(robot.replace(/\s*[-–—]\s*[A-Z]{2}\s*$/i, ""));
  return [...aliases];
}

function robotIdentitySignal(robot:string, raw:string) {
  const text=normalize(raw), compactText=compact(raw);
  if(robotAliases(robot).some(alias=>compactText.includes(alias))) return {hit:true,strong:true,reason:`robô/Type: ${robot}`};
  const ignored=new Set(["certidao","negativa","debitos","tributarios","tributaria","estado","municipio","municipal","estadual","divida","ativa","automation","rta","aut"]);
  const robotTokens=[...new Set(normalize(robot).split(" ").filter(x=>x.length>=3&&!ignored.has(x)))];
  const hits=robotTokens.filter(token=>text.split(" ").includes(token));
  // Nomes de cards costumam ser abreviados. Ex.: "Certidão Negativa de Débitos Tributários da Dívida Ativa do estado de SP"
  // pode aparecer no Jira como "Certidão Dívida Ativa SP". Para esse caso preservamos termos estruturais e UF.
  const structural=["divida","ativa"].filter(token=>normalize(robot).split(" ").includes(token)&&text.split(" ").includes(token));
  const uf=(normalize(robot).match(/(?:^| )(sp|rj|mg|es|pr|sc|rs|ba|go|mt|ms|df|ce|rn|pb|pe|al|se|pi|ma|pa|am|rr|ro|ac|ap|to)(?: |$)/)?.[1]);
  const ufHit=Boolean(uf&&text.split(" ").includes(uf));
  const strong=(hits.length>=2)||(structural.length>=2&&ufHit);
  return {hit:strong,strong,reason:strong?`mesmo robô/escopo por nome abreviado${ufHit?` + UF ${uf!.toUpperCase()}`:""}`:""};
}

function messageSignal(message: string, text: string, compactText: string) {
  const ignored=new Set(["ocorreu","executar","execucao","instrucao","passo","erro","exception","problema","suporte","certidao","emissao","tente","novamente"]);
  const tokens = [...new Set(terms(message))].filter((x)=>!ignored.has(x));
  const hits = tokens.filter((token)=>text.includes(token));
  const normalizedMessage=compact(message);
  const exactPhrase=normalizedMessage.length>=12 && compactText.includes(normalizedMessage);
  return { hits, ratio: tokens.length ? hits.length/tokens.length : 0, exactPhrase };
}

function supplierScopeSignal(raw: string, supplierName: string) {
  const text=normalize(raw), supplier=normalize(supplierName);
  if(!supplier || !text.includes(supplier)) return false;
  return /fornecedor|template|migracao|migra|todos|geral|base/.test(text);
}

export function findJiraMatchesForRobot(problem: ErrorAnalysis, robot: string, issues: JiraIssue[]): JiraMatch[] {
  const supplier=getSupplierForType(robot);
  return issues.map((issue) => {
    const raw=`${issue.summary} ${issue.description}`, text=normalize(raw), compactText=compact(raw);
    let score=0; const reasons:string[]=[];
    const robotSignal=robotIdentitySignal(robot,raw),robotHit=robotSignal.hit;
    if(robotHit){score+=60;reasons.push(robotSignal.reason);}

    const supplierScoped=Boolean(supplier && supplierScopeSignal(raw,supplier.supplier));
    if(supplierScoped){score+=55;reasons.push(`card do fornecedor/template: ${supplier!.supplier}`);}

    const signal=messageSignal(problem.message,text,compactText);
    const strongMessage=signal.exactPhrase || (signal.ratio>=.6 && signal.hits.length>=1);
    if(signal.exactPhrase){score+=35;reasons.push("mensagem exata");}
    else if(strongMessage){score+=30;reasons.push(`mensagem/etapa: ${signal.hits.slice(0,4).join(", ")}`);}
    else if(signal.hits.length){score+=10;reasons.push(`termo relacionado: ${signal.hits.slice(0,3).join(", ")}`);}

    if(supplier&&text.includes(normalize(supplier.supplier))&&!supplierScoped){score+=5;reasons.push(`fornecedor: ${supplier.supplier}`);}
    if(!robotHit&&!supplierScoped)return null;

    // Um Jira aberto do mesmo robô/Type também evita card duplicado quando a mensagem atual é outra etapa do mesmo fluxo.
    // O nome pode estar abreviado no Jira, então a identidade considera termos distintivos/UF além do nome literal.
    const confidence:JiraMatch["confidence"]=(robotSignal.strong || strongMessage || supplierScoped)?"Alta":"Média";
    return {issue,confidence,score,reasons,closed:isClosed(issue.status)};
  }).filter((x):x is JiraMatch=>Boolean(x)).sort((a,b)=>b.score-a.score||b.issue.updated.localeCompare(a.issue.updated)).slice(0,5);
}

export function findJiraMatches(problem: ErrorAnalysis, issues: JiraIssue[]): JiraMatch[] {
  const all=problem.robots.slice(0,20).flatMap(robot=>findJiraMatchesForRobot(problem,robot,issues));
  const unique=new Map<string,JiraMatch>();
  all.forEach(match=>{const current=unique.get(match.issue.key);if(!current||match.score>current.score)unique.set(match.issue.key,match);});
  return [...unique.values()].sort((a,b)=>b.score-a.score||b.issue.updated.localeCompare(a.issue.updated)).slice(0,5);
}
