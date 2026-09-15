import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SEVERITY_LABELS } from "../../data/labels";
import { getSupplierForType } from "../../data/typeSupplierMap";
import type { ClassifiedExecution, DashboardAnalysis } from "../../types";

function pct(value: number) { return `${(value * 100).toFixed(1)}%`; }
function clean(value: string | null | undefined) { return (value ?? "N/D").replace(/\s+/g, " ").trim(); }

export function buildChatGptPackage(analysis: DashboardAnalysis, executions: ClassifiedExecution[]) {
  const platforms = new Map<string, number>();
  executions.forEach((row) => platforms.set(row.platform, (platforms.get(row.platform) ?? 0) + 1));

  const problems = analysis.problems.slice(0, 20).map((problem, index) => {
    const samples = executions.filter((row) => row.message === problem.message).slice(0, 5);
    return [
      `${index + 1}. ${clean(problem.message)}`,
      `   Ocorrências: ${problem.count} (${pct(problem.percent)}) | Robôs: ${problem.robotCount} | Categoria: ${CATEGORY_LABELS[problem.category]} | Severidade: ${SEVERITY_LABELS[problem.severity]} | Tipo: ${EVENT_TYPE_LABELS[problem.eventType]}`,
      `   Tokens exemplo: ${samples.map((row) => row.id).join(", ") || "N/D"}`,
    ].join("\n");
  }).join("\n");

  const robots = analysis.robots.slice(0, 20).map((robot, index) => {
    const supplier = getSupplierForType(robot.robot);
    return `${index + 1}. ${robot.robot} | ${robot.total} execuções | sucesso ${pct(robot.successRate)} | erro ${pct(robot.errorRate)} | score ${robot.problemScore.toFixed(1)}${supplier ? ` | fornecedor ${supplier.supplier} | template ${supplier.template}` : ""}${robot.topProblems[0] ? ` | principal problema: ${clean(robot.topProblems[0].message)} (${robot.topProblems[0].count})` : ""}`;
  }).join("\n");

  const anomalies = analysis.anomalies.slice(0, 12).map((item, index) => `${index + 1}. [${item.severity.toUpperCase()}] ${item.title}: ${item.description}`).join("\n");

  const retries = executions.filter((row) => (row.attempt ?? 1) > 1);
  const retrySuccess = retries.filter((row) => /sucesso/i.test(row.status)).length;

  return `Quero que você atue como analista técnico de automações RTA/Automation. Analise SOMENTE os dados abaixo e não invente causas que não possam ser sustentadas pelas evidências.

OBJETIVO
Priorizar o que realmente precisa de investigação/correção e ajudar a decidir quais casos justificam abertura de card no Jira.

REGRAS DA ANÁLISE
- Diferencie problema provável do robô, problema do site/portal, problema compartilhado de fornecedor/template, instabilidade/reprocessamento, erro de entrada/regra de negócio e caso inconclusivo.
- Erro único ou que teve sucesso em nova tentativa deve ter prioridade menor, salvo evidência contrária.
- Dê prioridade a alto volume, alta taxa de falha, recorrência e mesma mensagem concentrada.
- Quando vários Types usam o mesmo fornecedor/template e apresentam comportamento semelhante, destaque a possível causa compartilhada.
- A sigla do token indica o sistema: A = Automation e R = RTA.
- Não trate correlação como causa comprovada. Use termos como "provável", "indício" e "não é possível concluir" quando necessário.
- Para cada prioridade importante, explique quais números/evidências sustentam a conclusão.

FORMATO DA RESPOSTA
1. Resumo executivo curto.
2. Prioridade crítica: casos que deveriam virar Jira primeiro.
3. Prioridade alta/média.
4. Possíveis problemas de fornecedor/template.
5. Instabilidades/reprocessamentos que provavelmente não exigem correção imediata.
6. Casos inconclusivos que precisam de investigação manual.
7. No final, uma tabela "Cards Jira sugeridos" com Prioridade | Robô/Type | Sistema | Problema | Evidência | Ação sugerida.

DADOS DO RELATÓRIO
Total: ${analysis.metrics.total}
Sucessos: ${analysis.metrics.successCount} (${pct(analysis.metrics.successRate)})
Erros: ${analysis.metrics.errorCount} (${pct(analysis.metrics.errorRate)})
Site instável: ${analysis.metrics.instabilityCount} (${pct(analysis.metrics.instabilityRate)})
Sem resultados: ${analysis.metrics.noResultCount} (${pct(analysis.metrics.noResultRate)})
Avisos: ${analysis.metrics.warningCount} (${pct(analysis.metrics.warningRate)})
Sistemas: ${[...platforms.entries()].map(([key, value]) => `${key}: ${value}`).join(" | ")}
Execuções em tentativa > 1: ${retries.length}; sucessos nessas tentativas: ${retrySuccess}

ANOMALIAS DETECTADAS PELO SISTEMA
${anomalies || "Nenhuma"}

ROBÔS/TYPES COM MAIOR SCORE DE PROBLEMA
${robots || "Nenhum"}

PRINCIPAIS MENSAGENS/PROBLEMAS
${problems || "Nenhum"}
`;
}
