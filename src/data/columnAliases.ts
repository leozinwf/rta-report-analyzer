export type CanonicalField =
  | "id"
  | "robot"
  | "robotId"
  | "status"
  | "message"
  | "tenant"
  | "environment"
  | "attempt"
  | "date"
  | "startedAt"
  | "finishedAt"
  | "published"
  | "origin"
  | "responseQueue";

export const COLUMN_ALIASES: Record<CanonicalField, string[]> = {
  id: ["token", "id", "identificador", "execution id", "id da execucao", "id da execução"],
  robot: ["nome do robo", "nome do robô", "robo", "robô", "robot", "nome"],
  robotId: ["id do robo", "id do robô", "robot id", "id robo", "id robô"],
  status: ["status", "situacao", "situação", "resultado"],
  message: ["mensagem", "message", "erro", "error", "descricao", "descrição"],
  tenant: ["tenant alias", "tenant", "cliente", "alias"],
  environment: ["ambiente", "environment", "env"],
  attempt: ["tentativa", "attempt", "retry", "retries"],
  date: ["criacao", "criação", "data/hora", "data", "datetime", "created", "created at"],
  startedAt: ["inicio de processamento", "início de processamento", "inicio", "início", "start", "started at"],
  finishedAt: ["fim de processamento", "fim", "end", "finished at", "conclusao", "conclusão"],
  published: ["publicado", "published"],
  origin: ["origem", "origin", "source"],
  responseQueue: ["destino de resposta", "destino", "queue", "fila"],
};

export const EXPECTED_FIELDS: CanonicalField[] = [
  "id",
  "robot",
  "status",
  "message",
  "tenant",
  "environment",
  "attempt",
  "date",
];

export const EXECUTION_SHEET_ALIASES = [
  "execuções",
  "execucoes",
  "executions",
  "execução",
  "execucao",
];
