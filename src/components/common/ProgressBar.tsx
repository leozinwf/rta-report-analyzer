export function ProgressBar({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-mono">{Math.round(percent)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-panel-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function progressLabel(phase: string): string {
  switch (phase) {
    case "reading":
      return "Lendo arquivo";
    case "extracting":
      return "Extraindo linhas";
    case "normalizing":
      return "Normalizando colunas";
    case "classifying":
      return "Classificando execuções";
    case "analyzing":
      return "Calculando indicadores";
    default:
      return "Processando";
  }
}
