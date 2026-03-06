import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { WorkspaceLayout } from "./components/layout/WorkspaceLayout";
import { Login } from "./pages/Login";
import { OAuthCallback } from "./pages/OAuthCallback";
import { useAuthStore } from "@/store/authStore";
import { NotFoundPage } from "@/pages/errors/NotFoundPage";
import { ForbiddenPage } from "@/pages/errors/ForbiddenPage";
import { ServerErrorPage } from "@/pages/errors/ServerErrorPage";
import { setForbiddenHandler, setServerErrorHandler } from "@/api/httpClient";

const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const PRList = lazy(() => import("./pages/PRList").then((module) => ({ default: module.PRList })));
const PRDetail = lazy(() => import("./pages/PRDetail").then((module) => ({ default: module.PRDetail })));
const Metrics = lazy(() => import("./pages/Metrics").then((module) => ({ default: module.Metrics })));
const Settings = lazy(() => import("./pages/Settings").then((module) => ({ default: module.Settings })));

function AppShell() {
  const initialize = useAuthStore((state) => state.initialize);
  const navigate = useNavigate();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    setForbiddenHandler(() => {
      navigate("/403", { replace: true });
    });

    setServerErrorHandler(() => {
      navigate("/500", { replace: true });
    });
  }, [navigate]);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading page...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/500" element={<ServerErrorPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<WorkspaceLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/repository/:id" element={<Navigate to="prs" replace />} />
            <Route path="/repository/:id/prs" element={<PRList />} />
            <Route path="/repository/:id/pr/:prId" element={<PRDetail />} />
            <Route path="/repository/:id/metrics" element={<Metrics />} />
            <Route path="/repository/:id/settings" element={<Settings />} />
            <Route path="/prs" element={<PRList />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
