import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "success" | "danger" | "warning" | "unstable" | "muted";
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "from-cyan-100 to-transparent text-cyan-800",
  success: "from-emerald-100 to-transparent text-emerald-800",
  danger: "from-red-100 to-transparent text-red-700",
  warning: "from-amber-100 to-transparent text-amber-800",
  unstable: "from-orange-100 to-transparent text-orange-700",
  muted: "from-slate-100 to-transparent text-slate-700",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "neutral" }: StatCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-panel p-4">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${TONE[tone]} opacity-80`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
          <p className="mt-2 font-mono text-3xl font-medium tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        <Icon className="mt-0.5 size-5 opacity-80" />
      </div>
    </article>
  );
}
