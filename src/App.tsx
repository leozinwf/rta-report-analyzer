import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useReport } from "./context/ReportContext";
import { AttemptsPage } from "./pages/AttemptsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EnvironmentsPage } from "./pages/EnvironmentsPage";
import { ExecutionsPage } from "./pages/ExecutionsPage";
import { JiraPage } from "./pages/JiraPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import { RobotDetailPage, RobotsPage } from "./pages/RobotsPage";
import { StagesPage } from "./pages/StagesPage";
import { TenantDetailPage, TenantsPage } from "./pages/TenantsPage";
import { UploadPage } from "./pages/UploadPage";
import { WorkQueuePage } from "./pages/WorkQueuePage";

function RequireReport({ children }: { children: ReactNode }) { const { phase } = useReport(); if (phase !== "ready") return <Navigate to="/" replace />; return children; }
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }, [pathname]); return null; }
export default function App() { return <><ScrollToTop/><Routes><Route path="/" element={<UploadPage/>}/><Route element={<RequireReport><AppShell/></RequireReport>}><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/fila" element={<WorkQueuePage/>}/><Route path="/execucoes" element={<ExecutionsPage/>}/><Route path="/robos" element={<RobotsPage/>}/><Route path="/robos/:robotId" element={<RobotDetailPage/>}/><Route path="/problemas" element={<ProblemsPage/>}/><Route path="/etapas" element={<StagesPage/>}/><Route path="/tentativas" element={<AttemptsPage/>}/><Route path="/ambientes" element={<EnvironmentsPage/>}/><Route path="/tenants" element={<TenantsPage/>}/><Route path="/tenants/:tenantId" element={<TenantDetailPage/>}/><Route path="/jira" element={<JiraPage/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></>; }
