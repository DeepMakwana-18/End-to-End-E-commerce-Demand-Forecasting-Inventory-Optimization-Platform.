/**
 * AI-Powered E-commerce Demand Forecasting & Inventory Optimization Platform
 * Main Application Entry with React Router
 *
 * Phase 2.5: ErrorBoundary, ToastProvider, WebSocket realtime, React Query
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, lazy, Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/stores/appStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { useRealtimeKPIs } from '@/hooks/useRealtimeKPIs';
import { toast } from '@/hooks/useToast';

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
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ForecastPage = lazy(() => import('@/pages/ForecastPage'));
const ScenariosPage = lazy(() => import('@/pages/ScenariosPage'));
const AnomaliesPage = lazy(() => import('@/pages/AnomaliesPage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const UploadPage = lazy(() => import('@/pages/admin/UploadPage'));
const PipelinePage = lazy(() => import('@/pages/admin/PipelinePage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));

/** Fullscreen loading fallback */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-xs text-surface-500">Loading...</p>
      </div>
    </div>
  );
}

/** Protected route wrapper */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Realtime data synchronization (only when authenticated) */
function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore();

  // Initialize WebSocket + React Query cache sync
  if (isAuthenticated) {
    useRealtimeKPIs();
  }

  return <>{children}</>;
}

function AppContent() {
  const { theme, setTheme } = useAppStore();

  useEffect(() => {
    setTheme(theme);
  }, []);

  return (
    <RealtimeProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
            <Route path="forecasting" element={<Suspense fallback={<PageLoader />}><ForecastPage /></Suspense>} />
            <Route path="scenarios" element={<Suspense fallback={<PageLoader />}><ScenariosPage /></Suspense>} />
            <Route path="anomalies" element={<Suspense fallback={<PageLoader />}><AnomaliesPage /></Suspense>} />
            <Route path="inventory" element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />
            <Route path="products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
            <Route path="categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
            <Route path="alerts" element={<Suspense fallback={<PageLoader />}><AlertsPage /></Suspense>} />
            <Route path="admin/users" element={<Suspense fallback={<PageLoader />}><AdminUsersPage /></Suspense>} />
            <Route path="admin/upload" element={<Suspense fallback={<PageLoader />}><UploadPage /></Suspense>} />
            <Route path="admin/pipeline" element={<Suspense fallback={<PageLoader />}><PipelinePage /></Suspense>} />
            <Route path="admin/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RealtimeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
          <ToastProvider />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
