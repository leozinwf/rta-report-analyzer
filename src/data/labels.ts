import type {
  CanonicalStatus,
  EventType,
  ProblemCategory,
  RobotHealthStatus,
  Severity,
} from "../types";

export const CATEGORY_LABELS: Record<ProblemCategory, string> = {
  infrastructure: "Infraestrutura",
  automation: "Automação",
  download: "Download",
  data: "Dados",
  business_rule: "Regra de negócio",
  authentication: "Autenticação",
  unknown: "Desconhecido",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Crítico",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  info: "Informativo",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  technical_error: "Erro técnico",
  business_result: "Resultado de negócio",
  instability: "Instabilidade",
  warning: "Aviso",
  success: "Sucesso",
  unknown: "Desconhecido",
};

export const STATUS_LABELS: Record<CanonicalStatus, string> = {
  success: "Sucesso",
  error: "Erro",
  instability: "Site Instável",
  no_result: "Sem Resultados",
  warning: "Aviso",
  pending: "Pendente",
  processing: "Processando",
  cancelled: "Cancelado",
  unknown: "N/D",
};

export const HEALTH_LABELS: Record<RobotHealthStatus, string> = {
  healthy: "Saudável",
  watch: "Atenção",
  critical: "Crítico",
  unknown: "N/D",
};

export const NA = "N/D";
