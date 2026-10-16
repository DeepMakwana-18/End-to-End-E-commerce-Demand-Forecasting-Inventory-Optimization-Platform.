/** ScenarioResultPanel — shows delta KPIs, forecast comparison chart, and recommendations. */

import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  AlertTriangle, CheckCircle2, Info, Zap, BarChart2,
  ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { cn, formatNumber } from '@/lib/utils';
import type { ScenarioResultDetail, ScenarioChartPoint } from '@/types/scenario';

// ── Chart tooltip ──────────────────────────────────────────────────────

interface ChartTooltipPayloadItem {
  color: string;
  name: string;
  value: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 bg-ds-surface border border-ds-border shadow-ds-float-2 text-xs z-50 min-w-[160px]">
      <p className="font-bold text-ds-text-primary mb-1.5 pb-1 border-b border-ds-hairline">
        Week {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-ds-text-muted">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="truncate">{entry.name}:</span>
            </span>
            <span className="font-bold text-ds-text-primary font-sans tabular-nums">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Delta KPI card ─────────────────────────────────────────────────────

function DeltaCard({
  label, value, unit, icon: Icon, isPositiveGood = true,
  subtitle, delay = 0,
}: {
  label: string;
  value: number | null;
  unit?: string;
  icon: React.ElementType;
  isPositiveGood?: boolean;
  subtitle?: string;
  delay?: number;
}) {
  if (value === null) return null;
  const isPositive = value > 0;
  const isGood = isPositiveGood ? isPositive : !isPositive;
  const isNeutral = Math.abs(value) < 0.1;

  const colorClass = isNeutral
    ? 'text-ds-text-primary'
    : isGood
    ? 'text-ds-green-text'
    : 'text-ds-red-text';

  const bgClass = isNeutral
    ? 'bg-ds-surface-sunken border-ds-border'
    : isGood
    ? 'bg-ds-green-surface border-ds-green/20'
    : 'bg-ds-red-surface border-ds-red/20';

  const ArrowIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn('rounded-xl border p-3.5 shadow-xs transition-all', bgClass)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-3.5 h-3.5', isNeutral ? 'text-ds-text-muted' : isGood ? 'text-ds-green' : 'text-ds-red')} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-ds-text-muted">
            {label}
          </span>
        </div>
        {!isNeutral && (
          <ArrowIcon className={cn('w-3.5 h-3.5', colorClass)} />
        )}
      </div>
      <p className={cn('text-2xl font-bold font-sans tabular-nums tracking-tight', colorClass)}>
        {isPositive && value > 0.05 ? '+' : ''}{typeof value === 'number' ? value.toFixed(1) : value}
        <span className="text-xs font-semibold ml-0.5">{unit}</span>
      </p>
      {subtitle && (
        <p className="text-[10px] font-medium text-ds-text-muted mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

interface Props {
  result: ScenarioResultDetail | null;
  isRunning: boolean;
  scenarioName?: string;
}

export function ScenarioResultPanel({ result, isRunning, scenarioName }: Props) {
  // Build chart data merging baseline + simulated
  const chartData: ScenarioChartPoint[] = (() => {
    if (!result?.detail) return [];
    const { baseline, simulated } = result.detail;
    return baseline.map((b, i) => ({
      week: b.week,
      date: b.date,
      baseline: Math.round(b.demand),
      simulated: Math.round(simulated[i]?.demand ?? b.demand),
      ci_lower: simulated[i]?.confidence_lower,
      ci_upper: simulated[i]?.confidence_upper,
      variance: Math.round((simulated[i]?.demand ?? b.demand) - b.demand),
    }));
  })();

  const summary = result?.detail?.summary;
  const modelInfo = result?.detail?.model_info;
  const recommendations = result?.detail?.recommendations ?? [];
  const paramsApplied = result?.detail?.params_applied;

  return (
    <div className="flex flex-col gap-4">
      {/* Running state */}
      <AnimatePresence mode="wait">
        {isRunning && (
          <motion.div
            key="running"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="card-apple p-10 flex flex-col items-center justify-center gap-3 text-center bg-white dark:bg-surface-900 border border-ds-border shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-ds-text-heading">Running Scenario Simulation</p>
              <p className="text-xs text-ds-text-muted mt-1">Inference calculations in progress…</p>
            </div>
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                  className="w-2 h-2 bg-indigo-600 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state: No Simulation Yet */}
        {!isRunning && !result && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-apple p-10 sm:p-14 flex flex-col items-center justify-center gap-3 text-center bg-gradient-to-b from-[#F0F5FF]/80 via-[#F8FAFF]/80 to-white dark:bg-none dark:bg-ds-surface border border-blue-200/60 dark:border-ds-border shadow-xs rounded-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/15 to-teal-500/15 border border-blue-300/30 flex items-center justify-center shadow-inner relative mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-base font-extrabold text-ds-text-heading tracking-tight">
                No Simulation Yet
              </p>
              <p className="text-xs text-ds-text-secondary mt-1.5 max-w-sm leading-relaxed">
                Adjust the scenario variables on the left and click <strong className="font-bold text-ds-text-primary">Run Simulation</strong> to see how your changes impact demand and stock.
              </p>
            </div>
          </motion.div>
        )}

        {/* Results populated */}
        {!isRunning && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
          >
            {/* Title bar */}
            <div className="card-apple px-4 py-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white dark:bg-none dark:bg-ds-surface border border-blue-200/60 dark:border-ds-border flex items-center justify-between shadow-2xs flex-wrap gap-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-ds-text-muted tracking-wider">
                  Simulation Results
                </p>
                <p className="text-sm font-bold text-ds-text-heading">{scenarioName || 'Scenario Run'}</p>
              </div>
              <div className="flex items-center gap-2.5">
                {modelInfo && (
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-bold text-ds-text-muted">Model</p>
                    <span className="text-xs font-bold text-ds-blue-text bg-ds-blue-surface px-2 py-0.5 rounded-md border border-ds-blue/20">
                      {modelInfo.version_tag ?? modelInfo.source}
                    </span>
                  </div>
                )}
                {result.computation_seconds !== null && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] uppercase font-bold text-ds-text-muted">Compute Time</p>
                    <p className="text-xs font-mono font-semibold text-ds-text-primary">
                      {result.computation_seconds?.toFixed(2)}s
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ds-green-surface text-ds-green-text border border-ds-green/20 text-xs font-semibold shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-ds-green" />
                  <span>Completed</span>
                </div>
              </div>
            </div>

            {/* Delta KPI grid */}
            {summary && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <DeltaCard
                  label="Demand Δ"
                  value={summary.demand_delta_pct}
                  unit="%"
                  icon={TrendingUp}
                  isPositiveGood={true}
                  subtitle={`${formatNumber(summary.baseline_demand)} → ${formatNumber(summary.simulated_demand)}`}
                  delay={0}
                />
                <DeltaCard
                  label="Revenue Δ"
                  value={summary.revenue_impact}
                  unit="$"
                  icon={DollarSign}
                  isPositiveGood={true}
                  subtitle="vs baseline period"
                  delay={0.05}
                />
                <DeltaCard
                  label="Inventory Δ"
                  value={summary.inventory_impact}
                  unit=" units"
                  icon={Package}
                  isPositiveGood={true}
                  subtitle="net stock change"
                  delay={0.1}
                />
                <DeltaCard
                  label="Stockout Risk"
                  value={summary.stockout_risk_pct}
                  unit="%"
                  icon={AlertTriangle}
                  isPositiveGood={false}
                  subtitle="of forecast weeks"
                  delay={0.15}
                />
              </div>
            )}

            {/* Comparison chart */}
            {chartData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card-apple p-5 bg-white dark:bg-surface-900 border border-ds-border shadow-xs"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-ds-hairline flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-ds-text-heading">Forecast Comparison</h3>
                    <p className="text-xs text-ds-text-muted mt-0.5">Baseline vs simulated demand with confidence interval</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-slate-400 rounded" />
                      <span className="text-ds-text-muted">Baseline</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-indigo-600 rounded" />
                      <span className="text-indigo-600 font-bold">Simulated</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-1.5 bg-indigo-500/20 rounded" />
                      <span className="text-ds-text-muted">CI Band</span>
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.20} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748B" stopOpacity={0.10} />
                        <stop offset="95%" stopColor="#64748B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(w) => `W${w}`}
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                      tickFormatter={(v) => formatNumber(v)}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="ci_upper"
                      stroke="none"
                      fill="url(#ciGrad)"
                      fillOpacity={1}
                      name="CI Upper"
                      legendType="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="baseline"
                      stroke="#64748B"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      fill="url(#baseGrad)"
                      fillOpacity={1}
                      name="Baseline"
                      dot={false}
                      activeDot={{ r: 3.5, fill: '#64748B' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="simulated"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      fill="url(#simGrad)"
                      fillOpacity={1}
                      name="Simulated"
                      dot={false}
                      activeDot={{ r: 4.5, fill: '#4F46E5', stroke: '#fff', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Variance bar */}
                <div className="mt-4 pt-3 border-t border-ds-hairline">
                  <p className="text-[10px] text-ds-text-muted mb-2 font-bold uppercase tracking-wider">
                    Weekly Variance (Simulated − Baseline)
                  </p>
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="varGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                      <CartesianGrid vertical={false} stroke="transparent" />
                      <XAxis dataKey="week" hide />
                      <YAxis hide />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="variance"
                        stroke="#4F46E5"
                        strokeWidth={1.5}
                        fill="url(#varGrad)"
                        name="Variance"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="card-apple p-4 bg-white dark:bg-surface-900 border border-ds-border shadow-xs"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-ds-blue" />
                  <h3 className="text-sm font-bold text-ds-text-heading">Prescriptive Recommendations</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-ds-surface-sunken border border-ds-hairline shadow-2xs"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-ds-blue mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-medium text-ds-text-primary leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Applied params debug strip */}
            {paramsApplied && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-1.5"
              >
                {Object.entries(paramsApplied).map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-ds-surface-sunken border border-ds-hairline text-ds-text-muted font-mono"
                  >
                    {k}: <span className="text-ds-text-primary font-bold">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                  </span>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
