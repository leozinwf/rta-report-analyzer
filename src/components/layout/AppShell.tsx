import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { GlobalFilters } from "../filters/GlobalFilters";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const showReportFilters = pathname !== "/jira" && pathname !== "/relatorios";

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar />
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navegação principal">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="relative h-full w-60 shadow-2xl">
            <Sidebar mobile onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar onOpenMenu={() => setMenuOpen(true)} />
        {showReportFilters ? <GlobalFilters /> : null}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
