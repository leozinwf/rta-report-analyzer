import type { Anomaly, ClassifiedExecution, EnvironmentAnalysis, RobotAnalysis } from "../../types";
import { mean, stddev } from "../../utils/stats";

export function detectAnomalies(
  executions: ClassifiedExecution[],
  robots: RobotAnalysis[],
  environments: EnvironmentAnalysis[],
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const comparable = robots.filter((robot) => robot.total >= 20);
  const errorRates = comparable.map((robot) => robot.errorRate);
  const avgError = mean(errorRates);
  const deviation = stddev(errorRates);
  const threshold = deviation > 0 ? avgError + 1.5 * deviation : avgError * 2;

  for (const robot of comparable) {
    if (threshold > 0 && robot.errorRate >= threshold && robot.errorRate >= 0.25) {
      anomalies.push({
        id: `robot-fail-${robot.id}`,
        type: "robot_failure_rate",
        severity: robot.errorRate >= 0.5 ? "critical" : "high",
        title: "Anomalia detectada",
        description: `A taxa de falha de ${robot.robot} (${pct(robot.errorRate)}) está significativamente acima da média observada neste relatório (${pct(avgError)}).`,
        entity: robot.robot,
      });
    }
    if (robot.successRate <= Math.max(0.15, avgSuccess(comparable) - 0.35) && robot.total >= 30) {
      anomalies.push({
        id: `robot-success-${robot.id}`,
        type: "robot_failure_rate",
        severity: "high",
        title: "Anomalia detectada",
        description: `A taxa de sucesso deste robô (${robot.robot}) está significativamente abaixo do padrão observado neste relatório.`,
        entity: robot.robot,
      });
    }
  }

  const problemCounts = new Map<string, number>();
  for (const row of executions) {
    if (row.canonicalStatus === "success") continue;
    problemCounts.set(row.message || "N/D", (problemCounts.get(row.message || "N/D") ?? 0) + 1);
  }
  const totalProblems = [...problemCounts.values()].reduce((sum, value) => sum + value, 0);
  for (const [message, count] of problemCounts) {
    if (totalProblems >= 50 && count / totalProblems >= 0.18 && count >= 40) {
      anomalies.push({
        id: `conc-${message.slice(0, 24)}`,
        type: "error_concentration",
        severity: "medium",
        title: "Concentração anormal de erros",
        description: `"${truncate(message)}" representa ${pct(count / totalProblems)} dos problemas deste relatório (${count} ocorrências).`,
      });
    }
  }

  for (const env of environments) {
    for (const problem of env.concentratedProblems) {
      anomalies.push({
        id: `env-${env.environment}-${problem.message.slice(0, 16)}`,
        type: "environment_concentration",
        severity: "medium",
        title: `Problema concentrado em ${env.environment.toUpperCase()}`,
        description: `"${truncate(problem.message)}" está concentrado em ${env.environment.toUpperCase()} (${pct(problem.share)} das ocorrências).`,
        entity: env.environment,
      });
    }
  }

  const retryFail = executions.filter(
    (row) => (row.attempt ?? 1) >= 2 && (row.canonicalStatus === "error" || row.canonicalStatus === "instability"),
  ).length;
  const retries = executions.filter((row) => (row.attempt ?? 1) >= 2).length;
  if (retries >= 10 && retryFail / retries >= 0.7) {
    anomalies.push({
      id: "retry-persist",
      type: "retry_persistence",
      severity: "high",
      title: "Falhas persistem após retry",
      description: `${retryFail} de ${retries} execuções em tentativa 2+ continuaram apresentando erro ou instabilidade.`,
    });
  }

  const hourly = new Map<string, number>();
  for (const row of executions) {
    if (!row.date) continue;
    const key = `${row.date.getFullYear()}-${row.date.getMonth()}-${row.date.getDate()}-${row.date.getHours()}`;
    hourly.set(key, (hourly.get(key) ?? 0) + 1);
  }
  const hourValues = [...hourly.values()];
  if (hourValues.length >= 4) {
    const avg = mean(hourValues);
    const sd = stddev(hourValues);
    for (const [key, count] of hourly) {
      if (sd > 0 && count > avg + 2.5 * sd && count >= 80) {
        anomalies.push({
          id: `spike-${key}`,
          type: "volume_spike",
          severity: "low",
          title: "Pico de volume",
          description: `Um horário concentrou ${count} execuções, bem acima da média horária deste relatório (${Math.round(avg)}).`,
        });
      }
    }
  }

  return uniqueById(anomalies).slice(0, 12);
}

function avgSuccess(robots: RobotAnalysis[]): number {
  return mean(robots.map((robot) => robot.successRate));
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function truncate(value: string, max = 90): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function uniqueById(items: Anomaly[]): Anomaly[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
