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
};

export default scenarioApi;
