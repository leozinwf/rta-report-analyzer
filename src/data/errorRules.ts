import type { EventType, ProblemCategory, Severity } from "../types";

export interface ErrorRule {
  id: string;
  keywords: string[];
  category: ProblemCategory;
  severity: Severity;
  eventType: EventType;
}

/**
 * Deterministic classification rules.
 * First match wins — keep more specific rules above generic ones.
 */
export const errorRules: ErrorRule[] = [
  {
    id: "download-file-not-found",
    keywords: ["downloaded file not found"],
    category: "download",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "download-pdf",
    keywords: ["download do pdf", "download do arquivo", "aguardar o download"],
    category: "download",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "extract-pdf",
    keywords: ["extrair conteúdo do pdf"],
    category: "download",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "ip-blocked",
    keywords: ["ip foi temporariamente bloqueado", "acesso bloqueado", "ip bloqueado"],
    category: "infrastructure",
    severity: "critical",
    eventType: "technical_error",
  },
  {
    id: "rate-limit",
    keywords: ["limite de requisições", "tentativas excessivas"],
    category: "infrastructure",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "timeout",
    keywords: ["tempo de execução excedido", "timeout", "intervalo de 120 segundos"],
    category: "infrastructure",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "site-unavailable",
    keywords: [
      "site não está disponivel",
      "site não está disponível",
      "site indisponível",
      "site instável",
    ],
    category: "infrastructure",
    severity: "high",
    eventType: "instability",
  },
  {
    id: "unexpected-error",
    keywords: ["erro inesperado"],
    category: "infrastructure",
    severity: "critical",
    eventType: "technical_error",
  },
  {
    id: "display-failure",
    keywords: ["iniciar corretamente o display"],
    category: "infrastructure",
    severity: "critical",
    eventType: "technical_error",
  },
  {
    id: "server-unavailable",
    keywords: ["servidor indisponível", "conexão recusada", "connection"],
    category: "infrastructure",
    severity: "critical",
    eventType: "technical_error",
  },
  {
    id: "wait-conditions",
    keywords: ["condições de espera não foram atendidas"],
    category: "automation",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "instruction-error",
    keywords: ["ocorreu um erro ao executar a instrução"],
    category: "automation",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "element-not-found",
    keywords: ["elemento não encontrado", "selector", "seletor", "unable to locate"],
    category: "automation",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "mainframe-failure",
    keywords: ["mainframe - falha"],
    category: "automation",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "emit-failure",
    keywords: ["não foi possível emitir a certidão"],
    category: "automation",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "captcha",
    keywords: ["caracteres da imagem", "captcha"],
    category: "authentication",
    severity: "medium",
    eventType: "warning",
  },
  {
    id: "invalid-login",
    keywords: ["login ou senha", "senha inválid"],
    category: "authentication",
    severity: "critical",
    eventType: "warning",
  },
  {
    id: "govbr-mfa",
    keywords: ["gov.br", "govbr", "autenticação de duplo fator"],
    category: "authentication",
    severity: "critical",
    eventType: "warning",
  },
  {
    id: "login-required",
    keywords: ["faça login", "clicarlogin", "autenticação"],
    category: "authentication",
    severity: "high",
    eventType: "technical_error",
  },
  {
    id: "invalid-cnpj",
    keywords: ["cnpj inválido"],
    category: "data",
    severity: "medium",
    eventType: "warning",
  },
  {
    id: "taxpayer-not-found",
    keywords: ["contribuinte não localizado"],
    category: "data",
    severity: "medium",
    eventType: "warning",
  },
  {
    id: "ie-not-found",
    keywords: [
      "inscrição estadual não encontrada",
      "atributos ie são obrigatórios",
      "não foi encontrado registro com vinculo",
    ],
    category: "data",
    severity: "medium",
    eventType: "warning",
  },
  {
    id: "missing-cpf",
    keywords: ["preencha o cpf"],
    category: "data",
    severity: "low",
    eventType: "warning",
  },
  {
    id: "cadastral-pending",
    keywords: ["pendência cadastral", "faça o cadastro solicitado"],
    category: "data",
    severity: "medium",
    eventType: "warning",
  },
  {
    id: "icms-not-released",
    keywords: ["icms ainda não foi liberado", "débito é inexistente", "debito inexistente"],
    category: "business_rule",
    severity: "info",
    eventType: "business_result",
  },
  {
    id: "no-items",
    keywords: ["nenhum item encontrado", "nenhum resultado", "não foram encontrado resultados"],
    category: "business_rule",
    severity: "info",
    eventType: "business_result",
  },
  {
    id: "no-guides",
    keywords: ["não há guias disponíveis"],
    category: "business_rule",
    severity: "info",
    eventType: "business_result",
  },
  {
    id: "duplicate-cancel",
    keywords: ["cancelamento automático por duplicidade"],
    category: "business_rule",
    severity: "low",
    eventType: "unknown",
  },
  {
    id: "ora-error",
    keywords: ["ora-"],
    category: "infrastructure",
    severity: "high",
    eventType: "instability",
  },
  {
    id: "validation-error",
    keywords: ["erro ao processar validação"],
    category: "infrastructure",
    severity: "medium",
    eventType: "instability",
  },
];
