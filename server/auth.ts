export const SESSION_COOKIE_NAME = "rta_session";
const TOKEN_VERSION = "v1";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function hmac(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyAccessPassword(candidate: string, configuredPassword: string): Promise<boolean> {
  const [candidateHash, configuredHash] = await Promise.all([
    sha256(candidate),
    sha256(configuredPassword),
  ]);
  return constantTimeEqual(candidateHash, configuredHash);
}

export async function createSessionToken(secret: string, expiresAt: number): Promise<string> {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const payload = `${TOKEN_VERSION}.${expiresAt}.${nonce}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token || secret.length < 32) return false;
  const [version, expiration, nonce, signature, ...extra] = token.split(".");
  if (extra.length || version !== TOKEN_VERSION || !expiration || !nonce || !signature) return false;

  const expiresAt = Number(expiration);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const payload = `${version}.${expiration}.${nonce}`;
  const expected = await hmac(payload, secret);
  return constantTimeEqual(signature, expected);
}

export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    const key = item.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(item.slice(separator + 1).trim());
  }
  return undefined;
}
