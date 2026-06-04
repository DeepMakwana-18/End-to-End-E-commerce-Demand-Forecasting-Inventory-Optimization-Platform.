/** Scenario Engine type definitions — mirrors backend schemas exactly. */

export type ScenarioStatus = 'draft' | 'running' | 'completed' | 'failed' | 'archived';

export type ScenarioType =
  | 'demand_shock'
  | 'supply_disruption'
  | 'price_change'
  | 'seasonal_shift'
  | 'custom';

/** Scenario variables supported by the Phase 3B engine */
export interface ScenarioParameters {
  marketing_spend_pct: number;    // –100 to +200
  price_change_pct: number;       // –50 to +100
  lead_time_days: number;         // 1 to 90
  safety_stock_multiplier: number; // 0.1 to 3.0
  avg_unit_value?: number;        // revenue proxy
}

export interface ScenarioResultSummary {
  id: number;
  version: number;
  baseline_demand: number | null;
  simulated_demand: number | null;
  demand_delta_pct: number | null;
  revenue_impact: number | null;
  inventory_impact: number | null;
  stockout_risk_pct: number | null;
  computation_seconds: number | null;
  created_at: string;
}

export interface ScenarioTimePoint {
  week: number;
  date: string;
  demand: number;
  confidence_lower?: number;
  confidence_upper?: number;
}

export interface BaselineTimePoint {
  week: number;
  date: string;
  demand: number;
  confidence_lower?: number;
  confidence_upper?: number;
}

export interface ScenarioResultDetail extends ScenarioResultSummary {
  detail: {
    summary: {
      baseline_demand: number;
      simulated_demand: number;
      demand_delta_pct: number;
      revenue_impact: number;
      inventory_impact: number;
      stockout_risk_pct: number;
    };
    baseline: BaselineTimePoint[];
    simulated: ScenarioTimePoint[];
    recommendations: string[];
    params_applied: Record<string, number>;
    model_info?: {
      version_tag?: string;
      source?: string;
      base_accuracy?: number;
      base_rmse?: number;
    };
  } | null;
  error: string | null;
}

export interface Scenario {
  id: number;
  organization_id: number;
  created_by: number | null;
  name: string;
  description: string | null;
  scenario_type: ScenarioType;
  status: ScenarioStatus;
  version: number;
  is_active: boolean;
  product_ids: number[] | null;
  horizon_weeks: number;
  parameters: Partial<ScenarioParameters>;
  task_id: string | null;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  latest_result: ScenarioResultSummary | null;
}

export interface ScenarioListResponse {
  scenarios: Scenario[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ScenarioCreate {
  name: string;
  description?: string;
  scenario_type: ScenarioType;
  horizon_weeks: number;
  product_ids?: number[];
  parameters: Partial<ScenarioParameters>;
}

export interface ScenarioUpdate {
  name?: string;
  description?: string;
  scenario_type?: ScenarioType;
  horizon_weeks?: number;
  parameters?: Partial<ScenarioParameters>;
}

/** Chart-ready data point merging baseline + simulated */
export interface ScenarioChartPoint {
  week: number;
  date: string;
  baseline: number;
  simulated: number;
  ci_lower?: number;
  ci_upper?: number;
  variance: number; // simulated - baseline (absolute)
}
