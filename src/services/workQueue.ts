import type { ClassifiedExecution, DashboardAnalysis, ErrorAnalysis } from "../types";
import { findJiraMatches, type JiraMatch } from "./jira/matching";
import type { JiraIssue } from "./jira/storage";

export type WorkDecision = "open" | "existing" | "regression" | "verify" | "monitor";
export type WorkItem = { id:string; problem:ErrorAnalysis; decision:WorkDecision; priority:"P0"|"P1"|"P2"; matches:JiraMatch[]; total:number; errors:number; robots:string[]; tokens:string[] };

function priority(problem:ErrorAnalysis,total:number,errors:number):WorkItem["priority"] {
  const rate=total?errors/total:0;
  if(problem.severity==="critical" || (errors>=100 && rate>=.8)) return "P0";
  if(problem.severity==="high" || errors>=20 || rate>=.5) return "P1";
  return "P2";
}
function decision(problem:ErrorAnalysis,matches:JiraMatch[]):WorkDecision {
  const high=matches.find(m=>m.confidence==="Alta");
  if(high) return high.closed?"regression":"existing";
  if(matches.some(m=>m.confidence==="Média")) return "verify";
  if(problem.eventType==="technical_error" || problem.severity==="critical" || problem.severity==="high") return "open";
  return "monitor";
}
export function buildWorkQueue(analysis:DashboardAnalysis,executions:ClassifiedExecution[],jira:JiraIssue[]):WorkItem[] {
  return analysis.problems.slice(0,50).map(problem=>{
    const rows=executions.filter(r=>r.message===problem.message), errors=rows.filter(r=>r.canonicalStatus==="error").length;
    const matches=findJiraMatches(problem,jira);
    return {id:problem.id,problem,decision:decision(problem,matches),priority:priority(problem,rows.length,errors),matches,total:rows.length,errors,robots:problem.robots,tokens:rows.slice(0,5).map(r=>r.id)};
  }).sort((a,b)=>{
    const d={open:0,regression:1,existing:2,verify:3,monitor:4},p={P0:0,P1:1,P2:2};
    return d[a.decision]-d[b.decision] || p[a.priority]-p[b.priority] || b.errors-a.errors;
  });
}
