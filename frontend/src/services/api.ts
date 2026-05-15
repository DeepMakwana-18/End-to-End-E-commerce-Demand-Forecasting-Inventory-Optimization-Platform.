/** Axios API service layer for backend communication. */

import axios from 'axios';
import { useAppStore } from '@/stores/appStore';
import type { AuthTokens, KPIData, DashboardChartData } from '@/types';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAppStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Auth API ----
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),

  signup: (email: string, password: string, name: string) =>
    api.post<AuthTokens>('/auth/signup', { email, password, name }),
};

// ---- Dashboard API ----
export const dashboardApi = {
  getKPIs: () => api.get<KPIData>('/dashboard/kpis'),
  getCharts: () => api.get<DashboardChartData>('/dashboard/charts'),
  getAlerts: () => api.get<{ alerts: any[]; total: number }>('/dashboard/alerts'),
};

export default api;
