/** Executive Dashboard Page - Premium enterprise analytics overview. */

import { motion } from 'framer-motion';
import {
  DollarSign, ShoppingCart, Target, HeartPulse,
  AlertTriangle, ShieldAlert, RotateCcw, TrendingUp, Database, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  Legend,
} from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { formatCurrency, formatNumber, formatPercent, getSeverityBg } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-surface-900/95 !border-surface-700/80 shadow-2xl">
      <p className="text-xs font-medium text-surface-300 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          <span className="font-semibold">{entry.name}: </span>
          {typeof entry.value === 'number' && entry.value > 10000
            ? formatCurrency(entry.value)
            : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { kpis, demandTrend, revenueTrend, inventoryHealth, topProducts, recentAlerts, isCustomDataset, datasetName, resetToDefault } = useDataStore();

  return (
    <div className="space-y-6">
      {/* Custom Dataset Banner */}
      {isCustomDataset && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary-500/10 border border-primary-500/30 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary-400" />
            <div>
              <p className="text-sm font-semibold text-primary-400">Custom Dataset Active</p>
              <p className="text-xs text-surface-400">Showing analytics derived from <strong className="text-surface-200">{datasetName}</strong></p>
            </div>
          </div>
          <button
            onClick={resetToDefault}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 hover:text-white transition border border-surface-700/50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset to Default
          </button>
        </motion.div>
      )}

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-surface-500 mt-1">
            AI-powered demand forecasting & inventory intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-accent-500/10 text-accent-400 text-xs font-semibold border border-accent-500/20">
            ● Live
          </span>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpis.total_revenue)}
          change={12.5}
          icon={DollarSign}
          gradient="gradient-primary"
          glowColor="rgba(99, 102, 241, 0.25)"
          delay={0}
        />
        <KPICard
          title="Total Orders"
          value={formatNumber(kpis.total_orders)}
          change={8.3}
          icon={ShoppingCart}
          gradient="gradient-accent"
          glowColor="rgba(16, 185, 129, 0.25)"
          delay={0.05}
        />
        <KPICard
          title="Forecast Accuracy"
          value={formatPercent(kpis.forecast_accuracy)}
          change={2.1}
          icon={Target}
          gradient="gradient-warning"
          glowColor="rgba(245, 158, 11, 0.25)"
          delay={0.1}
        />
        <KPICard
          title="Inventory Health"
          value={formatPercent(kpis.inventory_health)}
          change={-1.8}
          icon={HeartPulse}
          gradient="gradient-danger"
          glowColor="rgba(239, 68, 68, 0.25)"
          delay={0.15}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Alerts"
          value={String(kpis.active_alerts)}
          icon={AlertTriangle}
          gradient="bg-orange-500"
          delay={0.2}
        />
        <KPICard
          title="Products at Risk"
          value={String(kpis.products_at_risk)}
          icon={ShieldAlert}
          gradient="bg-red-500"
          delay={0.25}
        />
        <KPICard
          title="Reorder Needed"
          value={String(kpis.reorder_needed)}
          icon={RotateCcw}
          gradient="bg-amber-500"
          delay={0.3}
        />
        <KPICard
          title="Avg Weekly Demand"
          value={formatNumber(kpis.avg_demand)}
          change={5.2}
          icon={TrendingUp}
          gradient="bg-cyan-500"
          delay={0.35}
        />
      </div>

      {/* Charts Row 1: Demand Trend + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Actual vs Predicted Demand"
          subtitle="Monthly demand comparison with ML forecasts"
          delay={0.2}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={demandTrend}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(63, 63, 70, 0.3)" />
              <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual Demand"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#colorActual)"
                dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: '#6366f1', strokeWidth: 2, fill: '#1e1e22' }}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                name="Predicted Demand"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#colorPredicted)"
                strokeDasharray="5 5"
                dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#1e1e22' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Revenue Trend"
          subtitle="Monthly revenue performance"
          delay={0.25}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueTrend}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(63, 63, 70, 0.3)" />
              <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                name="Revenue"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2: Inventory Health + Top Products + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Inventory Health"
          subtitle="Stock status distribution"
          delay={0.3}
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={inventoryHealth}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {inventoryHealth.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={((value: any) => [`${value}%`, '']) as any}
                contentStyle={{
                  background: 'rgba(24, 24, 27, 0.95)',
                  border: '1px solid rgba(63, 63, 70, 0.5)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 -mt-2">
            {inventoryHealth.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                <span className="text-[11px] text-surface-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Top Products"
          subtitle="By total units sold"
          delay={0.35}
        >
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((product, i) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="w-6 h-6 rounded-lg bg-surface-800/80 flex items-center justify-center text-[10px] font-bold text-surface-400">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-200 truncate">{product.name}</p>
                  <div className="mt-1 h-1.5 w-full bg-surface-800/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(product.sales / (topProducts[0]?.sales || 1)) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.05, ease: 'easeOut' }}
                      className="h-full rounded-full gradient-primary"
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-surface-300 tabular-nums">
                  {formatNumber(product.sales)}
                </span>
              </motion.div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Recent Alerts"
          subtitle="Inventory notifications"
          delay={0.4}
        >
          <div className="space-y-2.5">
            {recentAlerts.slice(0, 4).map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.05 }}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-800/30 hover:bg-surface-800/50 transition-colors"
              >
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getSeverityBg(alert.severity)}`}>
                  {alert.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-200 truncate">{alert.product}</p>
                  <p className="text-[11px] text-surface-500 mt-0.5 line-clamp-1">{alert.message}</p>
                </div>
                <span className="text-[10px] text-surface-600 flex-shrink-0">{alert.created}</span>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
