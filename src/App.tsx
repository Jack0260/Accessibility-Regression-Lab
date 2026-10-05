import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppLayout } from '@/components/AppLayout';
import { Spinner } from '@/components/ui';
import { LoginPage, SignupPage } from '@/pages/Auth';
import { DashboardPage } from '@/pages/Dashboard';
import { ProjectsPage } from '@/pages/Projects';
import { ProjectDetailPage } from '@/pages/ProjectDetail';
import { ScanDetailPage } from '@/pages/ScanDetail';
import { RemediationPage, TicketDetailPage } from '@/pages/Remediation';
import { CompliancePage } from '@/pages/Compliance';
import { ReleaseGatesPage } from '@/pages/ReleaseGates';
import { ManualChecklistPage } from '@/pages/ManualChecklist';
import { SettingsPage } from '@/pages/Settings';

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/scans/:scanId" element={<ScanDetailPage />} />
        <Route path="/remediation" element={<RemediationPage />} />
        <Route path="/remediation/:ticketId" element={<TicketDetailPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/release-gates" element={<ReleaseGatesPage />} />
        <Route path="/manual-checklist" element={<ManualChecklistPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return session ? <ProtectedRoutes /> : <PublicRoutes />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
