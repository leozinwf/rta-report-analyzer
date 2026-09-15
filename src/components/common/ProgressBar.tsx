export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const safe = Math.min(100, Math.max(0, percent));
  const active = safe < 100;
  return (
    <div className="w-full" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safe)}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span className="inline-flex items-center gap-2">{active ? <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-40"/><span className="relative inline-flex size-2 rounded-full bg-accent"/></span> : null}{label}</span><span className="font-mono tabular-nums">{Math.round(safe)}%</span></div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${safe}%` }}>{active && safe > 0 ? <span className="block h-full w-full animate-pulse bg-white/15"/> : null}</div>{active ? <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[progressSweep_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent"/> : null}</div>
      {active ? <p className="mt-2 text-[11px] text-muted">Processamento em andamento. Arquivos maiores podem permanecer alguns segundos na mesma etapa.</p> : null}
      <style>{`@keyframes progressSweep{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}

export function progressLabel(phase: string): string {
  switch (phase) {
    case "reading": return "Lendo arquivo";
    case "extracting": return "Extraindo linhas";
    case "normalizing": return "Normalizando colunas";
    case "classifying": return "Classificando execuções";
    case "analyzing": return "Calculando indicadores";
    default: return "Processando";
  }
}
