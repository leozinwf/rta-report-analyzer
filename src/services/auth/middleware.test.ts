import { afterEach, describe, expect, it } from "vitest";
import loginHandler from "../../../api/auth/login";
import middleware from "../../../middleware";
import { createSessionToken, SESSION_COOKIE_NAME } from "../../../server/auth";

const secret = "segredo-de-teste-com-pelo-menos-trinta-e-dois-caracteres";

afterEach(() => {
  delete process.env.APP_ACCESS_PASSWORD;
  delete process.env.APP_SESSION_SECRET;
  delete process.env.APP_SESSION_TTL_HOURS;
});

describe("access middleware", () => {
  it("redirects anonymous page requests to login", async () => {
    process.env.APP_SESSION_SECRET = secret;
    const response = await middleware(new Request("https://example.com/dashboard?filtro=1"));

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://example.com/login?next=%2Fdashboard%3Ffiltro%3D1");
  });

  it("returns 401 for anonymous API requests", async () => {
    process.env.APP_SESSION_SECRET = secret;
    const response = await middleware(new Request("https://example.com/api/jira"));
    expect(response?.status).toBe(401);
  });

  it("allows a request with a valid signed session", async () => {
    process.env.APP_SESSION_SECRET = secret;
    const token = await createSessionToken(secret, Date.now() + 60_000);
    const response = await middleware(new Request("https://example.com/dashboard", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` },
    }));

    expect(response).toBeUndefined();
  });

  it("allows Vite modules only on the local development host", async () => {
    process.env.APP_SESSION_SECRET = secret;

    expect(await middleware(new Request("http://localhost:3000/@vite/client"))).toBeUndefined();
    expect((await middleware(new Request("https://example.com/src/main.tsx")))?.status).toBe(307);
  });
});

describe("login endpoint", () => {
  it("sets an HttpOnly session cookie only for the correct password", async () => {
    process.env.APP_ACCESS_PASSWORD = "senha interna";
    process.env.APP_SESSION_SECRET = secret;

    const denied = mockResponse();
    await loginHandler({ method: "POST", headers: {}, body: { password: "incorreta" } }, denied.response);
    expect(denied.status()).toBe(401);

    const accepted = mockResponse();
    await loginHandler({ method: "POST", headers: {}, body: { password: "senha interna" } }, accepted.response);
    expect(accepted.status()).toBe(200);
    expect(accepted.header("Set-Cookie")).toContain("HttpOnly");
    expect(accepted.header("Set-Cookie")).toContain("SameSite=Strict");
  });
});

function mockResponse() {
  let statusCode = 200;
  const headers = new Map<string, string>();
  let body: Record<string, unknown> = {};
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    json(value: Record<string, unknown>) {
      body = value;
    },
  };
  return {
    response,
    status: () => statusCode,
    header: (name: string) => headers.get(name.toLowerCase()),
    body: () => body,
  };
}
