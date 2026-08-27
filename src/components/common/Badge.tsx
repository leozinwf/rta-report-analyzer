import type { EventType, ProblemCategory, RobotHealthStatus, Severity } from "../../types";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, HEALTH_LABELS, SEVERITY_LABELS } from "../../data/labels";

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  low: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  info: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const STATUS_CLASS: Record<string, string> = {
  Sucesso: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Erro: "bg-red-500/15 text-red-300 border-red-500/30",
  "Site Instável": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Sem Resultados": "bg-slate-500/15 text-slate-300 border-slate-500/30",
  Aviso: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  Pendente: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  Processando: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  Cancelado: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const EVENT_CLASS: Record<EventType, string> = {
  technical_error: "bg-red-500/15 text-red-300 border-red-500/30",
  business_result: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  instability: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  warning: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  unknown: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const HEALTH_CLASS: Record<RobotHealthStatus, string> = {
  healthy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  watch: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  unknown: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

interface BadgeProps {
  children: string;
  className?: string;
}

function Base({ children, className }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide ${className ?? ""}`}>
      {children}
    </span>
  );
}

export function SeverityBadge({ value }: { value: Severity }) {
  return <Base className={SEVERITY_CLASS[value]}>{SEVERITY_LABELS[value]}</Base>;
}

export function CategoryBadge({ value }: { value: ProblemCategory }) {
  return <Base className="bg-cyan-500/10 text-cyan-200 border-cyan-500/20">{CATEGORY_LABELS[value]}</Base>;
}

export function StatusBadge({ value }: { value: string }) {
  return <Base className={STATUS_CLASS[value] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30"}>{value || "N/D"}</Base>;
}

export function EventTypeBadge({ value }: { value: EventType }) {
  return <Base className={EVENT_CLASS[value]}>{EVENT_TYPE_LABELS[value]}</Base>;
}

export function HealthBadge({ value }: { value: RobotHealthStatus }) {
  return <Base className={HEALTH_CLASS[value]}>{HEALTH_LABELS[value]}</Base>;
}
