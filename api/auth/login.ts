import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  verifyAccessPassword,
} from "../../server/auth";

const MAX_PASSWORD_LENGTH = 512;

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: Record<string, unknown>): void;
}

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function send(response: ApiResponse, status: number, body: Record<string, unknown>): void {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(body);
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    send(response, 405, { error: "Método não permitido." });
    return;
  }

  const origin = header(request, "origin");
  const host = header(request, "x-forwarded-host") || header(request, "host");
  if (origin && host && new URL(origin).host !== host) {
    send(response, 403, { error: "Origem da requisição não permitida." });
    return;
  }

  const configuredPassword = process.env.APP_ACCESS_PASSWORD ?? "";
  const sessionSecret = process.env.APP_SESSION_SECRET ?? "";
  if (!configuredPassword || sessionSecret.length < 32) {
    send(response, 503, { error: "Proteção de acesso não configurada no servidor." });
    return;
  }

  const rawBody = typeof request.body === "string"
    ? (() => { try { return JSON.parse(request.body) as unknown; } catch { return null; } })()
    : request.body;
  const body = rawBody && typeof rawBody === "object" ? rawBody as { password?: unknown } : null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    send(response, 401, { error: "Credenciais inválidas." });
    return;
  }

  const valid = await verifyAccessPassword(password, configuredPassword);
  if (!valid) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    send(response, 401, { error: "Credenciais inválidas." });
    return;
  }

  const configuredHours = Number(process.env.APP_SESSION_TTL_HOURS ?? 8);
  const ttlHours = Math.min(24, Math.max(1, Number.isFinite(configuredHours) ? configuredHours : 8));
  const maxAge = Math.round(ttlHours * 60 * 60);
  const token = await createSessionToken(sessionSecret, Date.now() + maxAge * 1000);
  const secure = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview" ? "; Secure" : "";

  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${maxAge}`,
  );
  send(response, 200, { authenticated: true });
}
