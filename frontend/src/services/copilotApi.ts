/**
 * Copilot API service — typed client for the AI Supply Chain Analyst.
 *
 * Uses the shared Axios instance from api.ts so JWT auth and
 * token refresh are handled automatically.
 */

import axios from 'axios';
import { useAppStore } from '@/stores/appStore';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 45000, // Copilot responses may take longer due to SHAP computation
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Request-ID'] = crypto.randomUUID?.() ?? `req-${Date.now()}`;
  return config;
});

// ── Types ──────────────────────────────────────────────────────────

export type CopilotIntent =
  | 'executive_summary'
  | 'forecast'
  | 'forecast_explain'
  | 'anomaly'
  | 'alert'
  | 'inventory'
  | 'scenario'
  | 'unknown';

export interface CopilotMessage {
  message: string;
  context?: Record<string, unknown>;
}

export interface CopilotResponse {
  intent: CopilotIntent;
  response: string;
  data?: Record<string, unknown> | null;
  suggested_followups: string[];
  confidence: number;
}

export interface StarterPrompt {
  category: string;
  label: string;
  prompt: string;
  icon: string;
}

export interface PromptsResponse {
  prompts: StarterPrompt[];
}

// ── API methods ────────────────────────────────────────────────────

export const copilotApi = {
  /**
   * Send a message to the AI Analyst and receive a structured response.
   */
  chat: async (request: CopilotMessage): Promise<CopilotResponse> => {
    const { data } = await api.post<CopilotResponse>('/copilot/chat', request);
    return data;
  },

  /**
   * Fetch suggested starter prompts for the copilot UI.
   */
  getPrompts: async (): Promise<PromptsResponse> => {
    const { data } = await api.get<PromptsResponse>('/copilot/prompts');
    return data;
  },
};
