import { COLUMN_ALIASES, EXECUTION_SHEET_ALIASES, type CanonicalField } from "../../data/columnAliases";
import { normalizeKey } from "../../utils/text";

export type ColumnMapping = Partial<Record<CanonicalField, string>>;

export function resolveExecutionSheet(sheetNames: string[]): string | undefined {
  const normalized = sheetNames.map((name) => ({ name, key: normalizeKey(name) }));
  const exact = normalized.find((sheet) => EXECUTION_SHEET_ALIASES.includes(sheet.key));
  if (exact) return exact.name;
  return sheetNames.find((name) => normalizeKey(name).includes("execuc")) ?? sheetNames[0];
}

export function mapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const remaining = new Set(Object.keys(COLUMN_ALIASES) as CanonicalField[]);

  for (const header of headers) {
    const key = normalizeKey(header);
    for (const field of [...remaining]) {
      const aliases = COLUMN_ALIASES[field];
      if (aliases.some((alias) => key === alias)) {
        mapping[field] = header;
        remaining.delete(field);
        break;
      }
    }
  }

  for (const header of headers) {
    const key = normalizeKey(header);
    for (const field of [...remaining]) {
      const aliases = COLUMN_ALIASES[field];
      if (aliases.some((alias) => alias.length >= 4 && key.includes(alias))) {
        mapping[field] = header;
        remaining.delete(field);
        break;
      }
    }
  }

  return mapping;
}
