import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useReport } from "./context/ReportContext";
import { AttemptsPage } from "./pages/AttemptsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EnvironmentsPage } from "./pages/EnvironmentsPage";
import { ExecutionsPage } from "./pages/ExecutionsPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import { RobotDetailPage, RobotsPage } from "./pages/RobotsPage";
import { StagesPage } from "./pages/StagesPage";
import { TenantDetailPage, TenantsPage } from "./pages/TenantsPage";
import { UploadPage } from "./pages/UploadPage";

function RequireReport({ children }: { children: ReactNode }) {
  const { phase } = useReport();
  if (phase !== "ready") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route
        element={
          <RequireReport>
            <AppShell />
          </RequireReport>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/execucoes" element={<ExecutionsPage />} />
        <Route path="/robos" element={<RobotsPage />} />
        <Route path="/robos/:robotId" element={<RobotDetailPage />} />
        <Route path="/problemas" element={<ProblemsPage />} />
        <Route path="/etapas" element={<StagesPage />} />
        <Route path="/tentativas" element={<AttemptsPage />} />
        <Route path="/ambientes" element={<EnvironmentsPage />} />
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/tenants/:tenantId" element={<TenantDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
