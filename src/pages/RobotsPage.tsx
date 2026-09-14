import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { HealthBadge, StatusBadge } from "../components/common/Badge";
import { DataTable, type Column } from "../components/common/DataTable";
import { EmptyState } from "../components/common/EmptyState";
import { Modal } from "../components/common/Modal";
import { RobotNameCell } from "../components/common/RobotNameCell";
import { SectionHeader } from "../components/common/SectionHeader";
import { TokenCell } from "../components/common/TokenCell";
import { useReport } from "../context/ReportContext";
import { getSupplierForType } from "../data/typeSupplierMap";
import type { RobotAnalysis } from "../types";
import { formatNumber, formatPercent } from "../utils/format";
import { CHART_COLORS, CHART_TOOLTIP } from "../utils/chartTheme";
import { Bot, Check, Copy } from "lucide-react";

const COLORS = [CHART_COLORS.success,CHART_COLORS.danger,CHART_COLORS.unstable,CHART_COLORS.muted,CHART_COLORS.warning,CHART_COLORS.accent,"#475569"];

export function RobotsPage() {
  const { filteredAnalysis } = useReport();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const navigate = useNavigate();
  const robots = filteredAnalysis?.robots ?? [];
  const suppliers = useMemo(() => [...new Set(robots.map(r => getSupplierForType(r.robot)?.supplier).filter(Boolean) as string[])].sort(), [robots]);
  const rows = useMemo(() => robots.filter((robot) => {
    if (status !== "all" && robot.status !== status) return false;
    const info = getSupplierForType(robot.robot);
    if (supplier !== "all" && info?.supplier !== supplier) return false;
    if (query && !`${robot.robot} ${info?.supplier || ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [robots, query, status, supplier]);

  const columns: Column<RobotAnalysis>[] = [
    { key:"robot", header:"Robô / Type", sortValue:r=>r.robot, render:r=><RobotNameCell name={r.robot}/> },
    { key:"supplier", header:"Fornecedor / Template", sortValue:r=>getSupplierForType(r.robot)?.supplier || "", render:r=>{const i=getSupplierForType(r.robot); return i ? <div><p className="font-medium">{i.supplier}</p><p className="text-xs text-muted">{i.template}</p></div> : <span className="text-muted">Individual</span>;} },
    { key:"total", header:"Execuções", align:"right", sortValue:r=>r.total, render:r=>formatNumber(r.total) },
    { key:"success", header:"Sucessos", align:"right", sortValue:r=>r.successCount, render:r=>formatNumber(r.successCount) },
    { key:"error", header:"Erros", align:"right", sortValue:r=>r.errorCount, render:r=>formatNumber(r.errorCount) },
    { key:"rate", header:"Taxa de sucesso", align:"right", sortValue:r=>r.successRate, render:r=>formatPercent(r.successRate) },
    { key:"score", header:"Score", align:"right", sortValue:r=>r.problemScore, render:r=>r.problemScore.toFixed(1) },
    { key:"status", header:"Status", sortValue:r=>r.status, render:r=><HealthBadge value={r.status}/> },
  ];

  return <div><SectionHeader title="Robôs" description="Types individuais e seus fornecedores/templates compartilhados." action={<div className="flex flex-wrap gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar robô ou fornecedor" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"/><select value={supplier} onChange={e=>setSupplier(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"><option value="all">Todos os fornecedores</option>{suppliers.map(s=><option key={s} value={s}>{s}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"><option value="all">Todos os status</option><option value="healthy">Saudável</option><option value="watch">Atenção</option><option value="critical">Crítico</option></select></div>}/><DataTable rows={rows} columns={columns} rowKey={r=>r.id} onRowClick={r=>navigate(`/robos/${encodeURIComponent(r.id)}`)}/></div>;
}

export function RobotDetailPage() {
  const { robotId } = useParams(); const { filteredAnalysis, parsed, setFilters, filters } = useReport(); const navigate=useNavigate();
  const [copied,setCopied]=useState<"title"|"description"|"all"|null>(null);
  const robot=filteredAnalysis?.robots.find(i=>i.id===decodeURIComponent(robotId??""));
  if(!robot) return <EmptyState icon={Bot} title="Robô não encontrado" description="Selecione um robô na lista."/>;
  const supplierInfo=getSupplierForType(robot.robot);
  const pieData=Object.entries(robot.statusDistribution).map(([name,value])=>({name,value}));
  const robotExecutions=parsed?.executions.filter(row=>(row.robotId||row.robot)===robot.id)??[]; const sampleStatuses=robotExecutions.slice(0,8);
  const jiraTitle=`[RTA] ${robot.robot} apresentando erros`; const jiraDescription=buildJiraDescription(robot,robotExecutions,supplierInfo);
  async function copyText(text:string,kind:"title"|"description"|"all"){await navigator.clipboard.writeText(text);setCopied(kind);window.setTimeout(()=>setCopied(null),1800);}
  return <Modal open title={robot.robot} onClose={()=>navigate("/robos")} wide><div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-4"><Info label="Execuções" value={formatNumber(robot.total)}/><Info label="Taxa de sucesso" value={formatPercent(robot.successRate)}/><Info label="Taxa de falha" value={formatPercent(robot.errorRate)}/><Info label="Problem score" value={robot.problemScore.toFixed(1)}/></div>
    <div className="flex flex-wrap items-center gap-3"><HealthBadge value={robot.status}/><RobotNameCell name={robot.robot}/>{supplierInfo?<span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">Fornecedor: {supplierInfo.supplier} · {supplierInfo.template}</span>:<span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Type individual</span>}</div>
    <div className="rounded-2xl border border-line bg-panel-2 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Preparar card do Jira</h3><p className="mt-1 text-xs text-muted">Inclui fornecedor/template quando o Type estiver mapeado.</p></div><div className="flex flex-wrap gap-2"><CopyButton copied={copied==="title"} label="Copiar título" onClick={()=>void copyText(jiraTitle,"title")}/><CopyButton copied={copied==="description"} label="Copiar descrição" onClick={()=>void copyText(jiraDescription,"description")}/><CopyButton copied={copied==="all"} label="Copiar tudo" onClick={()=>void copyText(`${jiraTitle}\n\n${jiraDescription}`,"all")} primary/></div></div></div>
    <div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>{pieData.map((e,i)=><Cell key={e.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={CHART_TOOLTIP}/></PieChart></ResponsiveContainer></div>
    <div><h3 className="mb-2 text-sm font-semibold">Principais problemas</h3><ol className="space-y-2 text-sm">{robot.topProblems.map((p,i)=><li key={p.message} className="flex justify-between gap-4"><span>{i+1}. {p.message||"N/D"}</span><span className="font-mono text-muted">{formatNumber(p.count)}</span></li>)}</ol></div>
    {sampleStatuses.length?<div><h3 className="mb-2 text-sm font-semibold">Amostra de execuções</h3><ul className="space-y-2">{sampleStatuses.map(row=><li key={row.id} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><TokenCell token={row.id}/><p className="mt-1 truncate text-muted">{row.message||"N/D"}</p></div><StatusBadge value={row.status}/></li>)}</ul></div>:null}
    <button type="button" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800" onClick={()=>{setFilters({...filters,robots:[robot.robot]});navigate("/execucoes");}}>Ver execuções deste robô</button>
  </div></Modal>;
}

function buildJiraDescription(robot:RobotAnalysis, executions:Array<{id:string;message:string}>, supplierInfo?:{template:string;supplier:string}){
 const sections=robot.topProblems.map((p,i)=>{const m=p.message||"N/D";const tokens=executions.filter(r=>(r.message||"N/D")===m).map(r=>r.id).filter(Boolean).slice(0,10);return `${i+1}. ${m} (${formatNumber(p.count)} ocorrências)\n\nTokens:\n${tokens.length?tokens.join("\n"):"Nenhum token de exemplo encontrado."}`;});
 return [`Robô/Type: ${robot.robot}`,supplierInfo?`Fornecedor: ${supplierInfo.supplier}`:undefined,supplierInfo?`Template: ${supplierInfo.template}`:undefined,`Execuções: ${formatNumber(robot.total)}`,`Sucessos: ${formatNumber(robot.successCount)}`,`Erros: ${formatNumber(robot.errorCount)}`,`Taxa de falha: ${formatPercent(robot.errorRate)}`,"","### Principais problemas",sections.length?sections.join("\n\n"):"Nenhum problema agrupado encontrado."].filter(v=>v!==undefined).join("\n");
}
function CopyButton({copied,label,onClick,primary=false}:{copied:boolean;label:string;onClick:()=>void;primary?:boolean}){return <button type="button" onClick={onClick} className={primary?"inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-800":"inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold hover:border-accent/40"}>{copied?<Check className="size-3.5"/>:<Copy className="size-3.5"/>}{copied?"Copiado":label}</button>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-panel-2 px-4 py-3"><p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p><p className="mt-1 text-lg font-medium">{value}</p></div>}
