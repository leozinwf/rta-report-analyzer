import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SEVERITY_LABELS } from "../../data/labels";
import { useReport } from "../../context/ReportContext";
import { emptyFilters } from "../../types";
import type { EventType, ProblemCategory, Severity } from "../../types";
import { toDateInputValue } from "../../utils/date";

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
    <label className="block min-w-40 text-xs text-muted">
      {label}
      <select
        value=""
        onChange={(event) => {
          const value = event.target.value;
          if (value && !selected.includes(value)) onChange([...selected, value]);
        }}
        className="mt-1 w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-white"
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
              className="rounded-md bg-panel-2 px-2 py-0.5 text-[11px] text-cyan-200"
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
  const executions = parsed?.executions ?? [];
  const robots = [...new Set(executions.map((row) => row.robot))].sort();
  const statuses = [...new Set(executions.map((row) => row.status))].sort();
  const environments = [...new Set(executions.map((row) => row.environment || "N/D"))].sort();
  const tenants = [...new Set(executions.map((row) => row.tenant || "N/D"))].sort();
  const attempts = [...new Set(executions.map((row) => row.attempt ?? 1))].sort((a, b) => a - b);
  const dates = executions.map((row) => row.date).filter(Boolean) as Date[];
  const minDate = dates.length ? toDateInputValue(new Date(Math.min(...dates.map((d) => d.getTime())))) : "";
  const maxDate = dates.length ? toDateInputValue(new Date(Math.max(...dates.map((d) => d.getTime())))) : "";

  return (
    <section className="border-b border-line bg-panel/70 px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Filtros globais</p>
        <button
          type="button"
          onClick={() => setFilters(emptyFilters())}
          className="rounded-lg border border-line px-3 py-1 text-xs hover:bg-panel-2"
        >
          Limpar filtros
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs text-muted">
          De
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={filters.dateFrom ?? ""}
            onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value || undefined })}
            className="mt-1 block rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="text-xs text-muted">
          Até
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={filters.dateTo ?? ""}
            onChange={(event) => setFilters({ ...filters, dateTo: event.target.value || undefined })}
            className="mt-1 block rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-white"
          />
        </label>
        <ChipSelect label="Robô" values={robots.map((value) => ({ value, label: value }))} selected={filters.robots} onChange={(robots) => setFilters({ ...filters, robots })} />
        <ChipSelect label="Status" values={statuses.map((value) => ({ value, label: value }))} selected={filters.statuses} onChange={(statuses) => setFilters({ ...filters, statuses })} />
        <ChipSelect
          label="Categoria"
          values={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          selected={filters.categories}
          onChange={(categories) => setFilters({ ...filters, categories: categories as ProblemCategory[] })}
        />
        <ChipSelect
          label="Severidade"
          values={Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label }))}
          selected={filters.severities}
          onChange={(severities) => setFilters({ ...filters, severities: severities as Severity[] })}
        />
        <ChipSelect label="Ambiente" values={environments.map((value) => ({ value, label: value.toUpperCase() }))} selected={filters.environments} onChange={(environments) => setFilters({ ...filters, environments })} />
        <ChipSelect label="Tenant" values={tenants.map((value) => ({ value, label: value }))} selected={filters.tenants} onChange={(tenants) => setFilters({ ...filters, tenants })} />
        <ChipSelect
          label="Tentativa"
          values={attempts.map((value) => ({ value: String(value), label: String(value) }))}
          selected={filters.attempts.map(String)}
          onChange={(values) => setFilters({ ...filters, attempts: values.map(Number) })}
        />
        <ChipSelect
          label="Tipo"
          values={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          selected={filters.eventTypes}
          onChange={(eventTypes) => setFilters({ ...filters, eventTypes: eventTypes as EventType[] })}
        />
      </div>
      {filteredAnalysis ? (
        <p className="mt-3 text-xs text-muted">
          Os indicadores abaixo refletem o recorte filtrado · {filteredAnalysis.metrics.total.toLocaleString("pt-BR")} execuções
        </p>
      ) : null}
    </section>
  );
}
