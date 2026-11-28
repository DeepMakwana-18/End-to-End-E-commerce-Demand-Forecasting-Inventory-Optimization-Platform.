/** ScenarioResultPanel — shows delta KPIs, forecast comparison chart, recommendations, and readable applied assumptions. */

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  AlertTriangle, CheckCircle2, Info, Zap, BarChart2,
  ChevronRight, ChevronDown, XCircle,
} from 'lucide-react';
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import type { ScenarioResultDetail, ScenarioChartPoint } from '@/types/scenario';

// ── Chart tooltip ──────────────────────────────────────────────────────

interface ChartTooltipPayloadItem {
  color?: string;
  stroke?: string;
  name: string;
  value: number | [number, number];
  dataKey?: string;
  payload?: ScenarioChartPoint & { ciBand?: [number, number] };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
}

function formatDateShort(dateStr?: string) {
  if (!dateStr) return null;
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const formattedDate = formatDateShort(point?.date);
  const visibleEntries = payload.filter((e) => e.dataKey !== 'ciBand' && typeof e.value === 'number');

  return (
    <div className="titan-chart-tooltip rounded-[12px] p-3 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs z-50 min-w-[185px]">
      <div className="mb-1.5 pb-1 border-b border-[#e4e4e7] dark:border-[#27272a]">
        <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Week {label}</p>
        {formattedDate && (
          <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium">{formattedDate}</p>
        )}
      </div>
      <div className="space-y-1.5">
        {visibleEntries.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-[#52525b] dark:text-[#a1a1aa]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || entry.stroke }} />
              <span className="truncate">{entry.name}:</span>
            </span>
            <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] font-sans tabular-nums">
              {formatNumber(entry.value as number)}
            </span>
          </div>
        ))}
        {point?.ci_lower !== undefined && point?.ci_upper !== undefined && (
          <div className="pt-1.5 mt-1 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between gap-3 text-[11px]">
            <span className="text-[#52525b] dark:text-[#a1a1aa]">95% CI:</span>
            <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9] tabular-nums">
              [{formatNumber(point.ci_lower)} – {formatNumber(point.ci_upper)}]
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Metric card ────────────────────────────────────────────────────────

interface OutcomeCardProps {
  label: string;
  displayValue: string;
  tone: 'neutral' | 'positive' | 'warning' | 'negative';
  icon: React.ElementType;
  trend?: 'up' | 'down' | null;
  subtitle?: string;
}

function OutcomeCard({ label, displayValue, tone, icon: Icon, trend, subtitle }: OutcomeCardProps) {
  const toneClasses = {
    neutral: 'bg-white dark:bg-[#111113] border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9]',
    positive: 'bg-[#dcfce7]/55 dark:bg-[#14532d]/30 border-[#bbf7d0] dark:border-[#166534]/60 text-[#166534] dark:text-[#4ade80]',
    warning: 'bg-[#fffbeb] dark:bg-amber-950/30 border-[#fde68a] dark:border-amber-800/50 text-[#92400e] dark:text-amber-300',
    negative: 'bg-[#fee2e2]/65 dark:bg-[#7f1d1d]/30 border-[#fecaca] dark:border-[#991b1b]/60 text-[#991b1b] dark:text-[#fca5a5]',
  }[tone];

  return (
    <div className={cn('rounded-[14px] border p-3.5 transition-colors', toneClasses)}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] opacity-80">
            {label}
          </span>
        </div>
        {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />}
        {trend === 'down' && <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </div>
      <p className="text-xl sm:text-2xl font-bold font-sans tabular-nums tracking-tight leading-tight">
        {displayValue}
      </p>
      {subtitle && (
        <p className="text-[11px] font-medium opacity-80 mt-1 leading-snug">{subtitle}</p>
      )}
    </div>
  );
}

function formatReadableAssumptions(params: Record<string, number>) {
  const items: { label: string; value: string }[] = [];
  if (params.marketing_spend_pct !== undefined) {
    const v = params.marketing_spend_pct;
    items.push({ label: 'Marketing', value: `${v > 0 ? '+' : ''}${v.toFixed(0)}%` });
  }
  if (params.price_change_pct !== undefined) {
    const v = params.price_change_pct;
    items.push({ label: 'Price', value: `${v > 0 ? '+' : ''}${v.toFixed(0)}%` });
  }
  if (params.lead_time_days !== undefined) {
    items.push({ label: 'Lead Time', value: `${params.lead_time_days.toFixed(0)}d` });
  }
  if (params.safety_stock_multiplier !== undefined) {
    items.push({ label: 'Safety Stock', value: `${params.safety_stock_multiplier.toFixed(2)}×` });
  }
  if (params.avg_unit_value !== undefined) {
    items.push({ label: 'Avg Unit Value', value: formatCurrency(params.avg_unit_value) });
  }
  return items;
}

// ── Main component ─────────────────────────────────────────────────────

interface Props {
  result: ScenarioResultDetail | null;
  isRunning: boolean;
  scenarioName?: string;
  hasUnsimulatedChanges?: boolean;
  failedError?: string | null;
}

export function ScenarioResultPanel({
  result,
  isRunning,
  scenarioName,
  hasUnsimulatedChanges = false,
  failedError = null,
}: Props) {
  const [showRawParams, setShowRawParams] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const chartData: Array<ScenarioChartPoint & { ciBand?: [number, number] }> = (() => {
    if (!result?.detail) return [];
    const { baseline, simulated } = result.detail;
    return baseline.map((b, i) => {
      const simVal = simulated[i]?.demand ?? b.demand;
      const lower = simulated[i]?.confidence_lower;
      const upper = simulated[i]?.confidence_upper;
      return {
        week: b.week,
        date: b.date,
        baseline: Math.round(b.demand),
        simulated: Math.round(simVal),
        ci_lower: lower,
        ci_upper: upper,
        ciBand: lower !== undefined && upper !== undefined ? [lower, upper] : undefined,
        variance: Math.round(simVal - b.demand),
      };
    });
  })();

  const hasDemandVariance = chartData.some((d) => Math.abs(d.simulated - d.baseline) >= 1);

  const summary = result?.detail?.summary;
  const modelInfo = result?.detail?.model_info;
  const recommendations = result?.detail?.recommendations ?? [];
  const paramsApplied = result?.detail?.params_applied;
  const readableAssumptions = paramsApplied ? formatReadableAssumptions(paramsApplied) : [];

  const effectiveError = failedError || result?.error;

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="wait">
        {/* Running state */}
        {isRunning && (
          <motion.div
            key="running"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="p-10 sm:p-12 flex flex-col items-center justify-center gap-3 text-center bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px]"
          >
            <div className="w-11 h-11 rounded-[12px] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 text-[#1e3fc8] dark:text-[#60a5fa] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Running Simulation Inference</p>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1">Applying ML model weights and computing trajectory delta…</p>
            </div>
          </motion.div>
        )}

        {/* Failed state */}
        {!isRunning && effectiveError && (
          <motion.div
            key="failed"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16 }}
            className="p-6 bg-white dark:bg-[#111113] border border-[#fecaca] dark:border-[#991b1b]/60 rounded-[16px] space-y-2"
          >
            <div className="flex items-center gap-2 text-[#991b1b] dark:text-[#fca5a5]">
              <XCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <h3 className="text-sm font-bold">Simulation Failed{scenarioName ? `: ${scenarioName}` : ''}</h3>
            </div>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
              {effectiveError}
            </p>
          </motion.div>
        )}

        {/* Empty state: Ready to Simulate */}
        {!isRunning && !effectiveError && !result && (
          <motion.div
            key="empty"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16 }}
            className="p-7 sm:p-9 flex flex-col items-center justify-center gap-4 text-center bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px]"
          >
            <div className="w-12 h-12 rounded-[12px] bg-[#0a0a0a] dark:bg-[#fafaf9] text-[#fafaf9] dark:text-[#0a0a0a] flex items-center justify-center" aria-hidden="true">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#eff6ff] dark:bg-[#1e3fc8]/20 text-[#1e3fc8] dark:text-[#93c5fd] border border-[#bfdbfe] dark:border-[#1e3fc8]/40 text-[11px] font-bold mb-2">
                Simulation Workspace Ready
              </span>
              <h3 className="text-lg font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                No Simulation Executed Yet
              </h3>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                Adjust assumptions in the <strong className="font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">Scenario Builder</strong> and click <strong className="font-semibold text-[#1e3fc8] dark:text-[#60a5fa]">Run Simulation</strong>, or select a completed scenario from history below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-lg pt-4 border-t border-[#e4e4e7] dark:border-[#27272a]">
              <div className="flex flex-col items-center p-2.5 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-center">
                <TrendingUp className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa] mb-1" />
                <span className="text-[11px] font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Forecast Delta</span>
                <span className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">Baseline vs simulated</span>
              </div>
              <div className="flex flex-col items-center p-2.5 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-center">
                <DollarSign className="w-4 h-4 text-[#16a34a] mb-1" />
                <span className="text-[11px] font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Revenue &amp; Stock</span>
                <span className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">Net inventory impact</span>
              </div>
              <div className="flex flex-col items-center p-2.5 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-center">
                <Zap className="w-4 h-4 text-[#f59e0b] mb-1" />
                <span className="text-[11px] font-bold text-[#0a0a0a] dark:text-[#fafaf9]">SHAP Drivers</span>
                <span className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">Feature attribution</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results populated */}
        {!isRunning && !effectiveError && result && (
          <motion.div
            key={`result-${result.id}`}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            {/* Unsimulated builder edits notice */}
            {hasUnsimulatedChanges && (
              <div className="px-4 py-2.5 rounded-[12px] bg-[#fffbeb] dark:bg-amber-950/30 border border-[#fde68a] dark:border-amber-800/50 text-xs font-medium text-[#92400e] dark:text-amber-300 flex items-center justify-between gap-2">
                <span>Builder assumptions have changed since this run. Click <strong>Run Simulation</strong> to evaluate your edits.</span>
              </div>
            )}

            {/* Title bar */}
            <div className="px-5 py-4 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px] flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase font-bold text-[#52525b] dark:text-[#a1a1aa] tracking-[0.06em]">
                  Last Completed Simulation
                </p>
                <p className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate">
                  {scenarioName || 'Scenario Run'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {modelInfo && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-[#52525b] dark:text-[#a1a1aa]">Model</p>
                    <span className="text-xs font-bold text-[#1e3fc8] dark:text-[#93c5fd] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 px-2.5 py-0.5 rounded-md border border-[#bfdbfe] dark:border-[#1e3fc8]/40">
                      {modelInfo.version_tag ?? modelInfo.source}
                    </span>
                  </div>
                )}
                {result.computation_seconds !== null && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] uppercase font-bold text-[#52525b] dark:text-[#a1a1aa]">Compute Time</p>
                    <p className="text-xs font-mono font-bold text-[#0a0a0a] dark:text-[#fafaf9] tabular-nums">
                      {result.computation_seconds?.toFixed(2)}s
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Completed</span>
                </div>
              </div>
            </div>

            {/* Outcome KPI grid */}
            {summary && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <OutcomeCard
                  label="Demand Δ"
                  displayValue={`${summary.demand_delta_pct > 0.05 ? '+' : ''}${summary.demand_delta_pct.toFixed(1)}%`}
                  tone={Math.abs(summary.demand_delta_pct) < 0.1 ? 'neutral' : summary.demand_delta_pct > 0 ? 'positive' : 'negative'}
                  trend={Math.abs(summary.demand_delta_pct) < 0.1 ? null : summary.demand_delta_pct > 0 ? 'up' : 'down'}
                  icon={TrendingUp}
                  subtitle={`${formatNumber(summary.baseline_demand)} → ${formatNumber(summary.simulated_demand)} units`}
                />

                <OutcomeCard
                  label="Revenue Δ"
                  displayValue={`${summary.revenue_impact > 0.01 ? '+' : summary.revenue_impact < -0.01 ? '-' : ''}${formatCurrency(Math.abs(summary.revenue_impact))}`}
                  tone={Math.abs(summary.revenue_impact) < 0.5 ? 'neutral' : summary.revenue_impact > 0 ? 'positive' : 'negative'}
                  trend={Math.abs(summary.revenue_impact) < 0.5 ? null : summary.revenue_impact > 0 ? 'up' : 'down'}
                  icon={DollarSign}
                  subtitle="vs baseline revenue"
                />

                <OutcomeCard
                  label="Inventory Δ"
                  displayValue={`${summary.inventory_impact > 0.05 ? '+' : ''}${formatNumber(summary.inventory_impact)} units`}
                  tone={Math.abs(summary.inventory_impact) < 0.1 ? 'neutral' : summary.inventory_impact > 0 ? 'positive' : 'negative'}
                  trend={Math.abs(summary.inventory_impact) < 0.1 ? null : summary.inventory_impact > 0 ? 'up' : 'down'}
                  icon={Package}
                  subtitle="net volume delta vs baseline"
                />

                {/* Stockout risk is an absolute share of forecast weeks (>P90 baseline threshold), NOT a +/- change */}
                <OutcomeCard
                  label="Stockout Risk"
                  displayValue={`${summary.stockout_risk_pct.toFixed(1)}%`}
                  tone={
                    summary.stockout_risk_pct > 30
                      ? 'negative'
                      : summary.stockout_risk_pct > 15
                        ? 'warning'
                        : 'neutral'
                  }
                  trend={null}
                  icon={AlertTriangle}
                  subtitle="Share of forecast weeks (>P90 threshold)"
                />
              </div>
            )}

            {/* Comparison chart */}
            {chartData.length > 0 && (
              <div className="p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px]">
                <div className="flex items-start justify-between pb-3 mb-4 border-b border-[#e4e4e7] dark:border-[#27272a] flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Forecast Comparison</h3>
                      {!hasDemandVariance && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fafaf9] dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a]">
                          No demand change from baseline
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5">
                      {hasDemandVariance
                        ? 'Baseline vs simulated demand trajectory with 95% confidence interval'
                        : 'Simulated demand matches baseline across all forecast weeks'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-[#52525b] dark:text-[#a1a1aa]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-4 border-t-[2px] border-dashed border-[#52525b] dark:border-[#a1a1aa]" aria-hidden="true" />
                      <span className="text-[#0a0a0a] dark:text-[#fafaf9]">Baseline</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-4 h-[2.5px] bg-[#1e3fc8] dark:bg-[#60a5fa] rounded-full" aria-hidden="true" />
                      <span className="text-[#1e3fc8] dark:text-[#60a5fa]">Simulated</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-2.5 rounded-[2px] bg-[#1e3fc8]/20 border border-[#3b82f6]/50" aria-hidden="true" />
                      <span className="text-[#0a0a0a] dark:text-[#fafaf9]">95% CI</span>
                    </span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="scenCiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e3fc8" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#1e3fc8" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(w) => `W${w}`}
                      tick={{ fontSize: 11, fill: 'var(--ds-text-muted)', fontWeight: 500 }}
                      axisLine={{ stroke: 'var(--ds-hairline)' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={16}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--ds-text-muted)', fontWeight: 500 }}
                      tickFormatter={(v) => formatNumber(v)}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="ciBand"
                      stroke="none"
                      fill="url(#scenCiGrad)"
                      fillOpacity={1}
                      name="95% CI"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="baseline"
                      stroke="var(--ds-text-muted, #52525b)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      name="Baseline"
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--ds-text-muted, #52525b)' }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="simulated"
                      stroke="#1e3fc8"
                      strokeWidth={2.5}
                      name="Simulated"
                      dot={false}
                      activeDot={{ r: 5, fill: '#1e3fc8', stroke: '#fff', strokeWidth: 1.5 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Weekly Variance: show chart when nonzero, concise 1-line note when 0 */}
                <div className="mt-4 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a]">
                  {hasDemandVariance ? (
                    <>
                      <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mb-2 font-bold uppercase tracking-[0.06em]">
                        Weekly Variance (Simulated − Baseline)
                      </p>
                      <ResponsiveContainer width="100%" height={64}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="scenVarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1e3fc8" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#1e3fc8" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <ReferenceLine y={0} stroke="var(--ds-border-strong)" strokeWidth={1} />
                          <XAxis dataKey="week" hide />
                          <YAxis hide />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="variance"
                            stroke="#1e3fc8"
                            strokeWidth={1.5}
                            fill="url(#scenVarGrad)"
                            name="Variance"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium">
                      Weekly Variance (Simulated − Baseline): <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">0 units</span> across all {chartData.length} forecast weeks.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px]">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Prescriptive Recommendations</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa] mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <p className="text-xs font-medium text-[#0a0a0a] dark:text-[#fafaf9] leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applied Assumptions Summary (readable + expandable raw values) */}
            {paramsApplied && readableAssumptions.length > 0 && (
              <div className="p-4 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px]">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
                    Applied Assumptions
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRawParams((prev) => !prev)}
                    aria-expanded={showRawParams}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] rounded"
                  >
                    <span>{showRawParams ? 'Hide raw parameters' : 'Raw parameters'}</span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform duration-150', showRawParams && 'rotate-180')} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {readableAssumptions.map((item) => (
                    <span
                      key={item.label}
                      className="text-xs px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa]"
                    >
                      {item.label}: <strong className="font-mono text-[#0a0a0a] dark:text-[#fafaf9]">{item.value}</strong>
                    </span>
                  ))}
                </div>

                {showRawParams && (
                  <div className="mt-3 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex flex-wrap gap-1.5">
                    {Object.entries(paramsApplied).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-[#f1f1f3] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa] font-mono"
                      >
                        {k}: <strong className="text-[#0a0a0a] dark:text-[#fafaf9]">{typeof v === 'number' ? v.toFixed(2) : v}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
