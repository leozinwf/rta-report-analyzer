import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SEVERITY_LABELS } from "../../data/labels";
import { getSupplierForType } from "../../data/typeSupplierMap";
import type { ClassifiedExecution, DashboardAnalysis, ErrorAnalysis } from "../../types";

function pct(value: number) { return `${(value * 100).toFixed(1)}%`; }
function clean(value: string | null | undefined) { return (value ?? "N/D").replace(/\s+/g, " ").trim(); }
function isSuccess(row: ClassifiedExecution) { return row.canonicalStatus === "success"; }
function isFailure(row: ClassifiedExecution) { return row.canonicalStatus === "error"; }

function platformSummary(rows: ClassifiedExecution[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.platform, (counts.get(row.platform) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([platform, count]) => `${platform}: ${count}`).join(" | ") || "N/D";
}

function robotBlock(robotName: string, problem: ErrorAnalysis, executions: ClassifiedExecution[]) {
  const robotRows = executions.filter((row) => row.robot === robotName);
  const problemRows = robotRows.filter((row) => row.message === problem.message);
  const success = robotRows.filter(isSuccess).length;
  const errors = robotRows.filter(isFailure).length;
  const retries = robotRows.filter((row) => (row.attempt ?? 1) > 1);
  const retrySuccess = retries.filter(isSuccess).length;
  const supplier = getSupplierForType(robotName);
  const problemShareOfErrors = errors ? problemRows.length / errors : 0;
  const tokens = problemRows.slice(0, 5).map((row) => row.id);
  const environments = [...new Set(problemRows.map((row) => row.environment).filter(Boolean))].slice(0, 5);

  return [
    `  ROBÔ/TYPE: ${robotName}`,
    `  Sistema: ${platformSummary(robotRows)}`,
    `  Total do robô no recorte: ${robotRows.length} | Sucessos: ${success} (${pct(robotRows.length ? success / robotRows.length : 0)}) | Erros: ${errors} (${pct(robotRows.length ? errors / robotRows.length : 0)})`,
    `  Ocorrências desta mensagem neste robô: ${problemRows.length}${errors ? ` | ${pct(problemShareOfErrors)} dos erros do robô` : ""}`,
    `  Retry (tentativa > 1): ${retries.length} execuções | Sucessos em retry: ${retrySuccess}`,
    `  Fornecedor/template: ${supplier ? `${supplier.supplier} / ${supplier.template}` : "N/D"}`,
    `  Ambientes desta mensagem: ${environments.join(", ") || "N/D"}`,
    `  Tokens desta mensagem: ${tokens.join(", ") || "N/D"}`,
  ].join("\n");
}

function problemBlock(problem: ErrorAnalysis, index: number, executions: ClassifiedExecution[]) {
  const rows = executions.filter((row) => row.message === problem.message);
  const attempts = Object.entries(problem.attemptDistribution).sort(([a], [b]) => Number(a) - Number(b)).map(([attempt, count]) => `tentativa ${attempt}: ${count}`).join(" | ");
  const robotNames = problem.robots.slice(0, 10);
  const hiddenRobots = Math.max(0, problem.robotCount - robotNames.length);

  return [
    `PROBLEMA #${index + 1}`,
    `Mensagem: ${clean(problem.message)}`,
    `Ocorrências no recorte: ${problem.count} (${pct(problem.percent)}) | Robôs afetados: ${problem.robotCount}`,
    `Classificação atual: ${CATEGORY_LABELS[problem.category]} | ${SEVERITY_LABELS[problem.severity]} | ${EVENT_TYPE_LABELS[problem.eventType]}`,
    `Sistema(s) das ocorrências: ${platformSummary(rows)}`,
    `Tentativas das ocorrências: ${attempts || "N/D"}`,
    `Tokens gerais: ${rows.slice(0, 5).map((row) => row.id).join(", ") || problem.sampleIds.slice(0, 5).join(", ") || "N/D"}`,
    "DETALHE POR ROBÔ/TYPE:",
    ...robotNames.map((robot) => robotBlock(robot, problem, executions)),
    hiddenRobots ? `  + ${hiddenRobots} robô(s)/Type(s) adicionais não detalhados para limitar o tamanho do pacote.` : "",
    "---",
  ].filter(Boolean).join("\n");
}

export function buildChatGptPackage(analysis: DashboardAnalysis, executions: ClassifiedExecution[]) {
  const retries = executions.filter((row) => (row.attempt ?? 1) > 1);
  const retrySuccess = retries.filter(isSuccess).length;
  const retryFailure = retries.filter((row) => !isSuccess(row)).length;

  const anomalies = analysis.anomalies.slice(0, 15).map((item, index) => `${index + 1}. [${item.severity.toUpperCase()}] ${item.title}: ${item.description}`).join("\n");

  const supplierGroups = new Map<string, { supplier: string; template: string; robots: Set<string>; total: number; errors: number; messages: Map<string, number> }>();
  executions.forEach((row) => {
    const supplier = getSupplierForType(row.robot);
    if (!supplier) return;
    const key = `${supplier.supplier}|${supplier.template}`;
    const current = supplierGroups.get(key) ?? { ...supplier, robots: new Set<string>(), total: 0, errors: 0, messages: new Map<string, number>() };
    current.robots.add(row.robot);
    current.total += 1;
    if (isFailure(row)) {
      current.errors += 1;
      current.messages.set(row.message, (current.messages.get(row.message) ?? 0) + 1);
    }
    supplierGroups.set(key, current);
  });

  const suppliers = [...supplierGroups.values()]
    .filter((item) => item.errors > 0)
    .sort((a, b) => b.errors - a.errors)
    .slice(0, 15)
    .map((item, index) => {
      const topMessages = [...item.messages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([message, count]) => `${clean(message)} (${count})`).join("; ");
      return `${index + 1}. ${item.supplier} / ${item.template} | Types: ${item.robots.size} | Execuções: ${item.total} | Erros: ${item.errors} (${pct(item.total ? item.errors / item.total : 0)}) | Principais erros: ${topMessages || "N/D"}`;
    }).join("\n");

  const robotRanking = analysis.robots.slice(0, 25).map((robot, index) => {
    const rows = executions.filter((row) => row.robot === robot.robot);
    const supplier = getSupplierForType(robot.robot);
    const retriesForRobot = rows.filter((row) => (row.attempt ?? 1) > 1);
    const recovered = retriesForRobot.filter(isSuccess).length;
    return `${index + 1}. ${robot.robot} | Sistema: ${platformSummary(rows)} | ${robot.total} execuções | sucesso ${robot.successCount} (${pct(robot.successRate)}) | erro ${robot.errorCount} (${pct(robot.errorRate)}) | instável ${robot.instabilityCount} | sem resultado ${robot.noResultCount} | retry ${retriesForRobot.length}, sucesso em retry ${recovered} | score ${robot.problemScore.toFixed(1)}${supplier ? ` | ${supplier.supplier} / ${supplier.template}` : ""}${robot.topProblems[0] ? ` | principal problema: ${clean(robot.topProblems[0].message)} (${robot.topProblems[0].count})` : ""}`;
  }).join("\n");

  const problems = analysis.problems.slice(0, 25).map((problem, index) => problemBlock(problem, index, executions)).join("\n\n");

  return `PACOTE DE ANÁLISE — RTA REPORT ANALYZER\nVersão do formato: 2\n\nPAPEL\nAtue como analista técnico de automações RTA/Automation. Sua função é TRIAR o relatório e recomendar investigação/correção com base exclusivamente nas evidências fornecidas. Não invente nomes de robôs, sistemas, causas, taxas, fornecedores ou relações que não estejam no pacote.\n\nOBJETIVO\nIdentificar o que realmente merece ação técnica, evitar transformar indisponibilidade externa/regra de negócio/reprocessamento recuperado em bug e consolidar problemas compartilhados de fornecedor/template. A futura integração com Jira ainda NÃO está presente: portanto, nesta versão você pode sugerir candidatos a card, mas deve dizer que não sabe se já existe um Jira para eles.\n\nREGRAS OBRIGATÓRIAS\n- A sigla do token indica a origem: A = Automation e R = RTA. Prefira, porém, o campo Sistema fornecido no pacote.\n- Nunca deduza o sistema apenas pelo nome CRT/Type quando o campo Sistema estiver disponível.\n- Nunca diga "robô não identificado" se o DETALHE POR ROBÔ/TYPE informar o robô afetado.\n- Diferencie: provável problema de automação; provável problema externo/site; problema compartilhado de fornecedor/template; instabilidade; regra/resultado de negócio; reprocessamento recuperado; dados/entrada; inconclusivo.\n- Alto volume sozinho não prova bug. Combine volume, taxa de falha do robô, concentração da mesma mensagem, recorrência e retries.\n- Erros com posterior sucesso em retry devem perder prioridade, salvo se a recorrência/impacto justificar investigação.\n- Se vários Types do mesmo fornecedor/template falham de forma semelhante, prefira sugerir investigação consolidada no template antes de recomendar vários cards municipais.\n- Se os Types compartilham fornecedor mas as mensagens/etapas são diferentes, não assuma automaticamente causa única.\n- Mensagens explicitamente relacionadas a site indisponível, bloqueio externo ou regra de negócio não devem ser chamadas de defeito do robô sem outra evidência.\n- Uma mensagem como "Ocorreu um erro ao executar a instrução X" indica o ponto onde falhou, não prova por si só que a instrução X está implementada incorretamente.\n- Use "provável", "indício", "precisa validar" e "não é possível concluir" quando a evidência não provar a causa.\n- Não recomende prioridade crítica para robôs de volume muito baixo apenas por terem 100% de falha; compare impacto absoluto e relativo.\n- Não invente Jira existente. A seção de Jira será adicionada em uma fase futura.\n\nFORMATO DA RESPOSTA\n1. RESUMO EXECUTIVO: no máximo 8 linhas, destacando concentração real dos problemas.\n2. FILA RECOMENDADA: tabela com Ordem | Prioridade | Robô/Type ou fornecedor | Sistema | Evidência | Classificação | Decisão.\n3. CANDIDATOS A CARD: somente casos com evidência suficiente. Para cada um, dê um título sugerido e 2-4 evidências objetivas. Acrescente "Verificar antes se já existe Jira".\n4. CONSOLIDAR POR FORNECEDOR/TEMPLATE: informe quais casos parecem compartilhados e quais NÃO deveriam ser consolidados.\n5. NÃO ABRIR / MONITORAR: instabilidades, regra de negócio e retries recuperados que não justificam correção imediata.\n6. INCONCLUSIVOS: diga exatamente qual informação faltaria para decidir.\n7. CHECKLIST FINAL: liste, em ordem, no máximo 10 ações práticas para o analista executar hoje.\n\nRESUMO GLOBAL\nTotal: ${analysis.metrics.total}\nSucessos: ${analysis.metrics.successCount} (${pct(analysis.metrics.successRate)})\nErros: ${analysis.metrics.errorCount} (${pct(analysis.metrics.errorRate)})\nSite instável: ${analysis.metrics.instabilityCount} (${pct(analysis.metrics.instabilityRate)})\nSem resultados: ${analysis.metrics.noResultCount} (${pct(analysis.metrics.noResultRate)})\nAvisos: ${analysis.metrics.warningCount} (${pct(analysis.metrics.warningRate)})\nSistemas no recorte: ${platformSummary(executions)}\nExecuções em tentativa > 1: ${retries.length} | sucesso nessas tentativas: ${retrySuccess} | não sucesso: ${retryFailure}\nRetry overview calculado pelo Analyzer: precisaram retry ${analysis.retries.neededRetry} | recuperados ${analysis.retries.recovered} | ainda falhando ${analysis.retries.stillFailing}\n\nANOMALIAS DETECTADAS PELO ANALYZER\n${anomalies || "Nenhuma"}\n\nRANKING DE ROBÔS/TYPES\n${robotRanking || "Nenhum"}\n\nVISÃO POR FORNECEDOR/TEMPLATE\n${suppliers || "Nenhum fornecedor/template mapeado com erro neste recorte."}\n\nPROBLEMAS COM CONTEXTO COMPLETO\n${problems || "Nenhum problema encontrado."}\n\nOBSERVAÇÃO FINAL PARA A ANÁLISE\nOs rankings e classificações acima são sinais auxiliares. Reavalie a prioridade usando os detalhes por robô, sistema, taxa de falha, concentração da mensagem, fornecedor/template e retries. Se houver contradição entre uma inferência e um dado explícito do pacote, prevalece o dado explícito.`;
}
