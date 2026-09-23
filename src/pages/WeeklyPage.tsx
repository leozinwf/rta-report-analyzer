import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useReport } from "../context/ReportContext";
import { analyzeReport } from "../services/analysis";
import { addToOperationalWeek, clearWeek, listWeeks, type WeeklyHistory } from "../services/history/weekly";
import { formatNumber, formatPercent } from "../utils/format";

function fmtDay(v:string){return new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR");}
function fmtDateTime(v?:string){return v?new Date(v).toLocaleString("pt-BR"):"N/D";}

export function WeeklyPage(){
  const { parsed, loadedReports }=useReport();
  const [weeks,setWeeks]=useState<WeeklyHistory[]>([]);const [selected,setSelected]=useState<string>("");const [message,setMessage]=useState("");
  async function refresh(){const items=await listWeeks();setWeeks(items);setSelected(s=>s&&items.some(x=>x.id===s)?s:(items[0]?.id??""));}
  useEffect(()=>{void refresh();const fn=()=>void refresh();window.addEventListener("weekly-history-updated",fn);return()=>window.removeEventListener("weekly-history-updated",fn);},[]);
  const week=weeks.find(x=>x.id===selected);const analysis=useMemo(()=>week?analyzeReport(week.executions):null,[week]);
  async function add(){if(!parsed)return;const source=loadedReports.map(x=>x.fileName).join(" + ")||parsed.meta.fileName;const result=await addToOperationalWeek(parsed.executions,source);setMessage(`${formatNumber(result.added)} novas execuções adicionadas · ${formatNumber(result.duplicates)} duplicadas ignoradas.`);setSelected(result.history.id);await refresh();}
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-accent">Histórico incremental</p><h2 className="mt-1 text-2xl font-semibold">Semana operacional</h2><p className="mt-1 max-w-3xl text-sm text-muted">Acumule os relatórios recebidos durante a semana. Tokens repetidos por janelas sobrepostas são ignorados automaticamente.</p></div><button onClick={()=>void add()} disabled={!parsed} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Plus className="size-4"/>Adicionar análise atual à semana</button></div>
    {message?<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>:null}
    <div className="flex flex-wrap gap-2">{weeks.map(w=><button key={w.id} onClick={()=>setSelected(w.id)} className={`rounded-xl border px-4 py-2 text-sm ${selected===w.id?"border-accent bg-cyan-50 font-semibold text-cyan-900":"border-line bg-panel text-muted"}`}>{fmtDay(w.weekStart)} → {fmtDay(w.weekEnd)}</button>)}</div>
    {!week||!analysis?<div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-muted">Ainda não há semana acumulada. Analise os relatórios normalmente e clique em “Adicionar análise atual à semana”.</div>:<>
      <section className="rounded-2xl border border-line bg-panel p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-accent"/><div><h3 className="font-semibold">{fmtDay(week.weekStart)} → {fmtDay(week.weekEnd)}</h3><p className="text-xs text-muted">{week.imports.length} importações · atualizado {new Date(week.updatedAt).toLocaleString("pt-BR")}</p></div></div><button onClick={async()=>{if(confirm("Limpar esta semana acumulada?")){await clearWeek(week.id);setMessage("Semana removida.");}}} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600" title="Limpar semana"><Trash2 className="size-4"/></button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><K label="Execuções únicas" value={formatNumber(analysis.metrics.total)}/><K label="Sucessos" value={`${formatNumber(analysis.metrics.successCount)} · ${formatPercent(analysis.metrics.successRate)}`}/><K label="Erros" value={`${formatNumber(analysis.metrics.errorCount)} · ${formatPercent(analysis.metrics.errorRate)}`}/><K label="Site instável" value={`${formatNumber(analysis.metrics.instabilityCount)} · ${formatPercent(analysis.metrics.instabilityRate)}`}/><K label="Sem resultados" value={formatNumber(analysis.metrics.noResultCount)}/></div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-line bg-panel p-5"><h3 className="font-semibold">Importações da semana</h3><div className="mt-3 space-y-3">{[...week.imports].reverse().map((x,i)=><div key={`${x.importedAt}-${i}`} className="rounded-xl bg-panel-2 p-3 text-xs"><p className="font-semibold text-ink">{x.source}</p><p className="mt-1 text-muted">Janela: {fmtDateTime(x.minDate)} → {fmtDateTime(x.maxDate)}</p><p className="mt-1">Recebidas {formatNumber(x.received)} · <span className="text-emerald-700">novas {formatNumber(x.added)}</span> · <span className="text-amber-700">duplicadas {formatNumber(x.duplicates)}</span></p></div>)}</div></div>
        <div className="rounded-2xl border border-line bg-panel p-5"><h3 className="font-semibold">Robôs com mais erros na semana</h3><div className="mt-3 space-y-2">{analysis.robots.filter(r=>r.errorCount>0).slice(0,12).map(r=><div key={r.id} className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2 text-xs"><div className="min-w-0"><p className="truncate font-semibold text-ink">{r.robot}</p><p className="text-muted">{formatNumber(r.total)} execuções · sucesso {formatPercent(r.successRate)}</p></div><div className="text-right"><p className="font-semibold text-red-700">{formatNumber(r.errorCount)} erros</p><p className="text-muted">score {r.problemScore.toFixed(1)}</p></div></div>)}</div></div></section>
    </>}
  </div>;
}
function K({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-panel-2 p-3"><p className="text-[11px] text-muted">{label}</p><p className="mt-1 text-lg font-semibold text-ink">{value}</p></div>;}
