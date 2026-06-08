/** Scenario Engine API service — all calls go through the shared Axios instance. */

import api from './api';
import type {
  Scenario,
  ScenarioCreate,
  ScenarioUpdate,
  ScenarioListResponse,
  ScenarioResultDetail,
  ScenarioResultSummary,
} from '@/types/scenario';

const BASE = '/scenarios';

// ── Scenario Explain Types ─────────────────────────────────────────────

export interface ScenarioWeekDriver {
  feature: string;
  delta: number;
  direction: 'positive' | 'negative';
}

export interface ScenarioWeekExplanation {
  week: number;
  date: string;
  baseline_prediction: number;
  simulated_prediction: number;
  base_value: number;
  baseline_shap: Record<string, number>;
  simulated_shap: Record<string, number>;
  delta_shap: Record<string, number>;
  week_drivers: ScenarioWeekDriver[];
}

export interface ScenarioDriverSummaryItem {
  feature: string;
  mean_delta: number;
  mean_abs_delta: number;
  direction: 'positive' | 'negative';
  weeks_positive: number;
  weeks_negative: number;
  weeks_neutral: number;
}

export interface ScenarioExplainResponse {
  explainer_ready: boolean;
  reason?: string;
  feature_names?: string[];
  base_value_baseline?: number;
  base_value_simulated?: number;
  weeks?: ScenarioWeekExplanation[];
  driver_summary?: ScenarioDriverSummaryItem[];
}

// ── Scenario API ───────────────────────────────────────────────────────

export const scenarioApi = {
  // ── CRUD ──────────────────────────────────────────────────────────

  list: (params?: {
    status?: string;
    type?: string;
    include_archived?: boolean;
    page?: number;
    per_page?: number;
  }) => api.get<ScenarioListResponse>(BASE, { params }),

  get: (id: number) => api.get<Scenario>(`${BASE}/${id}`),

  create: (data: ScenarioCreate) => api.post<Scenario>(BASE, data),

  update: (id: number, data: ScenarioUpdate) =>
    api.patch<Scenario>(`${BASE}/${id}`, data),

  delete: (id: number) => api.delete(`${BASE}/${id}`),

  // ── Simulation ────────────────────────────────────────────────────

  run: (id: number) => api.post<ScenarioResultDetail>(`${BASE}/${id}/run`),

  // ── Results ───────────────────────────────────────────────────────

  getResults: (id: number) =>
    api.get<ScenarioResultSummary[]>(`${BASE}/${id}/results`),

  getResultByVersion: (id: number, version: number) =>
    api.get<ScenarioResultDetail>(`${BASE}/${id}/results/${version}`),

  // ── SHAP Explainability ───────────────────────────────────────────

  /** Fetch delta-SHAP explainability for a completed scenario.
   *  Returns explainer_ready=false (not a 500) on SHAP failure.
   */
  getExplain: (id: number) =>
    api.get<ScenarioExplainResponse>(`${BASE}/${id}/explain`),
};

export default scenarioApi;

