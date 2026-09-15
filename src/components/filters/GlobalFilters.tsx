import { useMemo, useState } from "react";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SEVERITY_LABELS } from "../../data/labels";
import { useReport } from "../../context/ReportContext";
import { emptyFilters } from "../../types";
import type { EventType, ExecutionPlatform, ProblemCategory, Severity } from "../../types";
import { toDateInputValue } from "../../utils/date";

type Option = { value: string; label: string };

function MultiSelect({ label, values, selected, onChange, searchable = false }: { label: string; values: Option[]; selected: string[]; onChange: (next: string[]) => void; searchable?: boolean }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return values.filter((item) => !selected.includes(item.value) && (!q || item.label.toLocaleLowerCase("pt-BR").includes(q) || item.value.toLocaleLowerCase("pt-BR").includes(q)));
  }, [query, selected, values]);

  return <div className="block min-w-44 text-xs text-muted">
    <span>{label}</span>
    {searchable ? <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Pesquisar ${label.toLowerCase()}...`} className="mt-1 block w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink" /> : null}
    <select value="" onChange={(event) => { const value = event.target.value; if (value && !selected.includes(value)) { onChange([...selected, value]); setQuery(""); } }} className={`${searchable ? "mt-1" : "mt-1"} w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink`}>
      <option value="">{selected.length ? `Adicionar mais (${selected.length} selecionado${selected.length === 1 ? "" : "s"})` : "Todos"}</option>
      {filtered.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
    {selected.length ? <div className="mt-1 flex max-w-80 flex-wrap gap-1">{selected.map((value) => <button key={value} type="button" title="Remover filtro" onClick={() => onChange(selected.filter((item) => item !== value))} className="max-w-full truncate rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-800">{values.find((item) => item.value === value)?.label ?? value} ×</button>)}</div> : null}
  </div>;
}

export function GlobalFilters() {
  const { parsed, filters, setFilters, filteredAnalysis } = useReport();
  const executions = parsed?.executions ?? [];
  const robots = [...new Set(executions.map((row) => row.robot))].sort();
  const statuses = [...new Set(executions.map((row) => row.status))].sort();
  const environments = [...new Set(executions.map((row) => row.environment || "N/D"))].sort();
  const tenants = [...new Set(executions.map((row) => row.tenant || "N/D"))].sort();
  const attempts = [...new Set(executions.map((row) => row.attempt ?? 1))].sort((a, b) => a - b);
  const platforms = [...new Set(executions.map((row) => row.platform))].sort();
  const dates = executions.map((row) => row.date).filter(Boolean) as Date[];
  const minDate = dates.length ? toDateInputValue(new Date(Math.min(...dates.map((d) => d.getTime())))) : "";
  const maxDate = dates.length ? toDateInputValue(new Date(Math.max(...dates.map((d) => d.getTime())))) : "";

  return <section className="border-b border-line bg-panel/70 px-6 py-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Filtros globais</p><button type="button" onClick={() => setFilters(emptyFilters())} className="rounded-lg border border-line px-3 py-1 text-xs hover:bg-panel-2">Limpar filtros</button></div><div className="flex flex-wrap gap-3">
    <label className="text-xs text-muted">De<input type="date" min={minDate} max={maxDate} value={filters.dateFrom ?? ""} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })} className="mt-1 block rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink" /></label>
    <label className="text-xs text-muted">Até<input type="date" min={minDate} max={maxDate} value={filters.dateTo ?? ""} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })} className="mt-1 block rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink" /></label>
    <MultiSelect label="Sistema" values={platforms.map((value) => ({ value, label: value }))} selected={filters.platforms} onChange={(values) => setFilters({ ...filters, platforms: values as ExecutionPlatform[] })} />
    <MultiSelect searchable label="Robô" values={robots.map((value) => ({ value, label: value }))} selected={filters.robots} onChange={(robots) => setFilters({ ...filters, robots })} />
    <MultiSelect label="Status" values={statuses.map((value) => ({ value, label: value }))} selected={filters.statuses} onChange={(statuses) => setFilters({ ...filters, statuses })} />
    <MultiSelect label="Categoria" values={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} selected={filters.categories} onChange={(categories) => setFilters({ ...filters, categories: categories as ProblemCategory[] })} />
    <MultiSelect label="Severidade" values={Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label }))} selected={filters.severities} onChange={(severities) => setFilters({ ...filters, severities: severities as Severity[] })} />
    <MultiSelect label="Ambiente" values={environments.map((value) => ({ value, label: value.toUpperCase() }))} selected={filters.environments} onChange={(environments) => setFilters({ ...filters, environments })} />
    <MultiSelect label="Tenant" values={tenants.map((value) => ({ value, label: value }))} selected={filters.tenants} onChange={(tenants) => setFilters({ ...filters, tenants })} />
    <MultiSelect label="Tentativa" values={attempts.map((value) => ({ value: String(value), label: String(value) }))} selected={filters.attempts.map(String)} onChange={(values) => setFilters({ ...filters, attempts: values.map(Number) })} />
    <MultiSelect label="Tipo" values={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} selected={filters.eventTypes} onChange={(eventTypes) => setFilters({ ...filters, eventTypes: eventTypes as EventType[] })} />
  </div>{filteredAnalysis ? <p className="mt-3 text-xs text-muted">Os indicadores abaixo refletem o recorte filtrado · {filteredAnalysis.metrics.total.toLocaleString("pt-BR")} execuções</p> : null}</section>;
}
