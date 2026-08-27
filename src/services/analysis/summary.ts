import { CATEGORY_LABELS } from "../../data/labels";
import type { DashboardAnalysis } from "../../types";
import { formatNumber, formatPercent } from "../../utils/format";

export function generateSummary(analysis: Omit<DashboardAnalysis, "summary">): string[] {
  const { metrics, problems, robots, stages, environments, retries } = analysis;
  const lines: string[] = [];

  lines.push(`Foram analisadas ${formatNumber(metrics.total)} execuções.`);
  lines.push(`A taxa de sucesso foi de ${formatPercent(metrics.successRate)}.`);

  const top = problems.slice(0, 3);
  if (top.length) {
    lines.push("Os principais problemas encontrados foram:");
    top.forEach((problem, index) => {
      lines.push(
        `${index + 1}. ${problem.message || "N/D"} (${formatNumber(problem.count)} ocorrências, ${CATEGORY_LABELS[problem.category]}).`,
      );
    });
  }

  const worst = robots[0];
  if (worst) {
    lines.push(
      `O robô com maior índice de problemas foi ${worst.robot} (score ${worst.problemScore.toFixed(1)}, ${formatPercent(worst.errorRate)} de erros em ${formatNumber(worst.total)} execuções).`,
    );
  }

  const topStage = stages[0];
  lines.push(
    topStage
      ? `A etapa que apresentou mais falhas foi ${topStage.stage} (${formatNumber(topStage.count)} ocorrências, ${formatNumber(topStage.robotCount)} robôs afetados).`
      : "Não foi identificada uma etapa de automação predominante nas falhas.",
  );

  const worstEnv = [...environments].sort((a, b) => b.errorRate - a.errorRate || b.errorCount - a.errorCount)[0];
  lines.push(
    worstEnv
      ? `O ambiente com maior concentração de erros foi ${worstEnv.environment.toUpperCase()} (${formatNumber(worstEnv.errorCount)} erros, taxa de sucesso de ${formatPercent(worstEnv.successRate)}).`
      : "Não há informação de ambiente disponível neste relatório.",
  );

  if (retries.neededRetry) {
    lines.push(
      `${formatNumber(retries.neededRetry)} execuções precisaram de retry: ${formatNumber(retries.recovered)} foram recuperadas e ${formatNumber(retries.stillFailing)} continuaram apresentando problema.`,
    );
  }

  return lines;
}
