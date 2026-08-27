const numberFmt = new Intl.NumberFormat("pt-BR");
const percentFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "N/D";
  return percentFmt.format(ratio);
}

export function rate(part: number, total: number): number {
  if (!total) return 0;
  return part / total;
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
