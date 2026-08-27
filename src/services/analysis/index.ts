import type {
  ClassifiedExecution,
  DashboardAnalysis,
  ReportContext,
} from "../../types";
import { detectAnomalies } from "./anomalies";
import { analyzeAttempts, analyzeRetries } from "./attempts";
import { analyzeEnvironments } from "./environments";
import { computeMetrics, countByEventType, countBySeverity } from "./metrics";
import { analyzeCategories, analyzeProblems } from "./problems";
import { analyzeRobots } from "./robots";
import { analyzeStages } from "./stageAnalysis";
import { generateSummary } from "./summary";
import { analyzeTenants } from "./tenants";

export function analyzeReport(executions: ClassifiedExecution[]): DashboardAnalysis {
  const metrics = computeMetrics(executions);
  const robots = analyzeRobots(executions);
  const problems = analyzeProblems(executions);
  const categories = analyzeCategories(executions);
  const attempts = analyzeAttempts(executions);
  const retries = analyzeRetries(executions);
  const environments = analyzeEnvironments(executions);
  const tenants = analyzeTenants(executions);
  const stages = analyzeStages(executions);
  const anomalies = detectAnomalies(executions, robots, environments);
  const eventTypeDistribution = countByEventType(executions);
  const severityDistribution = countBySeverity(executions);

  const partial: Omit<DashboardAnalysis, "summary"> = {
    metrics,
    robots,
    problems,
    categories,
    attempts,
    retries,
    environments,
    tenants,
    stages,
    anomalies,
    eventTypeDistribution,
    severityDistribution,
  };

  return {
    ...partial,
    summary: generateSummary(partial),
  };
}

export function buildReportContext(analysis: DashboardAnalysis): ReportContext {
  return {
    totalExecutions: analysis.metrics.total,
    successCount: analysis.metrics.successCount,
    errorCount: analysis.metrics.errorCount,
    instabilityCount: analysis.metrics.instabilityCount,
    warningCount: analysis.metrics.warningCount,
    businessResultCount: analysis.metrics.businessResultCount,
    topErrors: analysis.problems.slice(0, 15),
    topRobots: analysis.robots.slice(0, 15),
    topStages: analysis.stages.slice(0, 15),
    environments: analysis.environments,
    tenants: analysis.tenants.slice(0, 20),
    attempts: analysis.attempts,
  };
}
