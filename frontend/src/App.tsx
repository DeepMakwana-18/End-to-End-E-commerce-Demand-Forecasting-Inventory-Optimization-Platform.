/**
 * AI-Powered E-commerce Demand Forecasting & Inventory Optimization Platform
 * Main Application Entry with React Router
 *
 * Phase 5E-B: Global WebSocket singleton, realtime notifications, task progress
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useState, lazy, Suspense, type ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/stores/appStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { WSProvider } from '@/contexts/WSContext';
import { WSNotifications } from '@/components/ui/WSNotifications';
import { GlobalTaskProgress } from '@/components/ui/GlobalTaskProgress';
import { AICopilotDrawer } from '@/components/ui/AICopilotDrawer';
import { useRealtimeKPIs } from '@/hooks/useRealtimeKPIs';
import { toast } from '@/hooks/useToast';
import { StartupLoader, StartupErrorBoundary } from '@/components/ui/StartupLoader';
import { TitanMark } from '@/components/ui/TitanMark';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: unknown) => {
        const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        toast.error('Operation failed', typeof message === 'string' ? message : 'An unexpected error occurred');
      },
    },
  },
});

// Lazy-loaded pages for code splitting
const LoginPage       = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage   = lazy(() => import('@/pages/DashboardPage'));
const ForecastPage    = lazy(() => import('@/pages/ForecastPage'));
const ScenariosPage   = lazy(() => import('@/pages/ScenariosPage'));
const AnomaliesPage   = lazy(() => import('@/pages/AnomaliesPage'));
const InventoryPage   = lazy(() => import('@/pages/InventoryPage'));
const ProductsPage    = lazy(() => import('@/pages/ProductsPage'));
const CategoriesPage  = lazy(() => import('@/pages/CategoriesPage'));
const ReportsPage     = lazy(() => import('@/pages/ReportsPage'));
const AlertsPage      = lazy(() => import('@/pages/AlertsPage'));
const AdminUsersPage  = lazy(() => import('@/pages/admin/UsersPage'));
const UploadPage      = lazy(() => import('@/pages/admin/UploadPage'));
const PipelinePage    = lazy(() => import('@/pages/admin/PipelinePage'));
const SettingsPage    = lazy(() => import('@/pages/admin/SettingsPage'));

/** Local fallback for lazy pages opened after application startup. */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-ds-blue">
        <TitanMark size={30} mode="pulse" decorative />
        <p className="text-xs font-medium text-ds-text-secondary">Loading view...</p>
      </div>
    </div>
  );
}

function StartupReady({ children, onReady }: { children: ReactNode; onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return children;
}

function AppPage({ children, startupReady, onReady, onError }: {
  children: ReactNode;
  startupReady: boolean;
  onReady: () => void;
  onError: () => void;
}) {
  return (
    <StartupErrorBoundary onError={onError}>
      <Suspense fallback={startupReady ? <PageLoader /> : null}>
        <StartupReady onReady={onReady}>{children}</StartupReady>
      </Suspense>
    </StartupErrorBoundary>
  );
}

/** Protected route wrapper */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/**
 * Realtime data synchronization — always mounted (hooks are always called).
 * The hooks themselves guard on isAuthenticated internally.
 */
function RealtimeServices() {
  // Always call hooks unconditionally — they guard internally
  useRealtimeKPIs();
  return (
    <>
      {/* WS → Toast bridge */}
      <WSNotifications />
      {/* Floating task progress pill */}
      <GlobalTaskProgress />
    </>
  );
}

function AppContent() {
  const { theme, setTheme, isAuthenticated } = useAppStore();
  const { pathname } = useLocation();
  const [startupReady, setStartupReady] = useState(false);
  const [startupFailed, setStartupFailed] = useState(false);
  const markStartupReady = useCallback(() => setStartupReady(true), []);
  const markStartupFailed = useCallback(() => setStartupFailed(true), []);

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setTheme('system');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setTheme]);

  useEffect(() => {
    const syncVisibility = () => {
      document.documentElement.dataset.pageHidden = document.hidden ? 'true' : 'false';
    };
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      delete document.documentElement.dataset.pageHidden;
    };
  }, []);

  // Remove HTML boot fallback once React paints AppContent (StartupLoader seamlessly continues if needed)
  useLayoutEffect(() => {
    document.getElementById('boot-loader')?.remove();
    delete document.documentElement.dataset.appBoot;
  }, [pathname, startupReady]);

  return (
    <>
      {/* Realtime services mounted once, always */}
      <RealtimeServices />

      {pathname.startsWith('/app') && isAuthenticated && !startupReady && !startupFailed && <StartupLoader />}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<LoginPage />} />
          <Route path="/auth/register" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout startupReady={startupReady} />
              </ProtectedRoute>
            }
          >
            <Route index                element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><DashboardPage /></AppPage>} />
            <Route path="forecasting"   element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><ForecastPage /></AppPage>} />
            <Route path="scenarios"     element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><ScenariosPage /></AppPage>} />
            <Route path="anomalies"     element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><AnomaliesPage /></AppPage>} />
            <Route path="inventory"     element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><InventoryPage /></AppPage>} />
            <Route path="products"      element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><ProductsPage /></AppPage>} />
            <Route path="categories"    element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><CategoriesPage /></AppPage>} />
            <Route path="reports"       element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><ReportsPage /></AppPage>} />
            <Route path="alerts"        element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><AlertsPage /></AppPage>} />
            <Route path="admin/users"   element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><AdminUsersPage /></AppPage>} />
            <Route path="admin/upload"  element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><UploadPage /></AppPage>} />
            <Route path="admin/pipeline" element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><PipelinePage /></AppPage>} />
            <Route path="admin/settings" element={<AppPage startupReady={startupReady} onReady={markStartupReady} onError={markStartupFailed}><SettingsPage /></AppPage>} />
          </Route>

          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {/* WSProvider wraps everything — single WS connection for whole app */}
          <WSProvider>
            <AppContent />
            <ToastProvider />
            {/* AI Copilot — floating on all authenticated pages */}
            <AICopilotDrawer />
          </WSProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
