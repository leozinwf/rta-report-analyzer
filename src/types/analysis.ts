import type {
  ClassifiedExecution,
  EventType,
  ProblemCategory,
  Severity,
} from "./execution";

export interface ErrorAnalysis {
  id: string;
  message: string;
  count: number;
  percent: number;
  category: ProblemCategory;
  severity: Severity;
  eventType: EventType;
  robotCount: number;
  robots: string[];
  tenantCount: number;
  tenants: string[];
  environmentCount: number;
  environments: Record<string, number>;
  attemptDistribution: Record<string, number>;
  relatedMessages: Array<{ message: string; count: number }>;
  sampleIds: string[];
}

export interface RobotAnalysis {
  id: string;
  robot: string;
  robotId?: string;
  total: number;
  successCount: number;
  errorCount: number;
  instabilityCount: number;
  warningCount: number;
  noResultCount: number;
  otherCount: number;
  successRate: number;
  errorRate: number;
  instabilityRate: number;
  warningRate: number;
  noResultRate: number;
  problemScore: number;
  status: RobotHealthStatus;
  topProblems: Array<{ message: string; count: number; severity: Severity; category: ProblemCategory }>;
  statusDistribution: Record<string, number>;
  environments: Record<string, number>;
}

export type RobotHealthStatus = "healthy" | "watch" | "critical" | "unknown";

export interface CategoryAnalysis {
  category: ProblemCategory;
  count: number;
  percent: number;
  robotCount: number;
  severityBreakdown: Record<Severity, number>;
}

export interface AttemptAnalysis {
  attempt: number;
  total: number;
  successCount: number;
  errorCount: number;
  instabilityCount: number;
  warningCount: number;
  noResultCount: number;
  successRate: number;
  topMessages: Array<{ message: string; count: number }>;
}

export interface RetryOverview {
  neededRetry: number;
  recovered: number;
  stillFailing: number;
  recoveredRate: number;
  attempt1: number;
  attempt2: number;
  attempt3Plus: number;
  persistentFailures: PersistentFailurePattern[];
  recoveryPatterns: RetryPattern[];
  persistentPatterns: RetryPattern[];
}

export interface PersistentFailurePattern {
  robot: string;
  message: string;
  category: ProblemCategory;
  severity: Severity;
  attempt2: number;
  attempt3Plus: number;
  totalRetries: number;
}

export interface RetryPattern {
  steps: string[];
  count: number;
  robots: string[];
  priority: "high" | "medium" | "low";
}

export interface EnvironmentAnalysis {
  environment: string;
  total: number;
  successCount: number;
  errorCount: number;
  instabilityCount: number;
  warningCount: number;
  noResultCount: number;
  successRate: number;
  errorRate: number;
  topProblems: Array<{ message: string; count: number }>;
  concentratedProblems: Array<{ message: string; share: number; count: number }>;
}

export interface TenantAnalysis {
  tenant: string;
  total: number;
  successCount: number;
  errorCount: number;
  instabilityCount: number;
  warningCount: number;
  noResultCount: number;
  successRate: number;
  errorRate: number;
  topProblems: Array<{ message: string; count: number; category: ProblemCategory; severity: Severity }>;
  topRobots: Array<{ robot: string; count: number }>;
}

export interface StageAnalysis {
  stage: string;
  count: number;
  robotCount: number;
  robots: string[];
  messages: Array<{ message: string; count: number }>;
  severity: Severity;
  category: ProblemCategory;
}

export interface DashboardMetrics {
  total: number;
  successCount: number;
  errorCount: number;
  instabilityCount: number;
  noResultCount: number;
  warningCount: number;
  pendingCount: number;
  processingCount: number;
  cancelledCount: number;
  otherCount: number;
  successRate: number;
  errorRate: number;
  instabilityRate: number;
  noResultRate: number;
  warningRate: number;
  technicalErrorCount: number;
  businessResultCount: number;
}

export interface Anomaly {
  id: string;
  type: "robot_failure_rate" | "error_concentration" | "environment_concentration" | "retry_persistence" | "volume_spike";
  severity: Severity;
  title: string;
  description: string;
  entity?: string;
}

export interface DashboardAnalysis {
  metrics: DashboardMetrics;
  robots: RobotAnalysis[];
  problems: ErrorAnalysis[];
  categories: CategoryAnalysis[];
  attempts: AttemptAnalysis[];
  retries: RetryOverview;
  environments: EnvironmentAnalysis[];
  tenants: TenantAnalysis[];
  stages: StageAnalysis[];
  anomalies: Anomaly[];
  summary: string[];
  eventTypeDistribution: Record<EventType, number>;
  severityDistribution: Record<Severity, number>;
}

export interface ReportMeta {
  fileName: string;
  sheetNames: string[];
  analyzedSheet: string;
  columns: string[];
  missingExpectedColumns: string[];
  warnings: string[];
  rowCount: number;
}

export interface ParsedReport {
  meta: ReportMeta;
  executions: ClassifiedExecution[];
}

export interface ReportContext {
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  instabilityCount: number;
  warningCount: number;
  businessResultCount: number;
  topErrors: ErrorAnalysis[];
  topRobots: RobotAnalysis[];
  topStages: StageAnalysis[];
  environments: EnvironmentAnalysis[];
  tenants: TenantAnalysis[];
  attempts: AttemptAnalysis[];
}
