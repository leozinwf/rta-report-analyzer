import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SEVERITY_LABELS } from "../../data/labels";
import { useReport } from "../../context/ReportContext";
import { emptyFilters } from "../../types";
import type { EventType, ProblemCategory, Severity } from "../../types";
import { getDateBounds, toDateInputValue } from "../../utils/date";

function ChipSelect({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-muted">
      <span>{label}</span>
      <select
        value=""
        onChange={(event) => {
          const value = event.target.value;
          if (value && !selected.includes(value)) onChange([...selected, value]);
        }}
        className="mt-1.5 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
      >
        <option value="">Todos</option>
        {values
          .filter((item) => !selected.includes(item.value))
          .map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
      </select>
      {selected.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {selected.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(selected.filter((item) => item !== value))}
              className="rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-800"
            >
              {values.find((item) => item.value === value)?.label ?? value} ×
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

export function GlobalFilters() {
  const { parsed, filters, setFilters, filteredAnalysis } = useReport();
  const [open, setOpen] = useState(false);
  const executions = parsed?.executions ?? [];
  const options = useMemo(() => {
    const dates = executions.map((row) => row.date).filter(Boolean) as Date[];
    const dateBounds = getDateBounds(dates);
    return {
      robots: [...new Set(executions.map((row) => row.robot))].sort(),
      statuses: [...new Set(executions.map((row) => row.status))].sort(),
      environments: [...new Set(executions.map((row) => row.environment || "N/D"))].sort(),
      tenants: [...new Set(executions.map((row) => row.tenant || "N/D"))].sort(),
      attempts: [...new Set(executions.map((row) => row.attempt ?? 1))].sort((a, b) => a - b),
      minDate: dateBounds.min ? toDateInputValue(dateBounds.min) : "",
      maxDate: dateBounds.max ? toDateInputValue(dateBounds.max) : "",
    };
  }, [executions]);

  const activeFilterCount =
    Number(Boolean(filters.dateFrom || filters.dateTo)) +
    filters.robots.length +
    filters.statuses.length +
    filters.categories.length +
    filters.severities.length +
    filters.environments.length +
    filters.tenants.length +
    filters.attempts.length +
    filters.eventTypes.length +
    Number(Boolean(filters.search.trim()));

  const activeSummary = [
    filters.dateFrom || filters.dateTo ? "Período" : "",
    filters.robots.length ? `${filters.robots.length} ${filters.robots.length === 1 ? "robô" : "robôs"}` : "",
    filters.statuses.length ? `${filters.statuses.length} ${filters.statuses.length === 1 ? "status" : "status"}` : "",
    filters.categories.length ? `${filters.categories.length} ${filters.categories.length === 1 ? "categoria" : "categorias"}` : "",
    filters.severities.length ? `${filters.severities.length} ${filters.severities.length === 1 ? "severidade" : "severidades"}` : "",
    filters.environments.length ? `${filters.environments.length} ${filters.environments.length === 1 ? "ambiente" : "ambientes"}` : "",
    filters.tenants.length ? `${filters.tenants.length} ${filters.tenants.length === 1 ? "tenant" : "tenants"}` : "",
    filters.attempts.length ? `${filters.attempts.length} ${filters.attempts.length === 1 ? "tentativa" : "tentativas"}` : "",
    filters.eventTypes.length ? `${filters.eventTypes.length} ${filters.eventTypes.length === 1 ? "tipo" : "tipos"}` : "",
    filters.search.trim() ? `Busca: “${filters.search.trim()}”` : "",
  ].filter(Boolean);

  if (!parsed) return null;

  return (
    <section className="border-b border-line bg-panel">
      <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold transition hover:bg-panel-2"
        >
          <SlidersHorizontal className="size-4 text-accent" />
          Filtros
          {activeFilterCount ? (
            <span className="flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] text-white">{activeFilterCount}</span>
          ) : null}
          <ChevronDown className={`size-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {activeSummary.length ? (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-muted">
              <span className="hidden sm:inline">Aplicados:</span>
              {activeSummary.slice(0, 4).map((item) => (
                <span key={item} className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-800">{item}</span>
              ))}
              {activeSummary.length > 4 ? <span>+{activeSummary.length - 4}</span> : null}
            </div>
          ) : (
            <p className="truncate text-xs text-muted">Exibindo todas as execuções</p>
          )}
        </div>

        {filteredAnalysis ? (
          <p className="ml-auto hidden text-xs text-muted md:block">
            <span className="font-semibold text-ink">{filteredAnalysis.metrics.total.toLocaleString("pt-BR")}</span> execuções
          </p>
        ) : null}

        {activeFilterCount ? (
          <button
            type="button"
            onClick={() => setFilters(emptyFilters())}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-panel-2 hover:text-ink"
          >
            <X className="size-3.5" />
            Limpar
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-line bg-page/60 px-4 py-5 sm:px-6">
          <div className="mx-auto grid max-w-[1500px] gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-muted">
                De
                <input type="date" min={options.minDate} max={options.maxDate} value={filters.dateFrom ?? ""} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value || undefined })} className="mt-1.5 block w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" />
              </label>
              <label className="text-xs font-medium text-muted">
                Até
                <input type="date" min={options.minDate} max={options.maxDate} value={filters.dateTo ?? ""} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value || undefined })} className="mt-1.5 block w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" />
              </label>
            </div>
            <ChipSelect label="Robô" values={options.robots.map((value) => ({ value, label: value }))} selected={filters.robots} onChange={(robots) => setFilters({ ...filters, robots })} />
            <ChipSelect label="Status" values={options.statuses.map((value) => ({ value, label: value }))} selected={filters.statuses} onChange={(statuses) => setFilters({ ...filters, statuses })} />
            <ChipSelect label="Categoria" values={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} selected={filters.categories} onChange={(categories) => setFilters({ ...filters, categories: categories as ProblemCategory[] })} />
            <ChipSelect label="Severidade" values={Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label }))} selected={filters.severities} onChange={(severities) => setFilters({ ...filters, severities: severities as Severity[] })} />
            <ChipSelect label="Ambiente" values={options.environments.map((value) => ({ value, label: value.toUpperCase() }))} selected={filters.environments} onChange={(environments) => setFilters({ ...filters, environments })} />
            <ChipSelect label="Tenant" values={options.tenants.map((value) => ({ value, label: value }))} selected={filters.tenants} onChange={(tenants) => setFilters({ ...filters, tenants })} />
            <ChipSelect label="Tentativa" values={options.attempts.map((value) => ({ value: String(value), label: String(value) }))} selected={filters.attempts.map(String)} onChange={(values) => setFilters({ ...filters, attempts: values.map(Number) })} />
            <ChipSelect label="Tipo" values={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} selected={filters.eventTypes} onChange={(eventTypes) => setFilters({ ...filters, eventTypes: eventTypes as EventType[] })} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
