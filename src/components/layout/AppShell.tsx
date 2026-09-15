import { Outlet } from "react-router-dom";
import { ChatGptExport } from "../ai/ChatGptExport";
import { GlobalFilters } from "../filters/GlobalFilters";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <GlobalFilters />
        <ChatGptExport />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
