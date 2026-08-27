const INSTRUCTION_RE = /instru[cç][aã]o:\s*(.+)$/i;
const PASCAL_RE = /\b[A-Z][A-Za-z]*[a-z][A-Za-z]*[A-Z][A-Za-z]*\b/g;
const SKIP_STAGES = new Set([
  "Downloaded",
  "ICMS",
  "SEFAZ",
  "DARE",
  "PREFEITURA",
  "MUNICIPAL",
  "GOV",
]);

export function extractStage(message: string): string | undefined {
  if (!message) return undefined;
  const instruction = message.match(INSTRUCTION_RE);
  if (instruction?.[1]) {
    const stage = instruction[1].replace(/\s+/g, " ").trim();
    if (stage) return stage;
  }

  const matches = message.match(PASCAL_RE) ?? [];
  const stage = matches.find((value) => !SKIP_STAGES.has(value) && value.length >= 6);
  return stage;
}

export function extractStages(message: string): string[] {
  const stage = extractStage(message);
  return stage ? [stage] : [];
}
