export function tokenUrl(token: string): string | null {
  const value = token.trim();
  if (/^A-/i.test(value)) return `https://automation.dootax.com.br/dootax/tokens/${encodeURIComponent(value)}`;
  if (/^R-/i.test(value)) return `https://rta.dootax.com.br/tokens/${encodeURIComponent(value)}`;
  return null;
}
