/** TypeScript type definitions for the platform. */

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'analyst' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface KPIData {
  total_revenue: number;
  total_orders: number;
  forecast_accuracy: number;
  inventory_health: number;
  active_alerts: number;
  products_at_risk: number;
  reorder_needed: number;
  avg_demand: number;
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

export interface Alert {
  id: number;
  product_name: string;
  alert_type: 'low_stock' | 'reorder' | 'overstock' | 'stockout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  sku: string;
  price: number;
  description?: string;
  is_active: boolean;
}

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

export interface InventoryItem {
  product_id: number;
  product_name: string;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  recommended_order_qty: number;
  lead_time_weeks: number;
  inventory_status: 'healthy' | 'low' | 'critical' | 'overstock';
  reorder_alert: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';
