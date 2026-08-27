import { Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { AIService } from "../../ai/AIService";
import { useReport } from "../../context/ReportContext";

const ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/execucoes", label: "Execuções" },
  { to: "/robos", label: "Robôs" },
  { to: "/problemas", label: "Problemas" },
  { to: "/etapas", label: "Etapas" },
  { to: "/tentativas", label: "Tentativas" },
  { to: "/ambientes", label: "Ambientes" },
  { to: "/tenants", label: "Tenants" },
];

export function Sidebar() {
  const { reset } = useReport();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-ink/80">
      <div className="border-b border-line px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Observabilidade</p>
        <h1 className="mt-1 text-base font-semibold leading-tight">RTA Report Analyzer</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm transition ${
                isActive ? "bg-panel-2 text-white" : "text-muted hover:bg-panel hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-line p-4">
        <button
          type="button"
          disabled
          title="IA indisponível nesta versão"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-muted opacity-70"
        >
          <Sparkles className="size-3.5" />
          Analisar com IA
        </button>
        <p className="text-[11px] leading-relaxed text-muted">
          {AIService.enabled ? `Provider: ${AIService.providerName}` : "IA indisponível nesta versão"}
        </p>
        <button type="button" onClick={reset} className="text-xs text-muted hover:text-accent">
          Carregar outro relatório
        </button>
      </div>
    </aside>
  );
}
