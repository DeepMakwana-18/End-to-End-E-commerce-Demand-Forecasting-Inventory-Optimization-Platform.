/** Typed Axios API service layer for the Titan Supply Chain AI platform.
 *
 * All endpoints are typed and organized by domain module.
 * Auth token is automatically attached via interceptor.
 *
 * Phase 2.5: Added automatic token refresh, retry logic, request IDs.
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/hooks/useToast';
import type {
  AuthTokens, KPIData, DashboardChartData,
  Product, ProductAnalytics, InventoryItem, Alert,
  Report, UploadRecord, ModelVersion, ForecastPoint, Organization, User,
} from '@/types';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// ── Request interceptor — attach JWT + Request ID ─────────────────

api.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Add request ID for tracing
  config.headers['X-Request-ID'] = crypto.randomUUID?.() ?? `req-${Date.now()}`;
  return config;
});

// ── Response interceptor — auto refresh + retry ───────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

    // ── Auto token refresh on 401 ────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = useAppStore.getState().refreshToken;

      if (!refreshToken) {
        useAppStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post<AuthTokens>(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken, user, organization } = res.data;
        useAppStore.getState().setAuth(user, organization, access_token, newRefreshToken);

        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAppStore.getState().logout();
        toast.error('Session expired', 'Please log in again');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Retry on 5xx errors (max 2 retries) ──────────────────────
    if (
      error.response &&
      error.response.status >= 500 &&
      (originalRequest._retryCount ?? 0) < 2
    ) {
      originalRequest._retryCount = (originalRequest._retryCount ?? 0) + 1;
      const delay = originalRequest._retryCount * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return api(originalRequest);
    }

    // ── Rate limit handling ──────────────────────────────────────
    if (error.response?.status === 429) {
      toast.warning('Rate limited', 'Please wait a moment before trying again');
    }

    return Promise.reject(error);
  }
);

// ── Auth API ──────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),

  signup: (email: string, password: string, name: string, organization_name: string) =>
    api.post<AuthTokens>('/auth/signup', { email, password, name, organization_name }),

  refresh: (refresh_token: string) =>
    api.post<AuthTokens>('/auth/refresh', { refresh_token }),

  me: () => api.get<User>('/auth/me'),
};

// ── Dashboard API ─────────────────────────────────────────────────

export const dashboardApi = {
  getKPIs: () => api.get<KPIData>('/dashboard/kpis'),
  getCharts: () => api.get<DashboardChartData>('/dashboard/charts'),
  getAlerts: () => api.get<{ alerts: Alert[]; total: number }>('/dashboard/alerts'),
};

// ── Products API ──────────────────────────────────────────────────

export const productsApi = {
  getAll: (params?: { category?: string; sort_by?: string; page?: number; per_page?: number }) =>
    api.get<{ products: ProductAnalytics[]; total: number }>('/products', { params }),

  getById: (id: number) => api.get<Product>(`/products/${id}`),

  getTop: (limit = 10) =>
    api.get<{ products: ProductAnalytics[] }>('/products/top', { params: { limit } }),

  getCategories: () =>
    api.get<{ categories: { category: string; product_count: number; total_sales: number; total_revenue: number }[] }>('/products/categories'),

  create: (data: Partial<Product>) => api.post<Product>('/products', data),
  update: (id: number, data: Partial<Product>) => api.patch<Product>(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// ── Inventory API ─────────────────────────────────────────────────

export const inventoryApi = {
  getAll: (params?: { status?: string; category?: string; page?: number }) =>
    api.get<{ items: InventoryItem[]; total: number }>('/inventory', { params }),

  getAlerts: (severity?: string) =>
    api.get<{ alerts: Alert[]; total: number }>('/inventory/alerts', { params: { severity } }),

  getHealthSummary: () =>
    api.get<{ total_skus: number; distribution: Record<string, { count: number; percentage: number }>; overall_health: number }>('/inventory/health-summary'),

  getReorderRecommendations: () =>
    api.get<{ recommendations: InventoryItem[]; total: number; total_order_value: number }>('/inventory/reorder-recommendations'),

  update: (id: number, data: Partial<InventoryItem>) =>
    api.patch(`/inventory/${id}`, data),
};

// ── Forecast API ──────────────────────────────────────────────────

export const forecastApi = {
  get: (weeks = 12) =>
    api.get<{
      forecasts: ForecastPoint[];
      historical: { date: string; demand: number }[];
      model_version: string;
      accuracy: number;
      rmse: number;
      training_samples: number;
      training_id: number;
      data_source: string;
      last_trained: string;
    }>('/forecast', { params: { weeks } }),

  getModelInfo: () =>
    api.get<{
      model_type: string;
      version: string;
      accuracy: number;
      mae: number;
      rmse: number;
      features_used: number;
      training_samples: number;
      last_trained: string;
      feature_importance: Record<string, number>;
      convergence: { epoch: string; mae: number; rmse: number }[];
    }>('/forecast/model-info'),

  getTrainingHistory: () =>
    api.get<{ versions: ModelVersion[] }>('/forecast/training-history'),

  retrain: (csv_text: string, filename: string) =>
    api.post<{ status: string; task_id: string; message: string }>('/forecast/retrain', { csv_text, filename }),

  reset: () => api.post('/forecast/reset'),

  getCategories: () =>
    api.get<{ categories: { category: string; current_demand: number; predicted_demand: number; change_pct: number }[] }>('/forecast/categories'),
};

// ── Alerts API ────────────────────────────────────────────────────

export const alertsApi = {
  getAll: (params?: { severity?: string; resolved?: boolean }) =>
    api.get<{ alerts: Alert[]; total: number }>('/api/alerts', { params }),  // Note: alerts uses /api/alerts prefix

  resolve: (id: number) => api.post(`/api/alerts/${id}/resolve`),
  dismiss: (id: number) => api.delete(`/api/alerts/${id}`),
  getStats: () => api.get<{ total_active: number; by_severity: Record<string, number> }>('/api/alerts/stats'),

  sendEmail: (sku: string, message: string, date: string) =>
    api.post('/api/alerts/send-email', { sku, message, date }),
};

// ── Reports API ───────────────────────────────────────────────────

export const reportsApi = {
  getAll: () => api.get<{ reports: Report[]; total: number }>('/reports'),
  generate: (report_type: string, format?: string, name?: string) =>
    api.post('/reports/generate', { report_type, format: format || 'csv', name }),
};

// ── Upload API ────────────────────────────────────────────────────

export const uploadApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData);
  },
  getHistory: () => api.get<{ uploads: UploadRecord[]; total: number }>('/upload/history'),
};

// ── Users API ─────────────────────────────────────────────────────

export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  create: (data: { name: string; email: string; role: string; password?: string }) =>
    api.post<User>('/users', data),
  update: (id: number, data: Partial<User>) => api.patch<User>(`/users/${id}`, data),
  toggleStatus: (id: number) => api.patch(`/users/${id}/status`),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// ── Task Status API ───────────────────────────────────────────────

export const taskApi = {
  getStatus: (taskId: string) => api.get(`/tasks/${taskId}`),
};

export default api;
