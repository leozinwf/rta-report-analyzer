import { SESSION_COOKIE_NAME } from "../../server/auth";

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
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

export default function handler(request: ApiRequest, response: ApiResponse): void {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Método não permitido." });
    return;
  }

  const origin = header(request, "origin");
  const host = header(request, "x-forwarded-host") || header(request, "host");
  if (origin && host && new URL(origin).host !== host) {
    response.status(403).json({ error: "Origem da requisição não permitida." });
    return;
  }

  const secure = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`,
  );
  response.status(200).json({ authenticated: false });
}
