/** Anomaly Detection TypeScript types — mirrors backend Pydantic schemas exactly. */

export type AnomalyType =
  | 'demand_spike'
  | 'demand_drop'
  | 'inventory_shock'
  | 'forecast_miss';

export type AnomalySeverity = 'low' | 'medium' | 'critical';

export interface Anomaly {
  id: number;
  organization_id: number;
  product_id: number | null;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  detected_at: string;   // ISO datetime
  event_date: string | null; // "YYYY-MM-DD"
  z_score: number | null;
  deviation_pct: number | null;
  expected_value: number | null;
  actual_value: number | null;
  explanation: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface AnomalyListResponse {
  anomalies: Anomaly[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AnomalySummary {
  total_active: number;
  critical_count: number;
  medium_count: number;
  low_count: number;
  demand_spikes: number;
  demand_drops: number;
  inventory_shocks: number;
  forecast_misses: number;
  latest_detected_at: string | null;
}

export interface AnomalyDetectRequest {
  lookback_weeks?: number;
  z_threshold_low?: number;
  z_threshold_medium?: number;
  z_threshold_critical?: number;
  types?: AnomalyType[] | null;
  comprehensive_sweep?: boolean;
}

export interface AnomalyDetectResponse {
  detected: number;
  demand_spikes: number;
  demand_drops: number;
  inventory_shocks: number;
  forecast_misses: number;
  critical: number;
  medium: number;
  low: number;
  computation_seconds: number;
}

export interface AnomalyResolveRequest {
  anomaly_ids: number[];
}

/** UI filter state */
export interface AnomalyFilters {
  severity: AnomalySeverity | 'all';
  anomaly_type: AnomalyType | 'all';
  include_resolved: boolean;
  search: string;
}

/** Single time-series data point from GET /anomalies/{id}/context */
export interface AnomalyContextPoint {
  date: string;
  actual: number | null;
  baseline: number | null;
  confidence_lower: number | null;
  confidence_upper: number | null;
  is_anomaly: boolean;
}

/** Full context response from GET /anomalies/{id}/context */
export interface AnomalyContextResponse {
  anomaly_id: number;
  product_id: number | null;
  product_name: string | null;
  product_sku: string | null;
  product_price: number | null;
  actual_value: number | null;
  expected_value: number | null;
  z_score: number | null;
  deviation_pct: number | null;
  confidence: number | null;
  series: AnomalyContextPoint[];
  revenue_impact: number | null;
  inventory_impact: number | null;
  stockout_risk_pct: number | null;
  forecast_confidence_impact: number | null;
  /** True when revenue_impact was estimated from org-wide weighted avg price (no product) */
  revenue_impact_is_estimated: boolean;
  /** The unit price used: Product.price (exact) or org weighted avg (estimated) */
  unit_price_used: number | null;
}

