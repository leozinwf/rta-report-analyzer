import { CalendarDays, ClipboardList, FileSpreadsheet, LayoutDashboard, LogOut, Sparkles, TicketCheck, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { AIService } from "../../ai/AIService";
import { useReport } from "../../context/ReportContext";

const ITEMS = [
  { to: "/jira", label: "Cards Jira", icon: TicketCheck },
  { to: "/relatorios", label: "Carregar relatórios", icon: FileSpreadsheet },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/fila", label: "Fila de trabalho", icon: ClipboardList },
  { to: "/semana", label: "Semana operacional", icon: CalendarDays },
  { to: "/execucoes", label: "Execuções" },
  { to: "/robos", label: "Robôs" },
  { to: "/problemas", label: "Problemas" },
  { to: "/etapas", label: "Etapas" },
  { to: "/tentativas", label: "Tentativas" },
  { to: "/ambientes", label: "Ambientes" },
  { to: "/tenants", label: "Tenants" },
];

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { reset } = useReport();
  const navigate = useNavigate();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    reset();
    window.location.assign("/login");
  }

  return (
    <aside className={`${mobile ? "flex h-full" : "hidden h-screen lg:flex"} w-60 shrink-0 flex-col border-r border-line bg-panel`}>
      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Observabilidade</p>
          {mobile ? (
            <button type="button" onClick={onNavigate} className="rounded-lg p-1.5 hover:bg-panel-2" aria-label="Fechar menu">
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <h1 className="mt-1 text-base font-semibold leading-tight">RTA Report Analyzer</h1>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                isActive ? "bg-cyan-50 text-cyan-900" : "text-muted hover:bg-panel-2 hover:text-ink"
              }`
            }
          >
            {item.icon ? <item.icon className="size-4" /> : item.to === "/dashboard" ? <LayoutDashboard className="size-4" /> : <span className="w-4" />}
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
        <button type="button" onClick={() => { reset(); navigate("/relatorios"); onNavigate?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-muted transition hover:bg-cyan-50 hover:text-accent">
          <FileSpreadsheet className="size-3.5" />
          Carregar outro relatório
        </button>
        <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-muted transition hover:bg-red-50 hover:text-danger">
          <LogOut className="size-3.5" />
          Sair com segurança
        </button>
      </div>
    </aside>
  );
}
