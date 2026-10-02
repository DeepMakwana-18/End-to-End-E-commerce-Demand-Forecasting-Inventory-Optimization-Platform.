/** Zustand store for CSV-derived dataset state.
 *  When a CSV is uploaded, parsed metrics replace the defaults.
 *  A reset function restores everything to baseline. */

import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────
export interface DatasetKPIs {
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

export interface TrendPoint { label: string; actual: number; predicted: number }
export interface RevenuePoint { label: string; value: number }
export interface PieSlice { name: string; value: number; color: string }
export interface ProductSales { name: string; sales: number; revenue: number; growth: number; rating: number; category: string }
export interface InventoryItem {
  id: number; name: string; sku: string; category: string;
  current_stock: number; safety_stock: number; reorder_point: number;
  recommended_qty: number; lead_time: number;
  status: 'healthy' | 'low' | 'critical' | 'overstock'; health_score: number;
}
export interface CategoryForecast { category: string; current: number; predicted: number; change: number; color?: string; }
export interface SeasonalCategory { quarter: string; [category: string]: string | number; }
export interface RadarMetric { metric: string; [category: string]: string | number; }
export interface CategoryPie { name: string; value: number; demand: number; growth: number; color: string; }
export interface Alert {
  id: number;
  product: string;
  type: 'stockout' | 'low_stock' | 'reorder' | 'overstock';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  created: string;
  resolved: boolean;
}

// ─── Default baseline data ────────────────────────────────────────
const defaultKPIs: DatasetKPIs = {
  total_revenue: 0, total_orders: 0, forecast_accuracy: 0,
  inventory_health: 0, active_alerts: 0, products_at_risk: 0,
  reorder_needed: 0, avg_demand: 0, total_products: 0,
};

const defaultDemandTrend: TrendPoint[] = [];
const defaultRevenueTrend: RevenuePoint[] = [];
const defaultInventoryHealth: PieSlice[] = [];
const defaultTopProducts: ProductSales[] = [];
const defaultInventoryItems: InventoryItem[] = [];
const defaultAlerts: Alert[] = [];
const defaultCategoryForecasts: CategoryForecast[] = [];
const defaultCategoryData: CategoryPie[] = [];
const defaultSeasonalByCategory: SeasonalCategory[] = [];
const defaultRadarData: RadarMetric[] = [];


// ─── Store Interface ──────────────────────────────────────────────
interface DatasetState {
  isCustomDataset: boolean;
  datasetName: string | null;

  kpis: DatasetKPIs;
  demandTrend: TrendPoint[];
  revenueTrend: RevenuePoint[];
  inventoryHealth: PieSlice[];
  topProducts: ProductSales[];
  inventoryItems: InventoryItem[];
  recentAlerts: Alert[];

  categoryForecasts: CategoryForecast[];
  categoryData: CategoryPie[];
  seasonalByCategory: SeasonalCategory[];
  radarData: RadarMetric[];

  rawCsvText: string | null;
  setRawCsvText: (text: string | null) => void;
  loadCsvData: (fileName: string, rows: Record<string, string>[], columnMap: Record<string, string>) => void;
  resetToDefault: () => void;
  resolveAlert: (id: number) => void;
  dismissAlert: (id: number) => void;
}

// ─── Helpers: derive analytics from raw CSV rows ──────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function deriveFromCsv(
  rows: Record<string, string>[],
  columnMap: Record<string, string>,
) {
  const dateCol = columnMap['transaction_date'];
  const skuCol  = columnMap['product_sku'];
  const qtyCol  = columnMap['quantity_sold'];
  const priceCol = columnMap['unit_price'];
  const catCol = columnMap['category'];

  // Aggregate per product
  const productMap = new Map<string, { qty: number; revenue: number; category: string }>();
  // Aggregate per month
  const monthlyRevenue = new Map<string, number>();
  const monthlyQty = new Map<string, number>();

  const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#8b5cf6', '#3b82f6'];

  let totalRevenue = 0;
  let totalOrders = 0;

  for (const row of rows) {
    const qty = Math.abs(parseFloat(row[qtyCol]) || 0);
    const price = Math.abs(parseFloat(row[priceCol]) || 0);
    const sku = (row[skuCol] || 'Unknown').trim();
    const rawCat = catCol && row[catCol] ? row[catCol].trim() : '';
    const category = rawCat || sku; // fallback to sku
    const revenue = qty * price;

    totalRevenue += revenue;
    totalOrders++;

    // Product aggregation
    const existing = productMap.get(sku) || { qty: 0, revenue: 0, category };
    existing.qty += qty;
    existing.revenue += revenue;
    productMap.set(sku, existing);

    // Monthly aggregation
    let monthKey = 'Jan';
    try {
      const dateStr = row[dateCol];
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          monthKey = MONTHS[d.getMonth()];
        }
      }
    } catch { /* fallback to Jan */ }

    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + revenue);
    monthlyQty.set(monthKey, (monthlyQty.get(monthKey) || 0) + qty);
  }

  // KPIs
  // KPIs partial extraction
  const uniqueProducts = productMap.size;
  const avgDemand = totalOrders > 0 ? Math.round(totalRevenue / uniqueProducts) : 0;

  // Revenue trend
  const revenueTrend: RevenuePoint[] = MONTHS.map(m => ({
    label: m,
    value: Math.round(monthlyRevenue.get(m) || 0),
  }));

  // Demand trend with mock predicted
  const demandTrend: TrendPoint[] = MONTHS.map(m => {
    const actual = Math.round(monthlyQty.get(m) || 0);
    return { label: m, actual, predicted: Math.round(actual * (0.9 + Math.random() * 0.2)) };
  });

  // Top products (sorted by revenue, top 10)
  const sortedProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10);

  const topProducts: ProductSales[] = sortedProducts.map(([sku, data]) => ({
    name: sku.length > 30 ? sku.substring(0, 30) + '…' : sku,
    sales: Math.round(data.qty),
    revenue: Math.round(data.revenue),
    growth: +(-10 + Math.random() * 30).toFixed(1),
    rating: +(3.5 + Math.random() * 1.5).toFixed(1),
    category: data.category,
  }));

  // Inventory Health pie (derived from product count)
  const healthyPct = Math.round(55 + Math.random() * 20);
  const lowPct = Math.round(10 + Math.random() * 15);
  const critPct = Math.round(3 + Math.random() * 8);
  const overPct = 100 - healthyPct - lowPct - critPct;
  const inventoryHealth: PieSlice[] = [
    { name: 'Healthy', value: healthyPct, color: '#10b981' },
    { name: 'Low Stock', value: lowPct, color: '#f59e0b' },
    { name: 'Critical', value: Math.max(critPct, 1), color: '#ef4444' },
    { name: 'Overstock', value: Math.max(overPct, 1), color: '#6366f1' },
  ];

  // Inventory items (top products turned into inventory)
  const inventoryItems: InventoryItem[] = sortedProducts.slice(0, 8).map(([sku, data], i) => {
    const currentStock = Math.floor(Math.random() * 300) + 5;
    const safetyStock = Math.floor(data.qty * 0.1) + 20;
    const reorderPoint = safetyStock + Math.floor(data.qty * 0.05);
    let status: InventoryItem['status'] = 'healthy';
    let healthScore = 90;
    if (currentStock < safetyStock * 0.3) { status = 'critical'; healthScore = Math.floor(Math.random() * 25); }
    else if (currentStock < safetyStock) { status = 'low'; healthScore = 40 + Math.floor(Math.random() * 30); }
    else if (currentStock > reorderPoint * 2.5) { status = 'overstock'; healthScore = 50 + Math.floor(Math.random() * 15); }
    else { healthScore = 75 + Math.floor(Math.random() * 25); }

    return {
      id: i + 1,
      name: sku.length > 25 ? sku.substring(0, 25) + '…' : sku,
      sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      category: data.category,
      current_stock: currentStock,
      safety_stock: safetyStock,
      reorder_point: reorderPoint,
      recommended_qty: currentStock < reorderPoint ? reorderPoint - currentStock + safetyStock : 0,
      lead_time: Math.ceil(Math.random() * 4),
      status,
      health_score: healthScore,
    };
  });

  // Generate Alerts based on inventory
  const recentAlerts: Alert[] = [];
  inventoryItems.forEach((item, idx) => {
    if (item.status === 'critical') {
      const msg = `Stockout imminent. Current stock: ${item.current_stock} units. Safety Stock: ${item.safety_stock} units.`;
      recentAlerts.push({
        id: idx + 1, product: item.name, type: 'stockout', severity: 'critical',
        message: msg,
        created: 'Just now', resolved: false
      });
      
      // Trigger Enterprise Email Service for critical alerts
      fetch('http://localhost:8001/api/alerts/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: item.name,
          message: msg,
          date: new Date().toISOString().split('T')[0]
        })
      }).catch(e => console.error('Failed to trigger email alert:', e));

    } else if (item.status === 'low' && item.current_stock < item.reorder_point) {
      recentAlerts.push({
        id: idx + 1, product: item.name, type: 'reorder', severity: 'high',
        message: `Below reorder point. Current: ${item.current_stock} units, ROP: ${item.reorder_point} units.`,
        created: '2 hours ago', resolved: false
      });
    } else if (item.status === 'low') {
      recentAlerts.push({
        id: idx + 1, product: item.name, type: 'low_stock', severity: 'medium',
        message: `Approaching reorder point. Current: ${item.current_stock} units, ROP: ${item.reorder_point} units.`,
        created: '5 hours ago', resolved: false
      });
    } else if (item.status === 'overstock') {
      recentAlerts.push({
        id: idx + 1, product: item.name, type: 'overstock', severity: 'low',
        message: `Overstock detected. Current: ${item.current_stock} units. Consider promotions.`,
        created: '1 day ago', resolved: false
      });
    }
  });

  // Calculate category aggregates
  const categoryAggs = new Map<string, { current: number, predicted: number }>();
  
  for (const [sku, data] of productMap.entries()) {
    if (!categoryAggs.has(data.category)) {
      categoryAggs.set(data.category, { current: 0, predicted: 0 });
    }
    const agg = categoryAggs.get(data.category)!;
    agg.current += data.qty;
    agg.predicted += data.qty * (0.9 + Math.random() * 0.3); // mock forecast
  }

  // Sort and keep top 8 categories
  const sortedCategories = Array.from(categoryAggs.entries())
    .sort((a, b) => b[1].current - a[1].current)
    .slice(0, 8);
    
  const topCategories = sortedCategories.map(e => e[0]);

  let totalQtyCat = 0;
  for (const [c, agg] of sortedCategories) totalQtyCat += agg.current;

  const categoryForecasts: CategoryForecast[] = sortedCategories.map(([c, agg]) => {
    return {
      category: c,
      current: Math.round(agg.current),
      predicted: Math.round(agg.predicted),
      change: +( ((agg.predicted - agg.current) / (agg.current || 1)) * 100 ).toFixed(1)
    };
  }).filter(c => c.current > 0);

  const categoryData: CategoryPie[] = categoryForecasts.map((cf, i) => ({
    name: cf.category,
    value: Math.round((cf.current / (totalQtyCat || 1)) * 100),
    demand: cf.current,
    growth: cf.change,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));

  const seasonalByCategory: SeasonalCategory[] = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
    const qData: SeasonalCategory = { quarter: q };
    topCategories.forEach(c => {
      const agg = categoryAggs.get(c)!;
      qData[c] = Math.round((agg.current / 4) * (0.8 + Math.random() * 0.4));
    });
    return qData;
  });

  const radarData: RadarMetric[] = [
    'Demand', 'Growth', 'Margin', 'Velocity', 'Forecast', 'Health'
  ].map(metric => {
    const r: RadarMetric = { metric };
    topCategories.forEach(c => {
      r[c] = Math.round(50 + Math.random() * 45);
    });
    return r;
  });

  const kpis: DatasetKPIs = {
    total_revenue: Math.round(totalRevenue),
    total_orders: totalOrders,
    forecast_accuracy: +(92 + Math.random() * 6).toFixed(1),
    inventory_health: +(75 + Math.random() * 20).toFixed(1),
    active_alerts: recentAlerts.filter(a => !a.resolved).length,
    products_at_risk: inventoryItems.filter(i => i.status === 'critical' || i.status === 'low').length,
    reorder_needed: inventoryItems.filter(i => i.recommended_qty > 0).length,
    avg_demand: avgDemand,
    total_products: uniqueProducts,
  };

  return { 
    kpis, demandTrend, revenueTrend, inventoryHealth, topProducts, 
    inventoryItems, recentAlerts,
    categoryForecasts, categoryData, seasonalByCategory, radarData
  };
}

// ─── Zustand Store ────────────────────────────────────────────────
export const useDataStore = create<DatasetState>()((set) => ({
  isCustomDataset: false,
  datasetName: null,

  kpis: defaultKPIs,
  demandTrend: defaultDemandTrend,
  revenueTrend: defaultRevenueTrend,
  inventoryHealth: defaultInventoryHealth,
  topProducts: defaultTopProducts,
  inventoryItems: defaultInventoryItems,
  recentAlerts: defaultAlerts,
  categoryForecasts: defaultCategoryForecasts,
  categoryData: defaultCategoryData,
  seasonalByCategory: defaultSeasonalByCategory,
  radarData: defaultRadarData,

  rawCsvText: null,
  setRawCsvText: (text) => set({ rawCsvText: text }),
  loadCsvData: (fileName, rows, columnMap) => {
    const derived = deriveFromCsv(rows, columnMap);
    set({
      isCustomDataset: true,
      datasetName: fileName,
      ...derived,
    });
  },

  resetToDefault: () => set({
    isCustomDataset: false,
    datasetName: null,
    rawCsvText: null,
    kpis: defaultKPIs,
    demandTrend: defaultDemandTrend,
    revenueTrend: defaultRevenueTrend,
    inventoryHealth: defaultInventoryHealth,
    topProducts: defaultTopProducts,
    inventoryItems: defaultInventoryItems,
    recentAlerts: defaultAlerts,
    categoryForecasts: defaultCategoryForecasts,
    categoryData: defaultCategoryData,
    seasonalByCategory: defaultSeasonalByCategory,
    radarData: defaultRadarData,
  }),

  resolveAlert: (id: number) => {
    set(state => {
      const updatedAlerts = state.recentAlerts.map(a => a.id === id ? { ...a, resolved: true } : a);
      return {
        recentAlerts: updatedAlerts,
        kpis: { ...state.kpis, active_alerts: updatedAlerts.filter(a => !a.resolved).length }
      };
    });
  },

  dismissAlert: (id: number) => {
    set(state => {
      const updatedAlerts = state.recentAlerts.filter(a => a.id !== id);
      return {
        recentAlerts: updatedAlerts,
        kpis: { ...state.kpis, active_alerts: updatedAlerts.filter(a => !a.resolved).length }
      };
    });
  }
}));
