/** TypeScript type definitions for the Titan Supply Chain AI platform. */

// ── Auth & User Types ─────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'org_admin' | 'analyst' | 'viewer';
  is_active: boolean;
  organization_id: number;
  last_login_at?: string;
  created_at: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  subscription_tier: 'free' | 'starter' | 'professional' | 'enterprise';
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  organization: Organization;
}

// ── Dashboard Types ───────────────────────────────────────────────

export interface KPIData {
  total_revenue: number;
  total_orders: number;
  forecast_accuracy: number;
  inventory_health: number;
  active_alerts: number;
  products_at_risk: number;
  reorder_needed: number;
  avg_demand: number;
  total_products: number;
}

export interface ChartDataPoint {
  date?: string;
  actual?: number;
  predicted?: number;
  value?: number;
  label?: string;
}

export interface DashboardChartData {
  demand_trend: ChartDataPoint[];
  actual_vs_predicted: ChartDataPoint[];
  inventory_health: ChartDataPoint[];
  revenue_trend: ChartDataPoint[];
  category_distribution: ChartDataPoint[];
  top_products: ChartDataPoint[];
}

// ── Product Types ─────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  category: string;
  sku: string;
  price: number;
  cost?: number;
  description?: string;
  is_active: boolean;
}

export interface ProductAnalytics extends Product {
  sales: number;
  revenue: number;
  growth: number;
}

// ── Inventory Types ───────────────────────────────────────────────

export interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  recommended_qty: number;
  lead_time: number;
  status: 'healthy' | 'low' | 'critical' | 'overstock';
  health_score: number;
}

// ── Alert Types ───────────────────────────────────────────────────

export interface Alert {
  id: number;
  product_name: string;
  product_id?: number;
  alert_type: 'low_stock' | 'reorder' | 'overstock' | 'stockout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  is_resolved?: boolean;
  created_at: string;
}

// ── Forecast Types ────────────────────────────────────────────────

export interface Forecast {
  id: number;
  product_id: number;
  forecast_date: string;
  predicted_demand: number;
  actual_demand?: number;
  confidence_lower?: number;
  confidence_upper?: number;
  model_version?: string;
}

export interface ForecastPoint {
  week: number;
  date: string;
  predicted_demand: number;
  confidence_lower: number;
  confidence_upper: number;
}

export interface ModelVersion {
  id: number;
  version_tag: string;
  model_type: string;
  accuracy?: number;
  mae?: number;
  rmse?: number;
  training_samples?: number;
  data_source?: string;
  is_active: boolean;
  created_at: string;
}

// ── Report Types ──────────────────────────────────────────────────

export interface Report {
  id: number;
  name: string;
  type: string;
  format: string;
  size?: string;
  date: string;
  status: string;
}

// ── Upload Types ──────────────────────────────────────────────────

export interface UploadRecord {
  id: number;
  filename: string;
  rows_processed: number;
  status: string;
  date: string;
  size: string;
}

// ── Pagination ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ── UI Types ──────────────────────────────────────────────────────

export type ThemeMode = 'dark' | 'light' | 'system';

// ── WebSocket Types ───────────────────────────────────────────────

export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
}

// ── Task Progress Types ───────────────────────────────────────────

export interface TaskProgress {
  task_id: string;
  state: 'pending' | 'started' | 'progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: Record<string, unknown>;
  error?: string;
}

