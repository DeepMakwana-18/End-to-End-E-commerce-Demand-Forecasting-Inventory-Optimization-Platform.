/**
 * ForecastExplainPanel — Forecast Explainability (SHAP)
 *
 * Renders SHAP-based explanations for each forecast week:
 *   • Keyboard-accessible W1–W12 selector (role="tablist" with arrow navigation)
 *   • Clear hierarchy: Week & Date + Prediction → Baseline & Adjustments → Feature Contributions → Additive Attribution
 *   • Honest neutral state when all feature contributions are 0.00 (never labels zero values as positive drivers)
 *   • Compact vertical rhythm, readable model/dataset identifiers, and reduced-motion support
 */

import { useState, useMemo, useRef, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Zap, TrendingUp, TrendingDown, Info, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
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
  if (Math.abs(val) < 0.005) return '0.00';
  const abs = Math.abs(val);
  if (abs >= 100) return val.toFixed(1);
  return val.toFixed(2);
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Sub-components ─────────────────────────────────────────────────

interface ShapChartPoint {
  feature: string;
  label: string;
  value: number;
  featureValue?: number;
}

function ShapTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ShapChartPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="titan-chart-tooltip rounded-[12px] p-3 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs z-50 min-w-[190px]">
      <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1 pb-1 border-b border-[#e4e4e7] dark:border-[#27272a]">
        {d.label}
      </p>
      <div className="space-y-1 mt-1.5">
        <div className="flex items-center justify-between text-[#52525b] dark:text-[#a1a1aa]">
          <span>Feature value:</span>
          <span className="font-semibold text-[#0a0a0a] dark:text-[#fafaf9] tabular-nums">
            {typeof d.featureValue === 'number'
              ? (Number.isInteger(d.featureValue) ? d.featureValue : d.featureValue.toFixed(2))
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#e4e4e7] dark:border-[#27272a]">
          <span className="text-[#52525b] dark:text-[#a1a1aa]">SHAP impact:</span>
          <span className={cn(
            'font-bold font-mono tabular-nums',
            d.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          )}>
            {d.value >= 0 ? '+' : ''}{formatShap(d.value)} units
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
  const isPos = driver.value > 0;
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-[12px] border',
      isPos
        ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500/30'
        : 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3] dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-500/30'
    )}>
      <span className={cn(
        'flex-shrink-0 w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center font-mono',
        isPos ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
      )}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate text-[#0a0a0a] dark:text-[#fafaf9]">{featureLabel(driver.feature)}</p>
        <p className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] font-mono">{driver.feature}</p>
      </div>
      <span className={cn('text-xs font-mono font-bold flex-shrink-0 tabular-nums', isPos ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
        {isPos ? '+' : ''}{formatShap(driver.value)}
      </span>
    </div>
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
  const [open, setOpen] = useState(false);
  const hasAdj = seasonalAdjustment !== undefined && Math.abs(seasonalAdjustment) >= 0.005;
  const shapSum = Object.values(shapValues).reduce((a, b) => a + b, 0);
  const exactSum = baseValue + shapSum + (seasonalAdjustment ?? 0);
  const hasRoundingDiff = Math.abs(Math.round(exactSum) - Math.round(prediction)) >= 0.5 || Math.abs(exactSum - prediction) >= 0.05;

  return (
    <div className="mt-4 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] rounded-[12px]"
      >
        <span className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
          <span>Additive Prediction Attribution</span>
        </span>
        <span className="flex items-center gap-2 text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
          <span className="hidden sm:inline font-mono tabular-nums">
            {formatShap(baseValue)} + {formatShap(shapSum)} {hasAdj ? `${seasonalAdjustment! >= 0 ? '+' : ''} ${formatShap(seasonalAdjustment!)}` : ''} ≈ {formatNumber(prediction)}
          </span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-150', open && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[#e4e4e7] dark:border-[#27272a] space-y-2.5">
          <p className="text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
            Base Value + ∑ Feature SHAP {hasAdj ? '+ Seasonal Factor' : ''} = Final Output
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-[10px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa] font-mono tabular-nums">
              Base: <strong className="text-[#0a0a0a] dark:text-[#fafaf9]">{formatShap(baseValue)}</strong>
            </span>

            <span className="text-[#52525b] dark:text-[#a1a1aa] font-bold font-mono">+</span>

            {Object.entries(shapValues).map(([feat, val]) => {
              const isNeutral = Math.abs(val) < 0.005;
              return (
                <span
                  key={feat}
                  className={cn(
                    'px-2.5 py-1 rounded-[10px] font-medium font-mono border tabular-nums',
                    isNeutral
                      ? 'bg-white dark:bg-[#111113] text-[#52525b] dark:text-[#a1a1aa] border-[#e4e4e7] dark:border-[#27272a]'
                      : val > 0
                        ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500/30'
                        : 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3] dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-500/30'
                  )}
                >
                  {featureLabel(feat)}: {val > 0 ? '+' : ''}{formatShap(val)}
                </span>
              );
            })}

            {hasAdj && (
              <>
                <span className="text-[#52525b] dark:text-[#a1a1aa] font-bold font-mono">+</span>
                <span className="px-2.5 py-1 rounded-[10px] bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40 font-medium font-mono tabular-nums">
                  Seasonal Factor: {seasonalAdjustment! >= 0 ? '+' : ''}{formatShap(seasonalAdjustment!)}
                </span>
              </>
            )}

            <span className="text-[#52525b] dark:text-[#a1a1aa] font-bold font-mono">=</span>

            <span className="px-3 py-1 rounded-[10px] bg-[#0a0a0a] text-[#fafaf9] dark:bg-[#fafaf9] dark:text-[#0a0a0a] font-bold font-mono tabular-nums">
              Prediction: {formatNumber(prediction)}
            </span>
          </div>

          {hasRoundingDiff && (
            <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
              Note: Component values are displayed with 2-decimal precision; the final prediction ({formatNumber(prediction)}) reflects full-precision addition ({exactSum.toFixed(2)}).
            </p>
          )}
        </div>
      )}
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
  const tabRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const prefersReducedMotion = useReducedMotion();

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

  // Filter strictly for meaningful non-zero contributions so 0.00 features are never labeled as Positive Drivers
  const positiveDrivers = useMemo(
    () => (weekData?.top_drivers ?? []).filter(d => d.value >= 0.005).slice(0, 3),
    [weekData]
  );
  const negativeDrivers = useMemo(
    () => (weekData?.top_drivers ?? []).filter(d => d.value <= -0.005).slice(0, 3),
    [weekData]
  );

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!weeks.length) return;
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % weeks.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + weeks.length) % weeks.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = weeks.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const targetWeek = weeks[nextIndex].week;
      setSelectedWeek(targetWeek);
      tabRefs.current[targetWeek]?.focus();
    }
  };

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Forecast Explainability (SHAP)</h3>
        </div>
        <div className="h-36 flex flex-col items-center justify-center gap-2.5 text-[#52525b] dark:text-[#a1a1aa]">
          <Loader2 className="w-5 h-5 animate-spin text-[#1e3fc8] dark:text-[#60a5fa]" />
          <p className="text-xs font-medium">Computing Shapley feature attributions...</p>
        </div>
      </div>
    );
  }

  // ── Error / unavailable state ───────────────────────────────────
  if (error || !explainerReady || weeks.length === 0) {
    return (
      <div className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Forecast Explainability</h3>
        </div>
        <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-[#fffbeb] dark:bg-amber-950/30 border border-[#fde68a] dark:border-amber-900/40">
          <AlertCircle className="w-4 h-4 text-[#d97706] dark:text-[#fbbf24] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-[#92400e] dark:text-amber-300">SHAP Explainer Unavailable</p>
            <p className="text-xs text-[#92400e]/80 dark:text-amber-400/80 mt-0.5">
              {error ?? 'SHAP explanations could not be generated for this dataset. Retrain the model on the ML Pipeline page to refresh background explainers.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const shapTotal = weekData ? totalShap(weekData) : 0;
  const hasSeasonal = weekData?.seasonal_adjustment !== undefined && Math.abs(weekData.seasonal_adjustment) >= 0.005;

  return (
    <section
      aria-label="Forecast Explainability"
      className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 sm:px-6 border-b border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
              Forecast Explainability (SHAP)
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40">
              TreeExplainer
            </span>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
            Marginal feature contributions per forecast horizon week
          </p>
        </div>

        <div className="sm:text-right min-w-0">
          <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] break-words">
            {modelType || 'HistGradientBoosting'}
          </p>
          <p
            title={dataSource || 'Active Dataset'}
            className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium truncate max-w-full sm:max-w-[260px]"
          >
            {dataSource || 'Active Dataset'}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* ── Week Selector (W1–W12) ────────────────────────────────── */}
        <div
          role="tablist"
          aria-label="Forecast horizon weeks"
          className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-thin"
        >
          {weeks.map((w, idx) => {
            const selected = selectedWeek === w.week;
            return (
              <button
                key={w.week}
                ref={(el) => { tabRefs.current[w.week] = el; }}
                id={`shap-week-tab-${w.week}`}
                role="tab"
                aria-selected={selected}
                aria-controls="shap-week-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setSelectedWeek(w.week)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={cn(
                  'flex-shrink-0 px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                  selected
                    ? 'bg-[#0a0a0a] text-[#fafaf9] border border-[#0a0a0a] dark:bg-[#1e3fc8]/25 dark:text-[#fafaf9] dark:border-[#60a5fa]'
                    : 'text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]'
                )}
              >
                W{w.week}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {weekData && (
            <motion.div
              key={selectedWeek}
              id="shap-week-panel"
              role="tabpanel"
              aria-labelledby={`shap-week-tab-${weekData.week}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -2 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* ── 1. Selected Week + Predicted Value ───────────────── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] mb-4">
                <div>
                  <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                    Selected Horizon Week
                  </p>
                  <p className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9] mt-0.5">
                    Week {weekData.week} <span className="font-medium text-[#52525b] dark:text-[#a1a1aa]">· {formatDateShort(weekData.date)}</span>
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                    Predicted Demand
                  </p>
                  <p className="text-2xl font-bold font-sans tabular-nums text-[#1e3fc8] dark:text-[#60a5fa] leading-tight mt-0.5">
                    {formatNumber(weekData.prediction)} <span className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa]">units</span>
                  </p>
                </div>
              </div>

              {/* ── 2. Baseline, Adjustments & Feature Contributions ── */}
              {hasNonZeroShap ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="p-3.5 rounded-[12px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113]">
                      <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                        Model Base Value
                      </p>
                      <p className="text-sm font-bold font-mono text-[#0a0a0a] dark:text-[#fafaf9] mt-1 tabular-nums">
                        {formatShap(weekData.base_value ?? 0)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-[12px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113]">
                      <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                        SHAP Feature Total
                      </p>
                      <p className={cn(
                        'text-sm font-bold font-mono mt-1 tabular-nums',
                        Math.abs(shapTotal) < 0.005
                          ? 'text-[#52525b] dark:text-[#a1a1aa]'
                          : shapTotal > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {shapTotal >= 0.005 ? '+' : ''}{formatShap(shapTotal)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-[12px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113]">
                      <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                        Seasonal Factor
                      </p>
                      <p className={cn(
                        'text-sm font-bold font-mono mt-1 tabular-nums',
                        hasSeasonal ? 'text-[#1e3fc8] dark:text-[#60a5fa]' : 'text-[#52525b] dark:text-[#a1a1aa]'
                      )}>
                        {hasSeasonal
                          ? `${weekData.seasonal_adjustment! >= 0 ? '+' : ''}${formatShap(weekData.seasonal_adjustment!)}`
                          : '0.00 (None)'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                        <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                          Feature Contributions (Δ from Base Value)
                        </p>
                        <span className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium">
                          Green = Increases · Red = Decreases
                        </span>
                      </div>

                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
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
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                            {chartData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={entry.value >= 0 ? '#059669' : '#DC2626'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      {positiveDrivers.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-[#065F46] dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Top Positive Drivers
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
                            <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" /> Top Negative Suppressors
                          </p>
                          <div className="space-y-1.5">
                            {negativeDrivers.map((d, i) => (
                              <DriverChip key={d.feature} driver={d} rank={i + 1} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[12px] border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#52525b] dark:text-[#a1a1aa] flex-shrink-0" aria-hidden="true" />
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                        Neutral Feature Attribution (0.00 across all features)
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                      <span className="text-[#52525b] dark:text-[#a1a1aa]">
                        Base: <strong className="text-[#0a0a0a] dark:text-[#fafaf9]">{formatShap(weekData.base_value ?? 0)}</strong>
                      </span>
                      <span className="text-[#52525b] dark:text-[#a1a1aa]">
                        Seasonal: <strong className={hasSeasonal ? 'text-[#1e3fc8] dark:text-[#60a5fa]' : 'text-[#0a0a0a] dark:text-[#fafaf9]'}>
                          {hasSeasonal ? `${weekData.seasonal_adjustment! >= 0 ? '+' : ''}${formatShap(weekData.seasonal_adjustment!)}` : '0.00'}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
                    Week {weekData.week} matches the model’s expected baseline ({formatShap(weekData.base_value ?? 0)})
                    {hasSeasonal ? ` with a ${weekData.seasonal_adjustment! >= 0 ? '+' : ''}${formatShap(weekData.seasonal_adjustment!)} seasonal adjustment` : ''}.
                    Expand attribution below to inspect individual feature inputs.
                  </p>
                </div>
              )}

              {/* ── 4. Optional Additive Attribution Breakdown ────────── */}
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
      </div>
    </section>
  );
}

// ── Utilities ──────────────────────────────────────────────────────

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function totalShap(w: ShapWeekExplanation): number {
  return Object.values(w.shap_values ?? {}).reduce((a, b) => a + b, 0);
}
