import type { EventType, ProblemCategory, RobotHealthStatus, Severity } from "../../types";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, HEALTH_LABELS, SEVERITY_LABELS } from "../../data/labels";

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
  info: "bg-slate-50 text-slate-600 border-slate-200",
};

const STATUS_CLASS: Record<string, string> = {
  Sucesso: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Erro: "bg-red-50 text-red-700 border-red-200",
  "Site Instável": "bg-orange-50 text-orange-700 border-orange-200",
  "Sem Resultados": "bg-slate-50 text-slate-600 border-slate-200",
  Aviso: "bg-amber-50 text-amber-800 border-amber-200",
  Pendente: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Processando: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Cancelado: "bg-zinc-50 text-zinc-600 border-zinc-200",
};

const EVENT_CLASS: Record<EventType, string> = {
  technical_error: "bg-red-50 text-red-700 border-red-200",
  business_result: "bg-indigo-50 text-indigo-700 border-indigo-200",
  instability: "bg-orange-50 text-orange-700 border-orange-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unknown: "bg-slate-50 text-slate-600 border-slate-200",
};

const HEALTH_CLASS: Record<RobotHealthStatus, string> = {
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  watch: "bg-amber-50 text-amber-800 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-slate-50 text-slate-600 border-slate-200",
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
  return <Base className="bg-cyan-50 text-cyan-800 border-cyan-200">{CATEGORY_LABELS[value]}</Base>;
}

export function StatusBadge({ value }: { value: string }) {
  return <Base className={STATUS_CLASS[value] ?? "bg-slate-50 text-slate-600 border-slate-200"}>{value || "N/D"}</Base>;
}

export function EventTypeBadge({ value }: { value: EventType }) {
  return <Base className={EVENT_CLASS[value]}>{EVENT_TYPE_LABELS[value]}</Base>;
}

export function HealthBadge({ value }: { value: RobotHealthStatus }) {
  return <Base className={HEALTH_CLASS[value]}>{HEALTH_LABELS[value]}</Base>;
}
