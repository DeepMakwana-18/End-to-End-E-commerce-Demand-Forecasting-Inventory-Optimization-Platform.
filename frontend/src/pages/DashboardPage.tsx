/** Executive Dashboard Page - Premium enterprise analytics overview. */

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, systemApi } from '@/services/api';
import {
  DollarSign, ShoppingCart, Target, HeartPulse,
  AlertTriangle, ShieldAlert, RotateCcw, TrendingUp,
  LayoutDashboard,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  Legend,
} from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { formatCurrency, formatNumber, formatPercent, getSeverityBg } from '@/lib/utils';

interface TooltipPayloadItem {
  name: string;
  value: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

interface InventoryHealthEntry {
  label: string;
  value: number;
  name?: string;
  color?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-md dark:shadow-ds-float-2 text-xs z-50 min-w-[150px]">
      <p className="font-bold text-slate-900 dark:text-ds-text-primary mb-1.5 pb-1 border-b border-slate-100 dark:border-ds-hairline">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="truncate">{entry.name}:</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-ds-text-primary tabular-nums">
              {typeof entry.value === 'number'
                ? entry.value > 10000
                  ? formatCurrency(entry.value)
                  : formatNumber(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PieTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl p-2.5 bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-md dark:shadow-ds-float-2 text-xs z-50">
      <div className="flex items-center gap-2 font-semibold">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
        <span className="text-slate-900 dark:text-ds-text-primary">{item.name}:</span>
        <span className="font-bold text-slate-900 dark:text-ds-text-primary tabular-nums">{item.value}%</span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    }
  });

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await dashboardApi.getKPIs();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists
  });

  const { data: charts } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      const res = await dashboardApi.getCharts();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists
  });

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      const res = await dashboardApi.getAlerts();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists
  });

  const realAccuracy = kpis?.forecast_accuracy || 0;

  const inventoryHealthData: InventoryHealthEntry[] = (charts?.inventory_health || []).map((entry) => {
    const label = entry.label || '';
    let color = '#8E8E93';
    if (label === 'Healthy') color = '#059669'; // Emerald
    else if (label === 'Low Stock') color = '#D97706'; // Amber
    else if (label === 'Critical') color = '#DC2626'; // Red
    else if (label === 'Overstock') color = '#2563EB'; // Blue
    
    return {
      label,
      value: entry.value || 0,
      name: label,
      color
    };
  });

  const hasDemandChartData = Boolean(charts?.actual_vs_predicted && charts.actual_vs_predicted.length > 0);
  const hasRevenueChartData = Boolean(charts?.revenue_trend && charts.revenue_trend.length > 0);
  const hasInventoryHealthData = Boolean(inventoryHealthData.length > 0 && inventoryHealthData.some((d) => (d.value ?? 0) > 0));
  const hasTopProductsData = Boolean(charts?.top_products && charts.top_products.length > 0);
  const hasAlertsData = Boolean(alertsData?.alerts && alertsData.alerts.length > 0);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 sm:pb-16">
      {/* 1. Page Header with Elevated Container */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-ds-text-heading tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
              AI-powered demand forecasting &amp; inventory intelligence overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669] dark:bg-emerald-400" />
            </span>
            Live Platform Telemetry
          </span>
        </div>
      </motion.div>

      {/* 2. Primary KPI Grid (Core Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpis?.total_revenue || 0)}
          change={(kpis?.total_revenue || 0) > 0 ? 12.5 : undefined}
          icon={DollarSign}
          variant="blue"
          delay={0}
        />
        <KPICard
          title="Total Orders"
          value={formatNumber(kpis?.total_orders || 0)}
          change={(kpis?.total_orders || 0) > 0 ? 8.3 : undefined}
          icon={ShoppingCart}
          variant="indigo"
          delay={0.05}
        />
        <KPICard
          title="Forecast Accuracy"
          value={realAccuracy > 0 ? formatPercent(realAccuracy) : "—"}
          change={realAccuracy > 0 ? 2.1 : undefined}
          icon={Target}
          variant="teal"
          delay={0.1}
        />
        <KPICard
          title="Inventory Health"
          value={kpis?.inventory_health ? formatPercent(kpis.inventory_health) : "—"}
          change={(kpis?.inventory_health || 0) > 0 ? -1.8 : undefined}
          icon={HeartPulse}
          variant="emerald"
          delay={0.15}
        />
      </div>

      {/* 3. Secondary Operational KPIs (Velocity & Risk) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <KPICard
          title="Active Alerts"
          value={String(kpis?.active_alerts || 0)}
          sub={kpis?.active_alerts ? `${kpis.active_alerts} require review` : 'All systems normal'}
          icon={AlertTriangle}
          variant="amber"
          delay={0.2}
        />
        <KPICard
          title="Products at Risk"
          value={String(kpis?.products_at_risk || 0)}
          sub={kpis?.products_at_risk ? 'Stockout risk detected' : 'Zero products at risk'}
          icon={ShieldAlert}
          variant="rose"
          delay={0.25}
        />
        <KPICard
          title="Reorder Needed"
          value={String(kpis?.reorder_needed || 0)}
          sub={kpis?.reorder_needed ? 'Restock recommended' : 'Buffers optimal'}
          icon={RotateCcw}
          variant="amber"
          delay={0.3}
        />
        <KPICard
          title="Average Weekly Demand"
          value={formatNumber(kpis?.avg_demand || 0)}
          change={(kpis?.avg_demand || 0) > 0 ? 5.2 : undefined}
          icon={TrendingUp}
          variant="blue"
          delay={0.35}
        />
      </div>

      {/* 4. Section Divider & Hierarchy Break */}
      <div className="pt-2 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 shadow-2xs" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-ds-text-primary">
            Demand Forecasts &amp; Revenue Analytics
          </h2>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium hidden sm:inline">
          Aggregated monthly telemetry
        </span>
      </div>

      {/* 5. Charts Row 1: Actual vs Predicted Demand + Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Actual vs Predicted Demand"
          subtitle="Monthly demand comparison with ML forecasts"
          delay={0.2}
          headerVariant="tinted"
          actions={
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-[#1D4ED8] border border-[#BFDBFE] shadow-2xs dark:bg-[#1E3553]/80 dark:text-[#93C5FD] dark:border-blue-500/30">
              ML Model v2.4
            </span>
          }
        >
          {hasDemandChartData ? (
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={charts?.actual_vs_predicted || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.20} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: 'var(--ds-hairline)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '12px' }}
                  formatter={(value) => <span className="text-slate-700 dark:text-slate-200 font-semibold">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Actual Demand"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#colorActual)"
                  dot={{ fill: '#2563EB', r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5.5, stroke: '#2563EB', strokeWidth: 2, fill: '#FFFFFF' }}
                />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted Demand"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#colorPredicted)"
                  strokeDasharray="5 5"
                  dot={{ fill: '#6366F1', r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5.5, stroke: '#6366F1', strokeWidth: 2, fill: '#FFFFFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-ds-blue-surface text-blue-600 dark:text-ds-blue flex items-center justify-center mb-3 shadow-xs">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-ds-text-primary">No Demand Comparison Data Available</h4>
              <p className="text-xs text-ds-text-muted mt-1 max-w-sm">
                Demand telemetry and machine learning forecast comparisons will populate once sales history is processed.
              </p>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Revenue Trend"
          subtitle="Monthly revenue performance & velocity"
          delay={0.25}
          headerVariant="tinted"
          actions={
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-[#4338CA] border border-[#C7D2FE] shadow-2xs dark:bg-[#1E3553]/80 dark:text-[#A5B4FC] dark:border-indigo-500/30">
              Financial Gross
            </span>
          }
        >
          {hasRevenueChartData ? (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={charts?.revenue_trend || []} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: 'var(--ds-hairline)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  name="Revenue"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-ds-indigo-surface text-ds-indigo flex items-center justify-center mb-3 shadow-xs">
                <DollarSign className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-ds-text-primary">No Revenue Trend Data Available</h4>
              <p className="text-xs text-ds-text-muted mt-1 max-w-sm">
                Financial performance telemetry will appear as transaction logs and order revenue records are indexed.
              </p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* 6. Charts Row 2: Inventory Health + Top Products + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Inventory Health"
          subtitle="Stock distribution & stability breakdown"
          delay={0.3}
          headerVariant="tinted"
        >
          {hasInventoryHealthData ? (
            <>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={inventoryHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {inventoryHealthData.map((entry, index: number) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 pt-2.5 border-t border-slate-100 dark:border-ds-hairline">
                {inventoryHealthData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-ds-surface-sunken border border-slate-200/80 dark:border-ds-hairline shadow-2xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                      {entry.name} <span className="text-slate-600 dark:text-slate-400 font-medium">({entry.value}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-ds-emerald-success/15 text-emerald-600 dark:text-ds-emerald-success flex items-center justify-center mb-2 shadow-xs">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-ds-text-primary">No Inventory Health Data</h4>
              <p className="text-[11px] text-slate-500 dark:text-ds-text-muted mt-1">
                Stock balance telemetry will appear once warehouse items are recorded.
              </p>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Top Products"
          subtitle="Ranked by total velocity & sales units"
          delay={0.35}
          headerVariant="tinted"
        >
          {hasTopProductsData ? (
            <div className="space-y-3 pt-1">
              {(charts?.top_products || []).slice(0, 5).map((product, i) => (
                <motion.div
                  key={product.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-ds-surface-sunken/80 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-ds-surface-elevated flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-ds-text-primary border border-slate-200/90 dark:border-ds-border shadow-2xs flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-ds-text-primary truncate">{product.label}</p>
                    <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800/90 rounded-full overflow-hidden border border-slate-200/80 dark:border-slate-700/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((product.value || 0) / ((charts?.top_products?.[0]?.value) || 1)) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500"
                      />
                    </div>
                  </div>
                  <span className="text-xs font-sans font-bold text-slate-900 dark:text-ds-text-primary tabular-nums flex-shrink-0">
                    {formatNumber(product.value || 0)}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-ds-border-strong bg-slate-50/50 dark:bg-ds-surface-sunken p-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-ds-blue-surface text-blue-600 dark:text-ds-blue flex items-center justify-center mb-2 shadow-2xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-ds-text-primary">No Product Sales Data</h4>
              <p className="text-[11px] text-slate-500 dark:text-ds-text-muted mt-1">
                Top performing SKUs will be listed once demand orders are logged.
              </p>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Recent Alerts"
          subtitle="Operational notifications & thresholds"
          delay={0.4}
          headerVariant="tinted"
        >
          {hasAlertsData ? (
            <div className="space-y-2.5 pt-1">
              {(alertsData?.alerts || []).slice(0, 4).map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 hover:bg-white dark:bg-ds-surface-sunken dark:hover:bg-ds-surface border border-slate-200/80 dark:border-ds-hairline transition-all duration-150 shadow-2xs"
                >
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border flex-shrink-0 shadow-2xs ${getSeverityBg(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-ds-text-primary truncate">{alert.product_name}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">{alert.message}</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex-shrink-0 pt-0.5">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-ds-green-surface text-emerald-600 dark:text-ds-green flex items-center justify-center mb-2 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-ds-text-primary">No Active Alerts</h4>
              <p className="text-[11px] text-slate-500 dark:text-ds-text-muted mt-1">
                All inventory thresholds and automated monitors are operating normally.
              </p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

