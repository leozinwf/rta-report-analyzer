import type { ClassifiedExecution, DashboardAnalysis, ErrorAnalysis } from "../types";
import { findJiraMatchesForRobot, type JiraMatch } from "./jira/matching";
import type { JiraIssue } from "./jira/storage";

export type WorkDecision = "open" | "existing" | "regression" | "verify" | "monitor";
export type WorkItem = { id:string; problem:ErrorAnalysis; decision:WorkDecision; priority:"P0"|"P1"|"P2"; matches:JiraMatch[]; total:number; errors:number; robots:string[]; tokens:string[]; robotTotal:number; robotErrors:number; robotSuccesses:number };

function priority(problem:ErrorAnalysis,robotTotal:number,robotErrors:number,messageCount:number):WorkItem["priority"] {
  const rate=robotTotal?robotErrors/robotTotal:0, concentration=robotErrors?messageCount/robotErrors:0;
  // Volume protege o ranking contra amostras 1/1, 2/2 ou 3/3 artificialmente altas.
  if((robotErrors>=100&&rate>=.8)||(robotErrors>=50&&rate>=.9&&concentration>=.5))return "P0";
  if((robotErrors>=20&&rate>=.5)||(robotErrors>=10&&rate>=.8&&concentration>=.5))return "P1";
  return "P2";
}
function decision(problem:ErrorAnalysis,matches:JiraMatch[],robotTotal:number,robotErrors:number):WorkDecision {
  const high=matches.find(m=>m.confidence==="Alta");
  if(high)return high.closed?"regression":"existing";
  if(matches.some(m=>m.confidence==="Média"))return "verify";
  const rate=robotTotal?robotErrors/robotTotal:0;
  if(problem.eventType==="technical_error"&&robotErrors>=3&&(robotErrors>=10||rate>=.5))return "open";
  return "monitor";
}
export function buildWorkQueue(analysis:DashboardAnalysis,executions:ClassifiedExecution[],jira:JiraIssue[]):WorkItem[] {
  const items:WorkItem[]=[];
  analysis.problems.slice(0,50).forEach(problem=>problem.robots.forEach(robot=>{
    const robotRows=executions.filter(r=>r.robot===robot), rows=robotRows.filter(r=>r.message===problem.message);
    if(!rows.length)return;
    const robotErrors=robotRows.filter(r=>r.canonicalStatus==="error").length, robotSuccesses=robotRows.filter(r=>r.canonicalStatus==="success").length;
    const errors=rows.filter(r=>r.canonicalStatus==="error").length, matches=findJiraMatchesForRobot(problem,robot,jira);
    items.push({id:`${problem.id}::${robot}`,problem,decision:decision(problem,matches,robotRows.length,robotErrors),priority:priority(problem,robotRows.length,robotErrors,rows.length),matches,total:rows.length,errors,robots:[robot],tokens:rows.slice(0,5).map(r=>r.id),robotTotal:robotRows.length,robotErrors,robotSuccesses});
  }));
  return items.sort((a,b)=>{const d={open:0,regression:1,existing:2,verify:3,monitor:4},p={P0:0,P1:1,P2:2};return d[a.decision]-d[b.decision]||p[a.priority]-p[b.priority]||b.robotErrors-a.robotErrors||b.total-a.total;});
}
