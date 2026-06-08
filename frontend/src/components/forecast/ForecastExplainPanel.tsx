/**
 * ForecastExplainPanel — Phase 5B Forecast Explainability
 *
 * Renders SHAP-based explanations for each forecast week:
 *   • Week selector tabs
 *   • Horizontal contribution bar chart (green = positive, red = negative)
 *   • Top Positive / Top Negative driver cards
 *   • Prediction breakdown footer: base_value + contributions = prediction
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

// ── Sub-components ─────────────────────────────────────────────────

function ShapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card p-3 !bg-surface-900/95 !border-surface-700/80 shadow-2xl min-w-[180px]">
      <p className="text-xs font-semibold text-surface-200 mb-1">{d.label}</p>
      <p className="text-xs text-surface-400 mb-0.5">
        Feature value: <span className="text-surface-200 font-medium">{
          typeof d.featureValue === 'number'
            ? (Number.isInteger(d.featureValue) ? d.featureValue : d.featureValue.toFixed(0))
            : '—'
        }</span>
      </p>
      <p className={cn('text-xs font-semibold', d.value >= 0 ? 'text-accent-400' : 'text-danger-400')}>
        SHAP: {d.value >= 0 ? '+' : ''}{formatNumber(d.value)}
      </p>
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
      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition',
      isPos
        ? 'bg-accent-500/8 border-accent-500/20 hover:border-accent-500/40'
        : 'bg-danger-500/8 border-danger-500/20 hover:border-danger-500/40'
    )}>
      <span className={cn(
        'flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center',
        isPos ? 'bg-accent-500/20 text-accent-400' : 'bg-danger-500/20 text-danger-400'
      )}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-200 truncate">{featureLabel(driver.feature)}</p>
        <p className="text-[10px] text-surface-500">{driver.feature}</p>
      </div>
      <span className={cn('text-xs font-bold flex-shrink-0', isPos ? 'text-accent-400' : 'text-danger-400')}>
        {isPos ? '+' : ''}{formatNumber(driver.value)}
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
        'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
        selected
          ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-sm shadow-primary-500/20'
          : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/60 border border-transparent'
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
  featureNames,
}: {
  baseValue: number;
  shapValues: Record<string, number>;
  prediction: number;
  featureNames: string[];
}) {
  const total = Object.values(shapValues).reduce((a, b) => a + b, 0);
  const computedPred = baseValue + total;
  const diff = Math.abs(computedPred - prediction);
  const pctOff = prediction !== 0 ? (diff / Math.abs(prediction)) * 100 : 0;

  return (
    <div className="mt-4 p-3 rounded-xl bg-surface-800/30 border border-surface-700/30">
      <p className="text-xs font-semibold text-surface-400 mb-2.5 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" /> Prediction Breakdown
      </p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="px-2 py-1 rounded-md bg-surface-700/50 text-surface-300">
          Base: <span className="font-bold text-surface-100">{formatNumber(baseValue)}</span>
        </span>
        <span className="text-surface-600">+</span>
        {featureNames.map(f => {
          const v = shapValues[f] ?? 0;
          if (Math.abs(v) < 1) return null;
          return (
            <span key={f} className={cn(
              'px-2 py-1 rounded-md font-medium',
              v >= 0 ? 'bg-accent-500/15 text-accent-300' : 'bg-danger-500/15 text-danger-300'
            )}>
              {featureLabel(f)}: {v >= 0 ? '+' : ''}{formatNumber(v)}
            </span>
          );
        })}
        <span className="text-surface-600">=</span>
        <span className="px-2 py-1 rounded-md bg-primary-500/15 text-primary-300 font-bold">
          {formatNumber(computedPred)}
        </span>
        {pctOff > 2 && (
          <span className="text-[10px] text-surface-500 ml-1">
            (±{pctOff.toFixed(1)}% vs seasonal-adjusted {formatNumber(prediction)})
          </span>
        )}
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
  featureNames,
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
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-surface-200">Forecast Explainability</h3>
        </div>
        <div className="h-48 flex flex-col items-center justify-center gap-3 text-surface-500">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          <p className="text-xs animate-pulse">Building SHAP explainer...</p>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────
  if (error || !explainerReady || weeks.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-surface-200">Forecast Explainability</h3>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-warning-500/8 border border-warning-500/20">
          <AlertCircle className="w-4 h-4 text-warning-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-warning-300">Explainer unavailable</p>
            <p className="text-xs text-surface-400 mt-0.5">
              {error ?? 'SHAP explanations could not be generated for this dataset. Try retraining the model.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card p-5"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-semibold text-surface-200">Forecast Explainability</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/15 text-primary-400 font-medium border border-primary-500/20">
              SHAP
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-0.5">
            Why did the model predict this? Feature contributions per forecast week.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-surface-600">{modelType}</p>
          <p className="text-[10px] text-surface-600 truncate max-w-[140px]">{dataSource}</p>
        </div>
      </div>

      {/* ── Week Selector ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 no-scrollbar">
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
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── Week summary bar ─────────────────────────────────── */}
            <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-surface-800/20 border border-surface-700/20">
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">Week {weekData.week}</p>
                <p className="text-xs font-medium text-surface-300">{weekData.date}</p>
              </div>
              <div className="h-8 w-px bg-surface-700/50" />
              <div>
                <p className="text-[10px] text-surface-500">Prediction</p>
                <p className="text-sm font-bold text-primary-300">{formatNumber(weekData.prediction)}</p>
              </div>
              <div className="h-8 w-px bg-surface-700/50" />
              <div>
                <p className="text-[10px] text-surface-500">Base Value</p>
                <p className="text-sm font-bold text-surface-200">{formatNumber(weekData.base_value ?? 0)}</p>
              </div>
              <div className="h-8 w-px bg-surface-700/50" />
              <div>
                <p className="text-[10px] text-surface-500">SHAP Total</p>
                <p className={cn('text-sm font-bold', totalShap(weekData) >= 0 ? 'text-accent-400' : 'text-danger-400')}>
                  {totalShap(weekData) >= 0 ? '+' : ''}{formatNumber(totalShap(weekData))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* ── SHAP Bar Chart ──────────────────────────────────── */}
              <div className="lg:col-span-2">
                <p className="text-xs font-semibold text-surface-400 mb-2">
                  Feature Contributions
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(63,63,70,0.25)" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => formatNumber(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={110}
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ShapTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <ReferenceLine x={0} stroke="rgba(161,161,170,0.3)" strokeWidth={1} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.value >= 0
                              ? 'rgba(52, 211, 153, 0.75)'
                              : 'rgba(248, 113, 113, 0.75)'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Driver Panels ───────────────────────────────────── */}
              <div className="space-y-3">
                {positiveDrivers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-accent-400 flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5" /> Top Drivers (↑)
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
                    <p className="text-xs font-semibold text-danger-400 flex items-center gap-1.5 mb-2">
                      <TrendingDown className="w-3.5 h-3.5" /> Top Suppressors (↓)
                    </p>
                    <div className="space-y-1.5">
                      {negativeDrivers.map((d, i) => (
                        <DriverChip key={d.feature} driver={d} rank={i + 1} />
                      ))}
                    </div>
                  </div>
                )}
                {positiveDrivers.length === 0 && negativeDrivers.length === 0 && (
                  <div className="text-xs text-surface-500 p-3 rounded-xl bg-surface-800/20">
                    No significant drivers for this week.
                  </div>
                )}
              </div>
            </div>

            {/* ── Prediction Breakdown ─────────────────────────────── */}
            {weekData.base_value !== null && (
              <PredictionBreakdown
                baseValue={weekData.base_value}
                shapValues={weekData.shap_values}
                prediction={weekData.prediction}
                featureNames={featureNames}
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
