/** Anomaly Detection API service — typed wrappers around all anomaly endpoints. */

import api from './api';
import type {
  Anomaly,
  AnomalyListResponse,
  AnomalySummary,
  AnomalyDetectRequest,
  AnomalyDetectResponse,
  AnomalyResolveRequest,
  AnomalyType,
  AnomalySeverity,
  AnomalyContextResponse,
} from '@/types/anomaly';

const BASE = '/anomalies';

export const anomalyApi = {
  // ── Read ──────────────────────────────────────────────────────────

  list: (params?: {
    page?: number;
    per_page?: number;
    severity?: AnomalySeverity;
    anomaly_type?: AnomalyType;
    product_id?: number;
    include_resolved?: boolean;
  }) => api.get<AnomalyListResponse>(BASE, { params }),

  summary: () => api.get<AnomalySummary>(`${BASE}/summary`),

  getById: (id: number) => api.get<Anomaly>(`${BASE}/${id}`),

  getContext: (id: number) => api.get<AnomalyContextResponse>(`${BASE}/${id}/context`),

  // ── Actions ────────────────────────────────────────────────────────

  detect: (req: AnomalyDetectRequest) =>
    api.post<AnomalyDetectResponse>(`${BASE}/detect`, req),

  resolve: (req: AnomalyResolveRequest) =>
    api.post<{ resolved: number; message: string }>(`${BASE}/resolve`, req),
};

export default anomalyApi;
