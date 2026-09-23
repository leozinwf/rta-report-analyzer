import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { UploadPage } from "./pages/UploadPage";
import { LoginPage } from "./pages/LoginPage";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const ExecutionsPage = lazy(() => import("./pages/ExecutionsPage").then((module) => ({ default: module.ExecutionsPage })));
const RobotsPage = lazy(() => import("./pages/RobotsPage").then((module) => ({ default: module.RobotsPage })));
const RobotDetailPage = lazy(() => import("./pages/RobotsPage").then((module) => ({ default: module.RobotDetailPage })));
const ProblemsPage = lazy(() => import("./pages/ProblemsPage").then((module) => ({ default: module.ProblemsPage })));
const StagesPage = lazy(() => import("./pages/StagesPage").then((module) => ({ default: module.StagesPage })));
const AttemptsPage = lazy(() => import("./pages/AttemptsPage").then((module) => ({ default: module.AttemptsPage })));
const EnvironmentsPage = lazy(() => import("./pages/EnvironmentsPage").then((module) => ({ default: module.EnvironmentsPage })));
const TenantsPage = lazy(() => import("./pages/TenantsPage").then((module) => ({ default: module.TenantsPage })));
const TenantDetailPage = lazy(() => import("./pages/TenantsPage").then((module) => ({ default: module.TenantDetailPage })));
const JiraPage = lazy(() => import("./pages/JiraPage").then((module) => ({ default: module.JiraPage })));
const WorkQueuePage = lazy(() => import("./pages/WorkQueuePage").then((module) => ({ default: module.WorkQueuePage })));
const WeeklyPage = lazy(() => import("./pages/WeeklyPage").then((module) => ({ default: module.WeeklyPage })));

function PageLoading() {
  return <div className="rounded-2xl border border-line bg-panel p-6 text-sm text-muted">Carregando análise…</div>;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/jira" replace />} />
          <Route path="/jira" element={<JiraPage />} />
          <Route path="/relatorios" element={<UploadPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/fila" element={<WorkQueuePage />} />
          <Route path="/semana" element={<WeeklyPage />} />
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
        <Route path="*" element={<Navigate to="/jira" replace />} />
      </Routes>
    </Suspense>
  );
}
