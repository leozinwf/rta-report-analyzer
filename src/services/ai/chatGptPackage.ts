import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS } from "../../data/labels";
import { getSupplierForType } from "../../data/typeSupplierMap";
import type { ClassifiedExecution, DashboardAnalysis, ErrorAnalysis } from "../../types";

function pct(value: number) { return `${(value * 100).toFixed(1)}%`; }
function clean(value: string | null | undefined) { return (value ?? "N/D").replace(/\s+/g, " ").trim(); }
function isSuccess(row: ClassifiedExecution) { return row.canonicalStatus === "success"; }
function isFailure(row: ClassifiedExecution) { return row.canonicalStatus === "error"; }
function platformSummary(rows: ClassifiedExecution[]) { const counts = new Map<string, number>(); rows.forEach((row) => counts.set(row.platform, (counts.get(row.platform) ?? 0) + 1)); return [...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}: ${v}`).join(" | ") || "N/D"; }
function statusSummary(rows: ClassifiedExecution[]) { const counts = new Map<string, number>(); rows.forEach((row) => counts.set(row.canonicalStatus, (counts.get(row.canonicalStatus) ?? 0) + 1)); return [...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${STATUS_LABELS[k as keyof typeof STATUS_LABELS]}: ${v}`).join(" | ") || "N/D"; }

function robotBlock(robotName: string, problem: ErrorAnalysis, executions: ClassifiedExecution[]) {
  const robotRows = executions.filter((row) => row.robot === robotName);
  const problemRows = robotRows.filter((row) => row.message === problem.message);
  const success = robotRows.filter(isSuccess).length;
  const errors = robotRows.filter(isFailure).length;
  const retries = robotRows.filter((row) => (row.attempt ?? 1) > 1);
  const retrySuccess = retries.filter(isSuccess).length;
  const supplier = getSupplierForType(robotName);
  const statusCounts = new Map<string, number>(); problemRows.forEach((row) => statusCounts.set(row.canonicalStatus, (statusCounts.get(row.canonicalStatus) ?? 0) + 1));
  const predominant = [...statusCounts.entries()].sort((a,b)=>b[1]-a[1])[0];
  const sameStatusTotal = predominant ? robotRows.filter((row) => row.canonicalStatus === predominant[0]).length : 0;
  const tokens = problemRows.slice(0, 5).map((row) => row.id);
  const environments = [...new Set(problemRows.map((row) => row.environment).filter(Boolean))].slice(0, 5);
  return [
    `  ROBÔ/TYPE: ${robotName}`,
    `  Sistema: ${platformSummary(robotRows)}`,
    `  Total do robô: ${robotRows.length} | Sucessos: ${success} (${pct(robotRows.length ? success/robotRows.length : 0)}) | Erros: ${errors} (${pct(robotRows.length ? errors/robotRows.length : 0)})`,
    `  Ocorrências desta mensagem: ${problemRows.length} | ${pct(robotRows.length ? problemRows.length/robotRows.length : 0)} de TODAS as execuções do robô`,
    `  Status desta mensagem: ${statusSummary(problemRows)}`,
    predominant ? `  Status predominante: ${STATUS_LABELS[predominant[0] as keyof typeof STATUS_LABELS]} | ${predominant[1]}/${sameStatusTotal} (${pct(sameStatusTotal ? predominant[1]/sameStatusTotal : 0)}) das execuções do robô com esse mesmo status` : "",
    `  Retry do robô (tentativa > 1): ${retries.length} | Sucessos em retry: ${retrySuccess} | Não recuperados no recorte: ${retries.length-retrySuccess}`,
    `  Fornecedor/template: ${supplier ? `${supplier.supplier} / ${supplier.template}` : "N/D"}`,
    `  Ambientes: ${environments.join(", ") || "N/D"}`,
    `  Tokens: ${tokens.join(", ") || "N/D"}`,
  ].filter(Boolean).join("\n");
}

function problemBlock(problem: ErrorAnalysis, index: number, executions: ClassifiedExecution[]) {
  const rows = executions.filter((row) => row.message === problem.message);
  const attempts = Object.entries(problem.attemptDistribution).sort(([a],[b])=>Number(a)-Number(b)).map(([a,c])=>`tentativa ${a}: ${c}`).join(" | ");
  const robotNames = problem.robots.slice(0, 10);
  const hiddenRobots = Math.max(0, problem.robotCount-robotNames.length);
  return [`PROBLEMA #${index+1}`,`Mensagem: ${clean(problem.message)}`,`Ocorrências: ${problem.count} (${pct(problem.percent)} do recorte) | Robôs afetados: ${problem.robotCount}`,`Classificação: ${CATEGORY_LABELS[problem.category]} | ${SEVERITY_LABELS[problem.severity]} | ${EVENT_TYPE_LABELS[problem.eventType]}`,`Sistema(s): ${platformSummary(rows)}`,`Status reais das ocorrências: ${statusSummary(rows)}`,`Tentativas: ${attempts || "N/D"}`,`Tokens gerais: ${rows.slice(0,5).map((row)=>row.id).join(", ") || problem.sampleIds.slice(0,5).join(", ") || "N/D"}`,"DETALHE POR ROBÔ/TYPE:",...robotNames.map((robot)=>robotBlock(robot,problem,executions)),hiddenRobots ? `  + ${hiddenRobots} robô(s)/Type(s) adicionais não detalhados.` : "","---"].filter(Boolean).join("\n");
}

export function buildChatGptPackage(analysis: DashboardAnalysis, executions: ClassifiedExecution[]) {
  const retries = executions.filter((row)=>(row.attempt ?? 1)>1); const retrySuccess=retries.filter(isSuccess).length;
  const anomalies=analysis.anomalies.slice(0,15).map((item,index)=>`${index+1}. [${item.severity.toUpperCase()}] ${item.title}: ${item.description}`).join("\n");
  const supplierGroups=new Map<string,{supplier:string;template:string;robots:Set<string>;total:number;errors:number;messages:Map<string,number>}>();
  executions.forEach((row)=>{ const supplier=getSupplierForType(row.robot); if(!supplier)return; const key=`${supplier.supplier}|${supplier.template}`; const current=supplierGroups.get(key)??{...supplier,robots:new Set<string>(),total:0,errors:0,messages:new Map<string,number>()}; current.robots.add(row.robot); current.total++; if(isFailure(row)){current.errors++;current.messages.set(row.message,(current.messages.get(row.message)??0)+1);} supplierGroups.set(key,current); });
  const suppliers=[...supplierGroups.values()].filter((x)=>x.errors>0).sort((a,b)=>b.errors-a.errors).slice(0,15).map((x,i)=>`${i+1}. ${x.supplier} / ${x.template} | Types: ${x.robots.size} | Execuções: ${x.total} | Erros: ${x.errors} (${pct(x.errors/x.total)}) | Principais erros: ${[...x.messages.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([m,c])=>`${clean(m)} (${c})`).join("; ") || "N/D"}`).join("\n");
  const robotRanking=analysis.robots.slice(0,25).map((robot,index)=>{ const rows=executions.filter((row)=>row.robot===robot.robot); const supplier=getSupplierForType(robot.robot); const rr=rows.filter((row)=>(row.attempt??1)>1); return `${index+1}. ${robot.robot} | Sistema: ${platformSummary(rows)} | ${robot.total} execuções | sucesso ${robot.successCount} (${pct(robot.successRate)}) | erro ${robot.errorCount} (${pct(robot.errorRate)}) | instável ${robot.instabilityCount} | sem resultado ${robot.noResultCount} | avisos ${robot.warningCount} | retry ${rr.length}, sucesso em retry ${rr.filter(isSuccess).length} | score ${robot.problemScore.toFixed(1)}${supplier?` | ${supplier.supplier} / ${supplier.template}`:""}${robot.topProblems[0]?` | principal problema: ${clean(robot.topProblems[0].message)} (${robot.topProblems[0].count})`:""}`;}).join("\n");
  const problems=analysis.problems.slice(0,25).map((problem,index)=>problemBlock(problem,index,executions)).join("\n\n");
  return `PACOTE DE ANÁLISE — RTA REPORT ANALYZER\nVersão do formato: 3\n\nPAPEL\nAtue como analista técnico de automações RTA/Automation. Faça TRIAGEM com base exclusivamente nas evidências fornecidas. Não invente robôs, sistemas, causas, taxas, fornecedores ou relações.\n\nOBJETIVO\nPriorizar correções reais, reduzir falsos positivos causados por indisponibilidade/regra de negócio e consolidar problemas compartilhados de fornecedor/template. Jira ainda não está integrado: todo candidato deve ser marcado como "Verificar antes se já existe Jira".\n\nREGRAS OBRIGATÓRIAS\n- A = Automation e R = RTA, mas prefira sempre o campo Sistema explícito.\n- Nunca deduza sistema pelo nome do Type.\n- Diferencie automação, site/infra externa, fornecedor/template, instabilidade, regra de negócio, retry recuperado, dados/entrada e inconclusivo.\n- Alto volume sozinho não prova bug. Combine volume absoluto, taxa de falha, concentração, status real e retries.\n- IMPORTANTE: não compare ocorrências de Instabilidade/Aviso/Sem Resultado contra a quantidade de Erros. O pacote v3 informa a participação da mensagem em TODAS as execuções e dentro do MESMO STATUS.\n- Retry com sucesso posterior reduz prioridade.\n- Mesmo fornecedor/template só deve ser consolidado quando mensagens/etapas e comportamento sustentarem causa compartilhada.\n- "Erro ao executar instrução X" informa o ponto da falha, não prova que X está implementada incorretamente.\n- Site indisponível, bloqueio externo e regra de negócio não são defeito do robô sem evidência adicional.\n- Não torne volume baixo crítico apenas por 100% de falha.\n- Não invente Jira existente.\n\nFORMATO DA RESPOSTA\n1. RESUMO EXECUTIVO (máx. 8 linhas).\n2. FILA RECOMENDADA: Ordem | Prioridade | Robô/Type/Fornecedor | Sistema | Evidência | Classificação | Decisão.\n3. CANDIDATOS A CARD: título sugerido + 2-4 evidências + tokens úteis + "Verificar antes se já existe Jira".\n4. CONSOLIDAR POR FORNECEDOR/TEMPLATE: diga também o que NÃO consolidar.\n5. NÃO ABRIR / MONITORAR.\n6. INCONCLUSIVOS: diga qual dado/teste falta.\n7. CHECKLIST: no máximo 10 ações práticas.\n\nRESUMO GLOBAL\nTotal: ${analysis.metrics.total}\nSucessos: ${analysis.metrics.successCount} (${pct(analysis.metrics.successRate)})\nErros: ${analysis.metrics.errorCount} (${pct(analysis.metrics.errorRate)})\nSite instável: ${analysis.metrics.instabilityCount} (${pct(analysis.metrics.instabilityRate)})\nSem resultados: ${analysis.metrics.noResultCount} (${pct(analysis.metrics.noResultRate)})\nAvisos: ${analysis.metrics.warningCount} (${pct(analysis.metrics.warningRate)})\nSistemas: ${platformSummary(executions)}\nRetry > 1: ${retries.length} | sucesso em retry: ${retrySuccess} | não sucesso: ${retries.length-retrySuccess}\nRetry overview: precisaram retry ${analysis.retries.neededRetry} | recuperados ${analysis.retries.recovered} | ainda falhando ${analysis.retries.stillFailing}\n\nANOMALIAS\n${anomalies||"Nenhuma"}\n\nRANKING DE ROBÔS/TYPES\n${robotRanking||"Nenhum"}\n\nFORNECEDORES/TEMPLATES\n${suppliers||"Nenhum mapeado com erro."}\n\nPROBLEMAS COM CONTEXTO COMPLETO\n${problems||"Nenhum."}\n\nOBSERVAÇÃO FINAL\nRankings e scores são sinais auxiliares. A decisão deve usar os dados explícitos de sistema, status, volume, taxa, concentração, fornecedor/template e retry. Se uma inferência contradisser um dado explícito, prevalece o dado explícito.`;
}
