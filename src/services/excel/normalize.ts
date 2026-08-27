import { canonicalStatusFromLabel } from "../../data/statusMap";
import type { Execution } from "../../types";
import { parseDate } from "../../utils/date";
import { asString, isBlank, normalizeMessage } from "../../utils/text";
import type { ColumnMapping } from "./columnMap";

function cell(row: Record<string, unknown>, mapping: ColumnMapping, field: keyof ColumnMapping): unknown {
  const header = mapping[field];
  if (!header) return undefined;
  return row[header];
}

function parseAttempt(value: unknown): number | undefined {
  if (isBlank(value)) return undefined;
  const num = Number(asString(value).replace(",", "."));
  return Number.isFinite(num) ? num : undefined;
}

export function normalizeRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
): Execution[] {
  return rows.map((row, index) => {
    const idValue = cell(row, mapping, "id");
    const robotValue = cell(row, mapping, "robot");
    const statusValue = cell(row, mapping, "status");
    const messageValue = cell(row, mapping, "message");
    const status = asString(statusValue);

    return {
      id: asString(idValue) || `row-${index + 1}`,
      robot: asString(robotValue) || "N/D",
      robotId: asString(cell(row, mapping, "robotId")) || undefined,
      status: status || "N/D",
      canonicalStatus: canonicalStatusFromLabel(status),
      message: normalizeMessage(asString(messageValue)),
      tenant: asString(cell(row, mapping, "tenant")) || undefined,
      environment: asString(cell(row, mapping, "environment")) || undefined,
      attempt: parseAttempt(cell(row, mapping, "attempt")),
      date: parseDate(cell(row, mapping, "date")),
      startedAt: parseDate(cell(row, mapping, "startedAt")),
      finishedAt: parseDate(cell(row, mapping, "finishedAt")),
      published: asString(cell(row, mapping, "published")) || undefined,
      origin: asString(cell(row, mapping, "origin")) || undefined,
      responseQueue: asString(cell(row, mapping, "responseQueue")) || undefined,
      rawData: row,
    };
  });
}
