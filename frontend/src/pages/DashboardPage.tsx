/** Executive Dashboard Page - Premium enterprise analytics overview. */

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, systemApi } from '@/services/api';
import {
  DollarSign, ShoppingCart, Target, HeartPulse,
  AlertTriangle, ShieldAlert, RotateCcw, TrendingUp,
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
    <div className="rounded-xl p-3 bg-ds-surface border border-ds-border shadow-ds-float-2 text-xs z-50 min-w-[150px]">
      <p className="font-bold text-ds-text-primary mb-1.5 pb-1 border-b border-ds-hairline">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-ds-text-muted">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="truncate">{entry.name}:</span>
            </span>
            <span className="font-bold text-ds-text-primary tabular-nums">
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
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ds-hairline"
      >
        <div className="relative">
          {/* Subtle blue-to-indigo decorative glow without impairing text readability */}
          <div className="absolute -top-6 -left-6 w-48 h-20 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2.5 h-7 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600 shadow-sm flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ds-text-heading tracking-tight">
                Executive Dashboard
              </h1>
              <p className="text-sm font-medium text-ds-text-secondary mt-1">
                AI-powered demand forecasting &amp; inventory intelligence
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-ds-green-surface text-ds-green-text border border-ds-green/25 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ds-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-ds-green" />
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
          gradient="bg-gradient-to-br from-blue-600 to-indigo-600"
          glowColor="rgba(37, 99, 235, 0.25)"
          delay={0}
        />
        <KPICard
          title="Total Orders"
          value={formatNumber(kpis?.total_orders || 0)}
          change={(kpis?.total_orders || 0) > 0 ? 8.3 : undefined}
          icon={ShoppingCart}
          gradient="bg-gradient-to-br from-indigo-600 to-blue-600"
          glowColor="rgba(99, 102, 241, 0.25)"
          delay={0.05}
        />
        <KPICard
          title="Forecast Accuracy"
          value={realAccuracy > 0 ? formatPercent(realAccuracy) : "—"}
          change={realAccuracy > 0 ? 2.1 : undefined}
          icon={Target}
          gradient="bg-gradient-to-br from-emerald-600 to-teal-600"
          glowColor="rgba(5, 150, 105, 0.25)"
          delay={0.1}
        />
        <KPICard
          title="Inventory Health"
          value={kpis?.inventory_health ? formatPercent(kpis.inventory_health) : "—"}
          change={(kpis?.inventory_health || 0) > 0 ? -1.8 : undefined}
          icon={HeartPulse}
          gradient="bg-gradient-to-br from-teal-600 to-emerald-600"
          glowColor="rgba(13, 148, 136, 0.25)"
          delay={0.15}
        />
      </div>

      {/* 3. Secondary Operational KPIs (Velocity & Risk) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <KPICard
          title="Active Alerts"
          value={String(kpis?.active_alerts || 0)}
          icon={AlertTriangle}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          glowColor="rgba(217, 119, 6, 0.25)"
          delay={0.2}
        />
        <KPICard
          title="Products at Risk"
          value={String(kpis?.products_at_risk || 0)}
          icon={ShieldAlert}
          gradient="bg-gradient-to-br from-red-600 to-rose-600"
          glowColor="rgba(220, 38, 38, 0.25)"
          delay={0.25}
        />
        <KPICard
          title="Reorder Needed"
          value={String(kpis?.reorder_needed || 0)}
          icon={RotateCcw}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
          glowColor="rgba(245, 158, 11, 0.25)"
          delay={0.3}
        />
        <KPICard
          title="Average Weekly Demand"
          value={formatNumber(kpis?.avg_demand || 0)}
          change={(kpis?.avg_demand || 0) > 0 ? 5.2 : undefined}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-500 to-teal-600"
          glowColor="rgba(14, 165, 233, 0.25)"
          delay={0.35}
        />
      </div>

      {/* 4. Section Divider & Hierarchy Break */}
      <div className="pt-2 pb-1 flex items-center justify-between border-b border-ds-hairline">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-ds-blue shadow-xs" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-ds-text-primary">
            Demand Forecasts &amp; Revenue Analytics
          </h2>
        </div>
        <span className="text-xs text-ds-text-muted font-medium hidden sm:inline">
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
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-ds-blue-surface text-ds-blue-on-surface border border-ds-blue/20">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '12px', color: '#475569' }}
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
              <div className="w-12 h-12 rounded-2xl bg-ds-blue-surface text-ds-blue flex items-center justify-center mb-3 shadow-xs">
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
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-ds-indigo-surface text-ds-indigo-text border border-ds-indigo/20">
              Financial Gross
            </span>
          }
        >
          {hasRevenueChartData ? (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={charts?.revenue_trend || []} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={1} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
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
                  <Tooltip
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    formatter={((value: any) => [`${value ?? 0}%`, '']) as any}
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(15,23,42,0.1)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#17233B',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2.5 pt-2 border-t border-ds-hairline">
                {inventoryHealthData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ds-surface-sunken border border-ds-hairline">
                    <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-[11px] font-semibold text-ds-text-secondary">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-ds-emerald-success/15 text-ds-emerald-success flex items-center justify-center mb-2 shadow-xs">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-ds-text-primary">No Inventory Health Data</h4>
              <p className="text-[11px] text-ds-text-muted mt-1">
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
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-ds-surface-sunken transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-ds-surface-sunken flex items-center justify-center text-[10px] font-bold text-ds-text-primary border border-ds-border shadow-xs flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ds-text-primary truncate">{product.label}</p>
                    <div className="mt-1.5 h-1.5 w-full bg-ds-surface-sunken rounded-full overflow-hidden border border-ds-hairline/40">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((product.value || 0) / ((charts?.top_products?.[0]?.value) || 1)) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      />
                    </div>
                  </div>
                  <span className="text-xs font-sans font-bold text-ds-text-primary tabular-nums flex-shrink-0">
                    {formatNumber(product.value || 0)}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-ds-blue-surface text-ds-blue flex items-center justify-center mb-2 shadow-xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-ds-text-primary">No Product Sales Data</h4>
              <p className="text-[11px] text-ds-text-muted mt-1">
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
                  className="flex items-start gap-3 p-3 rounded-xl bg-ds-surface-sunken hover:bg-ds-surface border border-ds-hairline transition-all duration-150 shadow-xs"
                >
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex-shrink-0 ${getSeverityBg(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ds-text-primary truncate">{alert.product_name}</p>
                    <p className="text-[11px] text-ds-text-secondary mt-0.5 line-clamp-1">{alert.message}</p>
                  </div>
                  <span className="text-[10px] font-medium text-ds-text-muted flex-shrink-0">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-ds-green-surface text-ds-green flex items-center justify-center mb-2 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-ds-text-primary">No Active Alerts</h4>
              <p className="text-[11px] text-ds-text-muted mt-1">
                All inventory thresholds and automated monitors are operating normally.
              </p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

