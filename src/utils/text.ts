export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeKey(value: string): string {
  return stripAccents(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeMessage(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\r\n/g, "\n").trim();
}

export function includesNormalized(haystack: string, needle: string): boolean {
  return normalizeKey(haystack).includes(normalizeKey(needle));
}

export function hashId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

export function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
