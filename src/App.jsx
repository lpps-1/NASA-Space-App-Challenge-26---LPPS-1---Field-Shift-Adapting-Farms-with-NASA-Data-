import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { I18nProvider } from '@/i18n';
import LanguageGate from '@/components/LanguageGate';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import FarmSetupGate from '@/components/FarmSetupGate';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Mfa from '@/pages/Mfa';
import Dashboard from '@/pages/Dashboard';
import Assistant from '@/pages/Assistant';
import Onboarding from '@/pages/Onboarding';
import Profile from '@/pages/Profile';
import Tools from '@/pages/Tools';
import Calendar from '@/pages/Calendar';
import OpenSettings from '@/components/OpenSettings';
import KnowledgeAdmin from '@/pages/KnowledgeAdmin';
import Privacy from '@/pages/Privacy';
import FieldPage from '@/pages/FieldPage';
import Rotation from '@/pages/Rotation';
import DataSources from '@/pages/DataSources';
import Terms from '@/pages/Terms';
// Add page imports here

/** Old /assistant links (with ?q=) open the chat, which is now the home page. */
function ToChat() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/mfa" element={<Mfa />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* Farm setup is full-screen and comes before everything else. */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<FarmSetupGate />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Assistant />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assistant" element={<ToChat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/fields/:id" element={<FieldPage />} />
          <Route path="/rotation" element={<Rotation />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<OpenSettings />} />
          <Route path="/knowledge" element={<DataSources />} />
          <Route path="/knowledge/admin" element={<KnowledgeAdmin />} />
        </Route>
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  useEffect(() => {
    const stored = localStorage.getItem("kisan-theme");
    const theme = stored === "light" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, []);

  return (
    <I18nProvider>
      <LanguageGate>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </LanguageGate>
    </I18nProvider>
  )
}

export default App