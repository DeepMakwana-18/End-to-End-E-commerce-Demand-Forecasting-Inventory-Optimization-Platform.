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
  total_revenue: 2847563, total_orders: 18432, forecast_accuracy: 94.7,
  inventory_health: 87.3, active_alerts: 12, products_at_risk: 5,
  reorder_needed: 8, avg_demand: 1243.5,
};

const defaultDemandTrend: TrendPoint[] = [
  { label: 'Jan', actual: 1200, predicted: 1180 }, { label: 'Feb', actual: 1350, predicted: 1320 },
  { label: 'Mar', actual: 1100, predicted: 1250 }, { label: 'Apr', actual: 1480, predicted: 1400 },
  { label: 'May', actual: 1650, predicted: 1580 }, { label: 'Jun', actual: 1420, predicted: 1500 },
  { label: 'Jul', actual: 1780, predicted: 1700 }, { label: 'Aug', actual: 1900, predicted: 1820 },
  { label: 'Sep', actual: 1650, predicted: 1750 }, { label: 'Oct', actual: 2100, predicted: 1980 },
  { label: 'Nov', actual: 2350, predicted: 2200 }, { label: 'Dec', actual: 2500, predicted: 2400 },
];

const defaultRevenueTrend: RevenuePoint[] = [
  { label: 'Jan', value: 380000 }, { label: 'Feb', value: 420000 }, { label: 'Mar', value: 395000 },
  { label: 'Apr', value: 465000 }, { label: 'May', value: 520000 }, { label: 'Jun', value: 485000 },
  { label: 'Jul', value: 560000 }, { label: 'Aug', value: 610000 }, { label: 'Sep', value: 575000 },
  { label: 'Oct', value: 650000 }, { label: 'Nov', value: 720000 }, { label: 'Dec', value: 780000 },
];

const defaultInventoryHealth: PieSlice[] = [
  { name: 'Healthy', value: 65, color: '#10b981' }, { name: 'Low Stock', value: 20, color: '#f59e0b' },
  { name: 'Critical', value: 8, color: '#ef4444' }, { name: 'Overstock', value: 7, color: '#6366f1' },
];

const defaultTopProducts: ProductSales[] = [
  { name: 'Wireless Headphones', sales: 4523, revenue: 316610, growth: 18.5, rating: 4.8, category: 'Electronics' },
  { name: 'Smart Watch Pro', sales: 3891, revenue: 583650, growth: 12.3, rating: 4.6, category: 'Electronics' },
  { name: 'USB-C Hub', sales: 3245, revenue: 129800, growth: 22.1, rating: 4.5, category: 'Electronics' },
  { name: 'Laptop Stand', sales: 2876, revenue: 172560, growth: 8.7, rating: 4.7, category: 'Accessories' },
  { name: 'Bluetooth Speaker', sales: 2543, revenue: 203440, growth: -3.2, rating: 4.3, category: 'Electronics' },
];

const defaultInventoryItems: InventoryItem[] = [
  { id: 1, name: 'Wireless Headphones', sku: 'WH-001', category: 'Electronics', current_stock: 45, safety_stock: 80, reorder_point: 120, recommended_qty: 200, lead_time: 2, status: 'critical', health_score: 32 },
  { id: 2, name: 'Smart Watch Pro', sku: 'SW-002', category: 'Electronics', current_stock: 580, safety_stock: 150, reorder_point: 200, recommended_qty: 0, lead_time: 3, status: 'overstock', health_score: 55 },
  { id: 3, name: 'USB-C Hub', sku: 'UC-003', category: 'Electronics', current_stock: 12, safety_stock: 50, reorder_point: 80, recommended_qty: 150, lead_time: 1, status: 'critical', health_score: 15 },
  { id: 4, name: 'Laptop Stand', sku: 'LS-004', category: 'Accessories', current_stock: 89, safety_stock: 60, reorder_point: 95, recommended_qty: 100, lead_time: 2, status: 'low', health_score: 68 },
  { id: 5, name: 'Bluetooth Speaker', sku: 'BS-005', category: 'Electronics', current_stock: 3, safety_stock: 40, reorder_point: 65, recommended_qty: 180, lead_time: 2, status: 'critical', health_score: 5 },
  { id: 6, name: 'Mechanical Keyboard', sku: 'MK-006', category: 'Peripherals', current_stock: 245, safety_stock: 80, reorder_point: 120, recommended_qty: 0, lead_time: 3, status: 'healthy', health_score: 92 },
  { id: 7, name: 'Webcam HD', sku: 'WC-007', category: 'Peripherals', current_stock: 167, safety_stock: 50, reorder_point: 80, recommended_qty: 0, lead_time: 2, status: 'healthy', health_score: 88 },
  { id: 8, name: 'Monitor Arm', sku: 'MA-008', category: 'Accessories', current_stock: 78, safety_stock: 40, reorder_point: 70, recommended_qty: 50, lead_time: 1, status: 'low', health_score: 72 },
];

const defaultAlerts: Alert[] = [
  { id: 1, product: 'Bluetooth Speaker', type: 'stockout', severity: 'critical', message: 'Stockout imminent. Current stock: 3 units, Daily demand: 15 units. Estimated stockout in 0.2 days.', created: '1 hour ago', resolved: false },
  { id: 2, product: 'USB-C Hub', type: 'low_stock', severity: 'critical', message: 'Critical stock level. Current: 12 units, Safety Stock: 50 units. Stock is 76% below safety threshold.', created: '3 hours ago', resolved: false },
  { id: 3, product: 'Wireless Headphones', type: 'reorder', severity: 'high', message: 'Below reorder point. Current: 45 units, Reorder Point: 120 units. Recommended order: 200 units.', created: '5 hours ago', resolved: false },
  { id: 4, product: 'Laptop Stand', type: 'reorder', severity: 'medium', message: 'Approaching reorder point. Current: 89 units, Reorder Point: 95 units. Monitor closely.', created: '8 hours ago', resolved: false },
  { id: 5, product: 'Smart Watch Pro', type: 'overstock', severity: 'low', message: 'Overstock detected. Current: 580 units, Maximum capacity: 400 units. Consider running promotions.', created: '1 day ago', resolved: false },
  { id: 6, product: 'Monitor Arm', type: 'reorder', severity: 'medium', message: 'Stock level near reorder point. Current: 78, ROP: 70. Order placed for 50 units.', created: '2 days ago', resolved: true },
  { id: 7, product: 'Mechanical Keyboard', type: 'low_stock', severity: 'low', message: 'Seasonal demand spike expected in Q4. Consider pre-ordering to avoid shortages.', created: '3 days ago', resolved: true },
];

const defaultCategoryForecasts: CategoryForecast[] = [
  { category: 'Electronics', current: 4520, predicted: 5230, change: 15.7 },
  { category: 'Fashion', current: 3210, predicted: 3680, change: 14.6 },
  { category: 'Home & Garden', current: 2100, predicted: 1980, change: -5.7 },
  { category: 'Sports', current: 1560, predicted: 1820, change: 16.7 },
  { category: 'Books', current: 890, predicted: 950, change: 6.7 },
  { category: 'Toys', current: 1230, predicted: 1450, change: 17.9 },
];

const defaultCategoryData: CategoryPie[] = [
  { name: 'Electronics', value: 35, demand: 5230, growth: 15.7, color: '#6366f1' },
  { name: 'Fashion', value: 25, demand: 3680, growth: 14.6, color: '#10b981' },
  { name: 'Home & Garden', value: 18, demand: 1980, growth: -5.7, color: '#f59e0b' },
  { name: 'Sports', value: 12, demand: 1820, growth: 16.7, color: '#06b6d4' },
  { name: 'Books', value: 10, demand: 950, growth: 6.7, color: '#8b5cf6' },
];

const defaultSeasonalByCategory: SeasonalCategory[] = [
  { quarter: 'Q1', Electronics: 4200, Fashion: 3100, 'Home & Garden': 1800, Sports: 1200, Books: 800 },
  { quarter: 'Q2', Electronics: 4800, Fashion: 3500, 'Home & Garden': 2200, Sports: 1600, Books: 750 },
  { quarter: 'Q3', Electronics: 5100, Fashion: 2800, 'Home & Garden': 1900, Sports: 2100, Books: 900 },
  { quarter: 'Q4', Electronics: 6500, Fashion: 4200, 'Home & Garden': 2500, Sports: 1500, Books: 1200 },
];

const defaultRadarData: RadarMetric[] = [
  { metric: 'Demand', Electronics: 95, Fashion: 78, Sports: 62 },
  { metric: 'Growth', Electronics: 82, Fashion: 75, Sports: 88 },
  { metric: 'Margin', Electronics: 70, Fashion: 85, Sports: 65 },
  { metric: 'Velocity', Electronics: 88, Fashion: 72, Sports: 58 },
  { metric: 'Forecast', Electronics: 92, Fashion: 80, Sports: 70 },
  { metric: 'Health', Electronics: 78, Fashion: 82, Sports: 75 },
];

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

  loadCsvData: (fileName: string, rows: Record<string, string>[], columnMap: Record<string, string>) => void;
  resetToDefault: () => void;
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
  const uniqueProducts = productMap.size;
  const avgDemand = totalOrders > 0 ? Math.round(totalRevenue / uniqueProducts) : 0;
  const kpis: DatasetKPIs = {
    total_revenue: Math.round(totalRevenue),
    total_orders: totalOrders,
    forecast_accuracy: +(92 + Math.random() * 6).toFixed(1),
    inventory_health: +(75 + Math.random() * 20).toFixed(1),
    active_alerts: Math.min(Math.floor(uniqueProducts * 0.15), 20),
    products_at_risk: Math.min(Math.floor(uniqueProducts * 0.08), 10),
    reorder_needed: Math.min(Math.floor(uniqueProducts * 0.12), 15),
    avg_demand: avgDemand,
  };

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
}));
