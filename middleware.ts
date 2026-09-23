import { readCookie, SESSION_COOKIE_NAME, verifySessionToken } from "./server/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);
const VITE_DEV_PATHS = ["/@vite/", "/@fs/", "/@id/", "/src/", "/node_modules/"];

function isLocalViteRequest(url: URL): boolean {
  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (!localHost) return false;
  return url.pathname === "/@react-refresh" ||
    url.pathname === "/__vite_ping" ||
    VITE_DEV_PATHS.some((prefix) => url.pathname.startsWith(prefix));
}

function unauthorizedApiResponse(): Response {
  return Response.json(
    { error: "Sessão ausente ou expirada." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (PUBLIC_PATHS.has(url.pathname) || isLocalViteRequest(url)) return undefined;

  const sessionSecret = process.env.APP_SESSION_SECRET ?? "";
  if (sessionSecret.length < 32) {
    return new Response("Proteção de acesso não configurada no servidor.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (await verifySessionToken(token, sessionSecret)) return undefined;

  if (url.pathname.startsWith("/api/")) return unauthorizedApiResponse();

  const loginUrl = new URL("/login", request.url);
  const destination = `${url.pathname}${url.search}`;
  if (destination !== "/") loginUrl.searchParams.set("next", destination);
  return Response.redirect(loginUrl, 307);
}

export const config = {
  matcher: ["/((?!assets/|favicon.svg).*)"],
};
