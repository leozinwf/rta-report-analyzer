import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  readCookie,
  verifyAccessPassword,
  verifySessionToken,
} from "../../../server/auth";

const secret = "uma-chave-de-sessao-com-mais-de-trinta-e-dois-caracteres";

describe("access session", () => {
  it("accepts a valid signed token and rejects tampering", async () => {
    const expiresAt = Date.now() + 60_000;
    const token = await createSessionToken(secret, expiresAt);

    expect(await verifySessionToken(token, secret)).toBe(true);
    expect(await verifySessionToken(`${token}alterado`, secret)).toBe(false);
  });

  it("rejects expired tokens", async () => {
    const token = await createSessionToken(secret, Date.now() - 1);
    expect(await verifySessionToken(token, secret)).toBe(false);
  });

  it("compares passwords without exposing the configured value", async () => {
    expect(await verifyAccessPassword("senha correta", "senha correta")).toBe(true);
    expect(await verifyAccessPassword("senha errada", "senha correta")).toBe(false);
  });

  it("reads the named cookie safely", () => {
    expect(readCookie("tema=claro; rta_session=abc.def; outro=1", "rta_session")).toBe("abc.def");
  });
});
