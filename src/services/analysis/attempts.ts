import type {
  AttemptAnalysis,
  ClassifiedExecution,
  PersistentFailurePattern,
  RetryOverview,
  RetryPattern,
} from "../../types";
import { rate } from "../../utils/format";

function isFailing(row: ClassifiedExecution): boolean {
  return row.canonicalStatus === "error" || row.canonicalStatus === "instability";
}

export function analyzeAttempts(executions: ClassifiedExecution[]): AttemptAnalysis[] {
  const groups = new Map<number, ClassifiedExecution[]>();
  for (const row of executions) {
    const attempt = row.attempt ?? 1;
    const list = groups.get(attempt);
    if (list) list.push(row);
    else groups.set(attempt, [row]);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([attempt, rows]) => {
      const messages = new Map<string, number>();
      let successCount = 0;
      let errorCount = 0;
      let instabilityCount = 0;
      let warningCount = 0;
      let noResultCount = 0;
      for (const row of rows) {
        messages.set(row.message || "N/D", (messages.get(row.message || "N/D") ?? 0) + 1);
        switch (row.canonicalStatus) {
          case "success":
            successCount += 1;
            break;
          case "error":
            errorCount += 1;
            break;
          case "instability":
            instabilityCount += 1;
            break;
          case "warning":
            warningCount += 1;
            break;
          case "no_result":
            noResultCount += 1;
            break;
          default:
            break;
        }
      }
      return {
        attempt,
        total: rows.length,
        successCount,
        errorCount,
        instabilityCount,
        warningCount,
        noResultCount,
        successRate: rate(successCount, rows.length),
        topMessages: [...messages.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([message, count]) => ({ message, count })),
      };
    });
}

export function analyzeRetries(executions: ClassifiedExecution[]): RetryOverview {
  const retries = executions.filter((row) => (row.attempt ?? 1) >= 2);
  const recovered = retries.filter((row) => row.canonicalStatus === "success").length;
  const stillFailing = retries.filter(isFailing).length;
  const attempt1 = executions.filter((row) => (row.attempt ?? 1) === 1).length;
  const attempt2 = executions.filter((row) => row.attempt === 2).length;
  const attempt3Plus = executions.filter((row) => (row.attempt ?? 1) >= 3).length;

  const byRobotMessage = new Map<string, ClassifiedExecution[]>();
  for (const row of retries) {
    const key = `${row.robot}||${row.message || "N/D"}`;
    const list = byRobotMessage.get(key);
    if (list) list.push(row);
    else byRobotMessage.set(key, [row]);
  }

  const persistentFailures: PersistentFailurePattern[] = [...byRobotMessage.entries()]
    .map(([, rows]) => {
      const sample = rows[0];
      const attempt2Count = rows.filter((row) => row.attempt === 2 && isFailing(row)).length;
      const attempt3Count = rows.filter((row) => (row.attempt ?? 0) >= 3 && isFailing(row)).length;
      return {
        robot: sample.robot,
        message: sample.message || "N/D",
        category: sample.category,
        severity: sample.severity,
        attempt2: attempt2Count,
        attempt3Plus: attempt3Count,
        totalRetries: rows.length,
      };
    })
    .filter((item) => item.attempt2 > 0 && (item.attempt3Plus > 0 || item.attempt2 >= 3))
    .sort((a, b) => b.attempt3Plus * 10 + b.attempt2 - (a.attempt3Plus * 10 + a.attempt2));

  const recoveryPatterns = buildPatterns(executions, "recovery");
  const persistentPatterns = buildPatterns(executions, "persistent");

  return {
    neededRetry: retries.length,
    recovered,
    stillFailing,
    recoveredRate: rate(recovered, retries.length),
    attempt1,
    attempt2,
    attempt3Plus,
    persistentFailures: persistentFailures.slice(0, 20),
    recoveryPatterns,
    persistentPatterns,
  };
}

function buildPatterns(executions: ClassifiedExecution[], kind: "recovery" | "persistent"): RetryPattern[] {
  const byRobot = new Map<string, ClassifiedExecution[]>();
  for (const row of executions) {
    const list = byRobot.get(row.robot);
    if (list) list.push(row);
    else byRobot.set(row.robot, [row]);
  }

  const patterns = new Map<string, RetryPattern>();
  for (const [robot, rows] of byRobot) {
    const messagesByAttempt = new Map<number, Map<string, number>>();
    for (const row of rows) {
      const attempt = row.attempt ?? 1;
      if (!messagesByAttempt.has(attempt)) messagesByAttempt.set(attempt, new Map());
      const bucket = messagesByAttempt.get(attempt)!;
      bucket.set(row.message || "N/D", (bucket.get(row.message || "N/D") ?? 0) + 1);
    }
    if (!messagesByAttempt.has(2) && !messagesByAttempt.has(3)) continue;

    const top = (attempt: number) => {
      const bucket = messagesByAttempt.get(attempt);
      if (!bucket) return undefined;
      return [...bucket.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    };

    const step1 = top(1);
    const step2 = top(2);
    const step3 = top(3);
    if (!step2) continue;

    const sameFailure = step2 && step1 && step1 === step2 && isLikelyFailureMessage(step2);
    const recovered = step2 && /sucesso/i.test(step2);

    if (kind === "persistent" && sameFailure) {
      const steps = step3 && step3 === step2 ? [step1!, step2, step3] : [step1!, step2];
      addPattern(patterns, steps, robot, "high");
    }
    if (kind === "recovery" && recovered && step1 && isLikelyFailureMessage(step1)) {
      addPattern(patterns, [step1, step2!], robot, "low");
    }
  }

  return [...patterns.values()].sort((a, b) => b.count - a.count).slice(0, 12);
}

function isLikelyFailureMessage(message: string): boolean {
  return !/sucesso/i.test(message);
}

function addPattern(
  patterns: Map<string, RetryPattern>,
  steps: string[],
  robot: string,
  priority: RetryPattern["priority"],
) {
  const key = steps.join(" → ");
  const current = patterns.get(key);
  if (current) {
    current.count += 1;
    if (!current.robots.includes(robot)) current.robots.push(robot);
  } else {
    patterns.set(key, { steps, count: 1, robots: [robot], priority });
  }
}
