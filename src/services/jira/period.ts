export type JiraPeriod = {
  mode: string;
  days?: number;
  sprint?: { id: number; name: string; state: string; startDate?: string; endDate?: string; completeDate?: string };
  reason?: string;
  syncedAt?: string;
  count?: number;
};

const KEY = "rta-report-analyzer-jira-period";

export function saveJiraPeriod(period: JiraPeriod | null) {
  if (!period) { localStorage.removeItem(KEY); return; }
  localStorage.setItem(KEY, JSON.stringify(period));
}

export function loadJiraPeriod(): JiraPeriod | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as JiraPeriod : null; }
  catch { return null; }
}

export function describeJiraPeriod(period: JiraPeriod | null) {
  if (!period) return "Recorte não informado";
  if (period.sprint) {
    const start = period.sprint.startDate ? new Date(period.sprint.startDate).toLocaleDateString("pt-BR") : "N/D";
    const end = period.sprint.endDate ? new Date(period.sprint.endDate).toLocaleDateString("pt-BR") : "N/D";
    return `Sprint ${period.sprint.name} · ${start} → ${end}`;
  }
  if (period.mode === "days") return `Últimos ${period.days ?? 30} dias`;
  return period.mode;
}
