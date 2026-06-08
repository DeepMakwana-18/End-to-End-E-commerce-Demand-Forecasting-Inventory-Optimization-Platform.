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

// ── Phase 5D: SHAP Explain Types ─────────────────────────────────────

export interface AnomalyDriverItem {
  feature: string;          // e.g. "lag_1"
  label: string;            // e.g. "Last-week demand"
  shap_value: number;       // raw SHAP contribution
  feature_value: number;    // actual feature value at anomaly date
  direction: 'positive' | 'negative';
  abs_shap: number;         // |shap_value| for sorting/bar width
}

export interface AnomalyExplainResponse {
  explainer_ready: boolean;
  reason?: string | null;
  anomaly_id: number;
  model_version_tag?: string | null;
  event_date?: string | null;
  base_value?: number | null;
  predicted_at_anomaly?: number | null;
  feature_vector?: Record<string, number> | null;
  drivers: AnomalyDriverItem[];
  suppressors: AnomalyDriverItem[];
  all_shap?: Record<string, number> | null;
  narrative_summary?: string | null;
  confidence_shap?: number | null;
  confidence_source: string;
  /** "full" | "partial" | "minimal" */
  reconstruction_quality: string;
  used_fallbacks: string[];
  anomaly_type_note?: string | null;
  cached: boolean;
}

// ─────────────────────────────────────────────────────────────────────

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

  /** Phase 5D — SHAP root-cause explanation */
  getExplain: (id: number) => api.get<AnomalyExplainResponse>(`${BASE}/${id}/explain`),

  // ── Actions ────────────────────────────────────────────────────────

  detect: (req: AnomalyDetectRequest) =>
    api.post<AnomalyDetectResponse>(`${BASE}/detect`, req),

  resolve: (req: AnomalyResolveRequest) =>
    api.post<{ resolved: number; message: string }>(`${BASE}/resolve`, req),
};

export default anomalyApi;
