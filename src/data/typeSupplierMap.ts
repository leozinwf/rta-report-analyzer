// Mapeamento gerado a partir da planilha "Migração para o Automation (Types)".
// Mantemos o arquivo JSON como identificador canônico do fornecedor/template para não perder a origem.
export const TYPE_TEMPLATE_MAP: Record<string, string> = __MAP__;

export function getTemplateForType(type?: string): string | undefined {
  if (!type) return undefined;
  return TYPE_TEMPLATE_MAP[type.trim().toUpperCase()];
}

export function getSupplierName(template?: string): string | undefined {
  if (!template) return undefined;
  const base = template.replace(/\.json$/i, "").replace(/^crt[-_]?/i, "").replace(/^cnd[-_]?/i, "");
  return base
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getSupplierForType(type?: string): { template: string; supplier: string } | undefined {
  const template = getTemplateForType(type);
  if (!template) return undefined;
  return { template, supplier: getSupplierName(template) || template };
}
