import { asString, isBlank } from "./text";

const BR_DATE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

export function parseDate(value: unknown): Date | undefined {
  if (isBlank(value)) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpoch + value * 86400000);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const text = asString(value);
  const br = text.match(BR_DATE);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]) - 1;
    const year = Number(br[3]);
    const hour = Number(br[4] ?? 0);
    const minute = Number(br[5] ?? 0);
    const second = Number(br[6] ?? 0);
    const date = new Date(year, month, day, hour, minute, second);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const native = new Date(text);
  return Number.isNaN(native.getTime()) ? undefined : native;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateTime(date?: Date): string {
  if (!date) return "N/D";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function startOfDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function endOfDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}
