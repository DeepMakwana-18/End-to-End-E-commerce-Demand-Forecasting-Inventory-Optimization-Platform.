/** Executive Dashboard Page — Titan AI Design System. */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatNumber, formatPercent, getSeverityBg } from '@/lib/utils';
import '@/styles/titan-dashboard.css';

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
    <div className="titan-chart-tooltip rounded-[12px] p-3 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs z-50 min-w-[160px]">
      <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1.5 pb-1 border-b border-[#e4e4e7] dark:border-[#27272a]">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-[#52525b] dark:text-[#a1a1aa]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="truncate">{entry.name}:</span>
            </span>
            <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] tabular-nums">
              {typeof entry.value === 'number'
                ? entry.name === 'Revenue' || entry.value > 10000
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
    <div className="titan-chart-tooltip rounded-[12px] p-2.5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs z-50">
      <div className="flex items-center gap-2 font-semibold">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
        <span className="text-[#0a0a0a] dark:text-[#fafaf9]">{item.name}:</span>
        <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] tabular-nums">{item.value}%</span>
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
    let color = '#64748b';
    if (label === 'Healthy') color = '#16a34a';
    else if (label === 'Low Stock') color = '#f59e0b';
    else if (label === 'Critical') color = '#dc2626';
    else if (label === 'Overstock') color = '#64748b';

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
    <div className="space-y-5 sm:space-y-6 pb-4">
      <PageHeader
        title="Executive Dashboard"
        description="Demand forecasting and inventory intelligence overview"
      />

      {/* 2. Business Overview KPIs */}
      <section aria-labelledby="kpi-overview-heading" className="space-y-2.5">
        <h2
          id="kpi-overview-heading"
          className="text-[13px] font-semibold text-ds-text-secondary"
        >
          Business overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            title="Total Revenue"
            value={formatCurrency(kpis?.total_revenue || 0)}
            icon={DollarSign}
          />
          <KPICard
            title="Total Orders"
            value={formatNumber(kpis?.total_orders || 0)}
            icon={ShoppingCart}
          />
          <KPICard
            title="Forecast Accuracy"
            value={realAccuracy > 0 ? formatPercent(realAccuracy) : '—'}
            icon={Target}
          />
          <KPICard
            title="Inventory Health"
            value={kpis?.inventory_health ? formatPercent(kpis.inventory_health) : '—'}
            icon={HeartPulse}
          />
        </div>
      </section>

      {/* 3. Operational Attention KPIs */}
      <section aria-labelledby="kpi-operations-heading" className="space-y-2.5">
        <h2
          id="kpi-operations-heading"
          className="text-[13px] font-semibold text-ds-text-secondary"
        >
          Operational attention
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            title="Active Alerts"
            value={String(kpis?.active_alerts || 0)}
            sub={kpis?.active_alerts ? `${kpis.active_alerts} require review` : 'All systems normal'}
            icon={AlertTriangle}
            emphasized={Boolean(kpis?.active_alerts)}
          />
          <KPICard
            title="Products at Risk"
            value={String(kpis?.products_at_risk || 0)}
            sub={kpis?.products_at_risk ? 'Stockout risk detected' : 'Zero products at risk'}
            icon={ShieldAlert}
          />
          <KPICard
            title="Reorder Needed"
            value={String(kpis?.reorder_needed || 0)}
            sub={kpis?.reorder_needed ? 'Restock recommended' : 'Buffers optimal'}
            icon={RotateCcw}
          />
          <KPICard
            title="Average Weekly Demand"
            value={formatNumber(kpis?.avg_demand || 0)}
            icon={TrendingUp}
          />
        </div>
      </section>

      {/* 4. Demand Forecasts & Revenue Analytics */}
      <section aria-labelledby="analytics-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="analytics-heading"
            className="text-[13px] font-semibold text-ds-text-secondary"
          >
            Demand forecasts &amp; revenue analytics
          </h2>
          <span className="text-xs text-ds-text-secondary font-medium hidden sm:inline">
            Aggregated monthly telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <ChartCard
            title="Actual vs Predicted Demand"
            subtitle="Monthly demand comparison with ML forecasts"
            headerVariant="tinted"
          >
            {hasDemandChartData ? (
              <ResponsiveContainer width="100%" height={270}>
                <AreaChart data={charts?.actual_vs_predicted || []} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 12, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--ds-hairline)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '8px' }}
                    formatter={(value) => <span className="text-ds-text-primary font-semibold">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual Demand"
                    stroke="var(--ds-ink)"
                    strokeWidth={2.25}
                    fill="var(--ds-ink)"
                    fillOpacity={0.05}
                    dot={{ fill: 'var(--ds-ink)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: 'var(--ds-ink)', strokeWidth: 2, fill: 'var(--ds-surface)' }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted Demand"
                    stroke="var(--ds-blue)"
                    strokeWidth={2.25}
                    fill="var(--ds-blue)"
                    fillOpacity={0}
                    strokeDasharray="6 4"
                    dot={{ fill: 'var(--ds-blue)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: 'var(--ds-blue)', strokeWidth: 2, fill: 'var(--ds-surface)' }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d4d4d8] dark:border-[#27272a] bg-[#f6f6f7] dark:bg-[#18181b] p-6 text-center">
                <div className="w-11 h-11 rounded-[12px] bg-[#f1f1f3] dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Demand Comparison Data Available</h4>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 max-w-sm">
                  Demand telemetry and machine learning forecast comparisons will populate once sales history is processed.
                </p>
              </div>
            )}
          </ChartCard>

          <ChartCard
            title="Revenue Trend"
            subtitle="Monthly revenue performance & velocity"
            headerVariant="tinted"
          >
            {hasRevenueChartData ? (
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={charts?.revenue_trend || []} margin={{ top: 8, right: 10, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 12, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--ds-hairline)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Revenue"
                    fill="var(--ds-blue-action)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d4d4d8] dark:border-[#27272a] bg-[#f6f6f7] dark:bg-[#18181b] p-6 text-center">
                <div className="w-11 h-11 rounded-[12px] bg-[#f1f1f3] dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] flex items-center justify-center mb-3">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Revenue Trend Data Available</h4>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 max-w-sm">
                  Financial performance telemetry will appear as transaction logs and order revenue records are indexed.
                </p>
              </div>
            )}
          </ChartCard>
        </div>
      </section>

      {/* 5. Lower Panels: Inventory Health + Top Products + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        <ChartCard
          title="Inventory Health"
          subtitle="Stock distribution & stability breakdown"
          headerVariant="tinted"
        >
          {hasInventoryHealthData ? (
            <>
              <ResponsiveContainer width="100%" height={206}>
                <PieChart>
                  <Pie
                    data={inventoryHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {inventoryHealthData.map((entry, index: number) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2.5 border-t border-ds-hairline">
                {inventoryHealthData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ds-surface-sunken border border-ds-hairline"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-xs font-semibold text-ds-text-primary">
                      {entry.name}{' '}
                      <span className="text-ds-text-secondary font-medium tabular-nums">({entry.value}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center rounded-[12px] border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-10 h-10 rounded-[10px] bg-ds-surface border border-ds-hairline text-ds-text-primary flex items-center justify-center mb-2">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-ds-text-primary">No Inventory Health Data</h4>
              <p className="text-xs text-ds-text-secondary mt-1">
                Stock balance telemetry will appear once warehouse items are recorded.
              </p>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Top Products"
          subtitle="Ranked by total velocity & sales units"
          headerVariant="tinted"
        >
          {hasTopProductsData ? (
            <div className="space-y-2">
              {(charts?.top_products || []).slice(0, 5).map((product, i) => (
                <div
                  key={product.label}
                  className="flex items-center gap-3 p-2 rounded-[10px] hover:bg-ds-surface-sunken transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-ds-surface-sunken flex items-center justify-center text-xs font-bold text-ds-text-primary border border-ds-hairline tabular-nums flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ds-text-primary truncate">{product.label}</p>
                    <div className="mt-1.5 h-1.5 w-full bg-ds-surface-sunken rounded-full overflow-hidden">
                      <div
                        style={{ width: `${((product.value || 0) / ((charts?.top_products?.[0]?.value) || 1)) * 100}%` }}
                        className="h-full rounded-full bg-ds-blue"
                      />
                    </div>
                  </div>
                  <span className="text-xs font-sans font-bold text-ds-text-primary tabular-nums flex-shrink-0">
                    {formatNumber(product.value || 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center rounded-[12px] border border-dashed border-ds-border-strong bg-ds-surface-sunken p-6 text-center">
              <div className="w-10 h-10 rounded-[10px] bg-ds-surface border border-ds-hairline text-ds-text-primary flex items-center justify-center mb-2">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-ds-text-primary">No Product Sales Data</h4>
              <p className="text-xs text-ds-text-secondary mt-1">
                Top performing SKUs will be listed once demand orders are logged.
              </p>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Recent Alerts"
          subtitle="Operational notifications & thresholds"
          headerVariant="tinted"
          actions={
            <Link
              to="/app/alerts"
              className="text-xs font-semibold text-ds-blue-text hover:underline focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2 rounded"
            >
              View all
            </Link>
          }
        >
          {hasAlertsData ? (
            <div className="space-y-2">
              {(alertsData?.alerts || []).slice(0, 4).map((alert) => {
                const cleanMessage = alert.message
                  .replace(new RegExp(`^\\[?${alert.severity}\\]?[:\\s-]*`, 'i'), '')
                  .trim() || alert.message;
                return (
                  <div
                    key={alert.id}
                    className="flex flex-col gap-1.5 p-3 rounded-[10px] bg-ds-surface-sunken border border-ds-hairline"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border flex-shrink-0 ${getSeverityBg(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate" title={alert.product_name}>
                          {alert.product_name}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-[#52525b] dark:text-[#a1a1aa] flex-shrink-0 tabular-nums">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p
                      title={alert.message}
                      className="text-xs text-[#52525b] dark:text-[#d4d4d8] line-clamp-3 leading-relaxed"
                    >
                      {cleanMessage}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d4d4d8] dark:border-[#27272a] bg-[#f6f6f7] dark:bg-[#18181b] p-6 text-center">
              <div className="w-10 h-10 rounded-[10px] bg-[#f1f1f3] dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Active Alerts</h4>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1">
                All inventory thresholds and automated monitors are operating normally.
              </p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
