/** ScenarioResultPanel — shows delta KPIs, chart, and recommendations. */

import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  AlertTriangle, CheckCircle2, Info, Zap, BarChart2,
  ChevronRight, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { cn, formatNumber } from '@/lib/utils';
import type { ScenarioResultDetail, ScenarioChartPoint } from '@/types/scenario';

// ── Chart tooltip ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-surface-900/95 !border-surface-700/80 shadow-2xl min-w-[160px]">
      <p className="text-[10px] font-medium text-surface-400 mb-1.5">Week {label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-xs text-surface-300" style={{ color: entry.color }}>
            {entry.name}
          </span>
          <span className="text-xs font-bold text-surface-100 font-mono">
            {formatNumber(entry.value)}
          </span>
        </div>
      ))}
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
  icon: any;
  isPositiveGood?: boolean;
  subtitle?: string;
  delay?: number;
}) {
  if (value === null) return null;
  const isPositive = value > 0;
  const isGood = isPositiveGood ? isPositive : !isPositive;
  const isNeutral = Math.abs(value) < 0.1;

  const colorClass = isNeutral
    ? 'text-surface-300'
    : isGood
    ? 'text-accent-400'
    : 'text-danger-400';

  const bgClass = isNeutral
    ? 'bg-surface-800/40 border-surface-700/40'
    : isGood
    ? 'bg-accent-500/8 border-accent-500/20'
    : 'bg-danger-500/8 border-danger-500/20';

  const ArrowIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn('rounded-xl border p-3.5', bgClass)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-3.5 h-3.5', isNeutral ? 'text-surface-500' : isGood ? 'text-accent-500' : 'text-danger-500')} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">
            {label}
          </span>
        </div>
        {!isNeutral && (
          <ArrowIcon className={cn('w-3 h-3', colorClass)} />
        )}
      </div>
      <p className={cn('text-2xl font-black font-mono tabular-nums', colorClass)}>
        {isPositive && value > 0.05 ? '+' : ''}{typeof value === 'number' ? value.toFixed(1) : value}
        <span className="text-sm font-normal ml-0.5">{unit}</span>
      </p>
      {subtitle && (
        <p className="text-[10px] text-surface-500 mt-1">{subtitle}</p>
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
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="glass-card p-8 flex flex-col items-center justify-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-surface-100">Running Simulation</p>
              <p className="text-xs text-surface-500 mt-1">Model-based inference in progress…</p>
            </div>
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                  className="w-2 h-2 bg-primary-400 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}

        {!isRunning && !result && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-10 flex flex-col items-center justify-center gap-4 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-surface-800/60 border border-surface-700/40 flex items-center justify-center">
              <BarChart2 className="w-7 h-7 text-surface-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-400">No Simulation Yet</p>
              <p className="text-xs text-surface-600 mt-1 max-w-xs">
                Adjust the scenario variables on the left and click <strong className="text-surface-400">Run Simulation</strong> to see how your changes affect demand.
              </p>
            </div>
          </motion.div>
        )}

        {!isRunning && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
          >
            {/* Title bar */}
            <div className="glass-card px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500">Result for</p>
                <p className="text-sm font-bold text-surface-100">{scenarioName}</p>
              </div>
              <div className="flex items-center gap-3">
                {modelInfo && (
                  <div className="text-right">
                    <p className="text-[10px] text-surface-500">Model</p>
                    <p className="text-xs font-semibold text-primary-400">
                      {modelInfo.version_tag ?? modelInfo.source}
                    </p>
                  </div>
                )}
                {result.computation_seconds !== null && (
                  <div className="text-right">
                    <p className="text-[10px] text-surface-500">Computed in</p>
                    <p className="text-xs font-semibold text-surface-300">
                      {result.computation_seconds?.toFixed(2)}s
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent-500/10 border border-accent-500/20">
                  <CheckCircle2 className="w-3 h-3 text-accent-400" />
                  <span className="text-[10px] font-semibold text-accent-400">Completed</span>
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
                  delay={0.06}
                />
                <DeltaCard
                  label="Inventory Δ"
                  value={summary.inventory_impact}
                  unit=" units"
                  icon={Package}
                  isPositiveGood={true}
                  subtitle="net stock change"
                  delay={0.12}
                />
                <DeltaCard
                  label="Stockout Risk"
                  value={summary.stockout_risk_pct}
                  unit="%"
                  icon={AlertTriangle}
                  isPositiveGood={false}
                  subtitle="of forecast weeks"
                  delay={0.18}
                />
              </div>
            )}

            {/* Comparison chart */}
            {chartData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-surface-100">Forecast Comparison</h3>
                    <p className="text-xs text-surface-500 mt-0.5">Baseline vs simulated demand with confidence band</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-surface-500 rounded" />
                      <span className="text-surface-500">Baseline</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-primary-400 rounded" />
                      <span className="text-surface-400">Simulated</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-1 bg-primary-400/15 rounded" />
                      <span className="text-surface-500">CI Band</span>
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#71717a" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.4)" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(w) => `W${w}`}
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      axisLine={{ stroke: '#3f3f46' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      tickFormatter={(v) => formatNumber(v)}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {/* CI upper band (filled between ci_upper and simulated) */}
                    <Area
                      type="monotone"
                      dataKey="ci_upper"
                      stroke="none"
                      fill="url(#ciGrad)"
                      fillOpacity={1}
                      name="CI Upper"
                      legendType="none"
                    />
                    {/* Baseline */}
                    <Area
                      type="monotone"
                      dataKey="baseline"
                      stroke="#71717a"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      fill="url(#baseGrad)"
                      fillOpacity={1}
                      name="Baseline"
                      dot={false}
                      activeDot={{ r: 3, fill: '#71717a' }}
                    />
                    {/* Simulated */}
                    <Area
                      type="monotone"
                      dataKey="simulated"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#simGrad)"
                      fillOpacity={1}
                      name="Simulated"
                      dot={false}
                      activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Variance bar */}
                <div className="mt-3 pt-3 border-t border-surface-800/40">
                  <p className="text-[10px] text-surface-500 mb-2 font-medium uppercase tracking-widest">
                    Weekly Variance (Simulated − Baseline)
                  </p>
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="varGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
                      <CartesianGrid vertical={false} stroke="transparent" />
                      <XAxis dataKey="week" hide />
                      <YAxis hide />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="variance"
                        stroke="#6366f1"
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
                transition={{ delay: 0.35 }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-primary-400" />
                  <h3 className="text-sm font-bold text-surface-100">Recommendations</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-900/60 border border-surface-800/40"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-surface-300 leading-relaxed">{rec}</p>
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
                transition={{ delay: 0.42 }}
                className="flex flex-wrap gap-2"
              >
                {Object.entries(paramsApplied).map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-surface-900/80 border border-surface-800/60 text-surface-500 font-mono"
                  >
                    {k}: <span className="text-surface-300">{typeof v === 'number' ? v.toFixed(3) : v}</span>
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
