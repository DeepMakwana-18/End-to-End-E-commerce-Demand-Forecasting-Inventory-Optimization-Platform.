/**
 * ForecastExplainPanel — Phase 5B Forecast Explainability
 *
 * Renders SHAP-based explanations for each forecast week:
 *   • Week selector tabs with high-contrast active/idle states
 *   • Week summary metrics: Prediction, Base Value, SHAP Total, Seasonal Component
 *   • Horizontal contribution bar chart (green = positive, red = negative) with 2-decimal precision
 *   • Informative empty/neutral state if feature contributions are zero
 *   • Top Drivers and Suppressors chips
 *   • Additive prediction breakdown: Base Value + ∑ SHAP + Seasonal Adjustment = Prediction
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Zap, TrendingUp, TrendingDown, Info, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { ShapWeekExplanation } from '@/services/api';

// ── Feature display labels ─────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  lag_1: 'Last Week Demand',
  lag_4: '4-Week Demand',
  month: 'Month of Year',
  week: 'Week of Year',
  year: 'Year Trend',
};

function featureLabel(name: string): string {
  return FEATURE_LABELS[name] ?? name;
}

function formatShap(val: number): string {
  if (val === 0) return '0.00';
  const abs = Math.abs(val);
  if (abs >= 100) return val.toFixed(1);
  return val.toFixed(2);
}

// ── Sub-components ─────────────────────────────────────────────────

function ShapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl p-3 bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-md dark:shadow-ds-float-2 text-xs z-50 min-w-[190px]">
      <p className="font-bold text-slate-900 dark:text-ds-text-primary mb-1 pb-1 border-b border-slate-100 dark:border-ds-hairline">
        {d.label}
      </p>
      <div className="space-y-1 mt-1.5">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span>Feature value:</span>
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
            {typeof d.featureValue === 'number'
              ? (Number.isInteger(d.featureValue) ? d.featureValue : d.featureValue.toFixed(2))
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-ds-hairline">
          <span className="text-slate-600 dark:text-slate-300">SHAP impact:</span>
          <span className={cn(
            'font-bold font-mono tabular-nums',
            d.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          )}>
            {d.value >= 0 ? '+' : ''}{formatShap(d.value)}
          </span>
        </div>
      </div>
    </div>
  );
}

function DriverChip({ driver, rank }: {
  driver: { feature: string; value: number; direction: string };
  rank: number;
}) {
  const isPos = driver.direction === 'positive';
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-150 shadow-2xs',
      isPos
        ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30'
        : 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30'
    )}>
      <span className={cn(
        'flex-shrink-0 w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center font-mono shadow-2xs',
        isPos ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
      )}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate text-slate-900 dark:text-ds-text-primary">{featureLabel(driver.feature)}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{driver.feature}</p>
      </div>
      <span className={cn('text-xs font-mono font-bold flex-shrink-0 tabular-nums', isPos ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
        {isPos ? '+' : ''}{formatShap(driver.value)}
      </span>
    </div>
  );
}

function WeekTab({ week, selected, onClick }: {
  week: number; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      id={`shap-week-tab-${week}`}
      onClick={onClick}
      className={cn(
        'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer',
        selected
          ? 'bg-blue-600 text-white shadow-2xs dark:bg-blue-500'
          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100/80 dark:bg-ds-surface-sunken hover:bg-slate-200/70 border border-slate-200/80 dark:border-ds-hairline'
      )}
    >
      W{week}
    </button>
  );
}

function PredictionBreakdown({
  baseValue,
  shapValues,
  prediction,
  seasonalAdjustment,
}: {
  baseValue: number;
  shapValues: Record<string, number>;
  prediction: number;
  seasonalAdjustment?: number;
}) {
  const hasAdj = seasonalAdjustment !== undefined && Math.abs(seasonalAdjustment) >= 0.01;

  return (
    <div className="mt-5 p-4 rounded-2xl bg-slate-50/70 dark:bg-ds-surface-sunken/60 border border-slate-200/90 dark:border-ds-hairline shadow-2xs">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-xs font-bold text-slate-800 dark:text-ds-text-primary flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Additive Prediction Attribution</span>
        </p>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Base Value + ∑ Feature SHAP {hasAdj ? '+ Seasonal Factor' : ''} = Final Output
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-ds-surface border border-slate-200/80 dark:border-ds-hairline text-slate-700 dark:text-slate-300 font-mono shadow-2xs">
          Base Value: <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatShap(baseValue)}</span>
        </span>

        <span className="text-slate-400 dark:text-slate-500 font-bold font-mono">+</span>

        {/* Feature contribution chips */}
        {Object.entries(shapValues).map(([feat, val]) => (
          <span
            key={feat}
            className={cn(
              'px-2.5 py-1 rounded-xl font-medium font-mono border shadow-2xs tabular-nums',
              val >= 0
                ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30'
            )}
          >
            {featureLabel(feat)}: {val >= 0 ? '+' : ''}{formatShap(val)}
          </span>
        ))}

        {hasAdj && (
          <>
            <span className="text-slate-400 dark:text-slate-500 font-bold font-mono">+</span>
            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/30 font-medium font-mono shadow-2xs tabular-nums">
              Seasonal Factor: {seasonalAdjustment >= 0 ? '+' : ''}{formatShap(seasonalAdjustment)}
            </span>
          </>
        )}

        <span className="text-slate-400 dark:text-slate-500 font-bold font-mono">=</span>

        <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30 font-bold font-mono shadow-2xs tabular-nums">
          Final Prediction: {formatNumber(prediction)}
        </span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

interface ForecastExplainPanelProps {
  weeks: ShapWeekExplanation[];
  featureNames: string[];
  modelType: string;
  dataSource: string;
  explainerReady: boolean;
  isLoading: boolean;
  error?: string | null;
}

export function ForecastExplainPanel({
  weeks,
  modelType,
  dataSource,
  explainerReady,
  isLoading,
  error,
}: ForecastExplainPanelProps) {
  const [selectedWeek, setSelectedWeek] = useState(1);

  const weekData = useMemo(
    () => weeks.find(w => w.week === selectedWeek) ?? weeks[0] ?? null,
    [weeks, selectedWeek]
  );

  // Build chart data — sorted by absolute value descending
  const chartData = useMemo(() => {
    if (!weekData?.shap_values) return [];
    return Object.entries(weekData.shap_values)
      .map(([feature, value]) => ({
        feature,
        label: featureLabel(feature),
        value: round2(value),
        featureValue: weekData.feature_vector?.[feature],
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [weekData]);

  const hasNonZeroShap = useMemo(() => {
    return chartData.some(d => Math.abs(d.value) >= 0.005);
  }, [chartData]);

  const positiveDrivers = useMemo(
    () => weekData?.top_drivers?.filter(d => d.direction === 'positive').slice(0, 3) ?? [],
    [weekData]
  );
  const negativeDrivers = useMemo(
    () => weekData?.top_drivers?.filter(d => d.direction === 'negative').slice(0, 3) ?? [],
    [weekData]
  );

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/90 dark:border-ds-hairline bg-white dark:bg-ds-surface shadow-2xs p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary">Forecast Explainability (SHAP)</h3>
        </div>
        <div className="h-44 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-ds-text-muted">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-medium animate-pulse">Building TreeExplainer & computing Shapley vectors...</p>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────
  if (error || !explainerReady || weeks.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/90 dark:border-ds-hairline bg-white dark:bg-ds-surface shadow-2xs p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary">Forecast Explainability</h3>
        </div>
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">SHAP Explainer Unavailable</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {error ?? 'SHAP explanations could not be generated for this dataset. Retrain the model on the ML Pipeline page to refresh background explainers.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25, ease: [0.28, 0.11, 0.32, 1] }}
      className="rounded-2xl border border-slate-200/90 dark:border-ds-hairline bg-white dark:bg-ds-surface shadow-2xs p-5 sm:p-6"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs border border-blue-100 dark:border-blue-900/40">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
              Forecast Explainability (SHAP)
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#1D4ED8] border border-[#BFDBFE] shadow-2xs dark:bg-[#1E3553]/80 dark:text-[#93C5FD] dark:border-blue-500/30">
              TreeExplainer
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Decomposes predictive demand into additive marginal contributions per horizon week.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{modelType || 'HistGradientBoosting'}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] font-medium">{dataSource || 'Active Dataset'}</p>
        </div>
      </div>

      {/* ── Week Selector ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        {weeks.map(w => (
          <WeekTab
            key={w.week}
            week={w.week}
            selected={selectedWeek === w.week}
            onClick={() => setSelectedWeek(w.week)}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {weekData && (
          <motion.div
            key={selectedWeek}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
          >
            {/* ── Week summary bar ─────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-5 p-3.5 rounded-xl bg-slate-50/80 dark:bg-ds-surface-sunken/60 border border-slate-200/80 dark:border-ds-hairline shadow-2xs">
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horizon Week</p>
                <p className="text-sm font-bold text-slate-900 dark:text-ds-text-primary mt-0.5">W{weekData.week} ({weekData.date})</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base Value</p>
                <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
                  {formatShap(weekData.base_value ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SHAP Total</p>
                <p className={cn(
                  'text-sm font-bold font-mono mt-0.5 tabular-nums',
                  totalShap(weekData) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}>
                  {totalShap(weekData) >= 0 ? '+' : ''}{formatShap(totalShap(weekData))}
                </p>
              </div>
              {weekData.seasonal_adjustment !== undefined && Math.abs(weekData.seasonal_adjustment) >= 0.01 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Seasonal Factor</p>
                  <p className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
                    {weekData.seasonal_adjustment >= 0 ? '+' : ''}{formatShap(weekData.seasonal_adjustment)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prediction</p>
                <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                  {formatNumber(weekData.prediction)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* ── SHAP Bar Chart ──────────────────────────────────── */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-ds-text-primary">
                    Feature Contributions (Δ from Base Value)
                  </p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Green = Increases Demand, Red = Decreases Demand
                  </span>
                </div>

                {hasNonZeroShap ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--ds-hairline)" />
                      <XAxis
                        type="number"
                        tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => formatShap(v)}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={120}
                        tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ShapTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                      <ReferenceLine x={0} stroke="var(--ds-border-strong)" strokeWidth={1} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {chartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              entry.value >= 0
                                ? '#059669' // Emerald
                                : '#DC2626' // Red
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-ds-hairline bg-slate-50/50 dark:bg-ds-surface-sunken p-6 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-ds-blue-surface text-blue-600 dark:text-ds-blue flex items-center justify-center mb-2 shadow-2xs">
                      <Info className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-ds-text-primary">
                      Baseline Historical Equilibrium
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 max-w-sm font-medium">
                      Prediction for Week {weekData.week} matches the model's base expected value ({formatShap(weekData.base_value ?? 0)}). Individual feature deviations are balanced around zero.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Driver Panels ───────────────────────────────────── */}
              <div className="space-y-3">
                {positiveDrivers.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-[#065F46] dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5" /> Top Positive Drivers
                    </p>
                    <div className="space-y-1.5">
                      {positiveDrivers.map((d, i) => (
                        <DriverChip key={d.feature} driver={d} rank={i + 1} />
                      ))}
                    </div>
                  </div>
                )}
                {negativeDrivers.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-[#9F1239] dark:text-rose-400 flex items-center gap-1.5 mb-2">
                      <TrendingDown className="w-3.5 h-3.5" /> Top Negative Suppressors
                    </p>
                    <div className="space-y-1.5">
                      {negativeDrivers.map((d, i) => (
                        <DriverChip key={d.feature} driver={d} rank={i + 1} />
                      ))}
                    </div>
                  </div>
                )}
                {positiveDrivers.length === 0 && negativeDrivers.length === 0 && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 p-3.5 rounded-xl bg-slate-50 dark:bg-ds-surface-sunken border border-slate-200/80 dark:border-ds-hairline font-medium">
                    No significant feature deviations detected for this week.
                  </div>
                )}
              </div>
            </div>

            {/* ── Prediction Breakdown Footer ──────────────────────── */}
            {weekData.base_value !== null && (
              <PredictionBreakdown
                baseValue={weekData.base_value}
                shapValues={weekData.shap_values}
                prediction={weekData.prediction}
                seasonalAdjustment={weekData.seasonal_adjustment}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Utilities ──────────────────────────────────────────────────────

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function totalShap(w: ShapWeekExplanation): number {
  return Object.values(w.shap_values ?? {}).reduce((a, b) => a + b, 0);
}
