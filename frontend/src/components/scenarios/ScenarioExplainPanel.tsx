/**
 * ScenarioExplainPanel — Phase 5C
 *
 * Delta-SHAP explainability panel for What-If scenario results.
 *
 * Layout:
 *   1. Aggregate Driver Summary  — horizontal bar chart of mean delta per feature (all weeks)
 *   2. Per-Week Drill-Down       — week tabs (W1–W12 by default; "Show All" toggle)
 *                                  + delta-SHAP bar chart + top drivers/suppressors cards
 *
 * All aggregates are pre-computed by the backend (driver_summary).
 * The frontend does zero math.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import scenarioApi, { type ScenarioExplainResponse, type ScenarioWeekExplanation, type ScenarioDriverSummaryItem } from '@/services/scenarioApi';

// ── Feature display helpers ──────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  lag_1:  'Lag 1 (prior week demand)',
  lag_4:  'Lag 4 (4-week-ago demand)',
  week:   'Week of year',
  month:  'Month',
  year:   'Year trend',
};

function featureLabel(name: string): string {
  return FEATURE_LABELS[name] ?? name;
}

function fmtDelta(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v >= 0 ? '+' : ''}${(v / 1000).toFixed(1)}k`;
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Single horizontal bar for the aggregate driver summary. */
function DriverBar({ item, maxAbs }: { item: ScenarioDriverSummaryItem; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.abs(item.mean_delta) / maxAbs : 0;
  const isPos = item.direction === 'positive';
  const barWidth = `${Math.max(pct * 100, 2)}%`;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-surface-400 w-36 flex-shrink-0 truncate" title={featureLabel(item.feature)}>
        {featureLabel(item.feature)}
      </span>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 h-5 bg-surface-800/60 rounded-md overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: barWidth }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-md ${
              isPos
                ? 'bg-gradient-to-r from-emerald-600/80 to-emerald-400/90'
                : 'bg-gradient-to-r from-rose-600/80 to-rose-400/90'
            }`}
          />
        </div>
        <span className={`text-xs font-mono font-semibold w-16 text-right flex-shrink-0 ${
          isPos ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {fmtDelta(item.mean_delta)}
        </span>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {item.weeks_positive > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">
            ↑{item.weeks_positive}w
          </span>
        )}
        {item.weeks_negative > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/40 text-rose-400 border border-rose-800/40">
            ↓{item.weeks_negative}w
          </span>
        )}
      </div>
    </div>
  );
}

/** Per-week delta SHAP bar (used inside the drill-down tab). */
function WeekDeltaBar({ feature, delta, maxAbs }: { feature: string; delta: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.abs(delta) / maxAbs : 0;
  const isPos = delta >= 0;
  const barWidth = `${Math.max(pct * 100, 1.5)}%`;

  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="text-xs text-surface-400 w-32 flex-shrink-0 truncate" title={featureLabel(feature)}>
        {featureLabel(feature)}
      </span>
      <div className="flex-1 h-4 bg-surface-800/60 rounded overflow-hidden relative">
        <motion.div
          key={`${feature}-${delta}`}
          initial={{ width: 0 }}
          animate={{ width: barWidth }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={`h-full rounded ${
            isPos
              ? 'bg-gradient-to-r from-emerald-600/70 to-emerald-400/80'
              : 'bg-gradient-to-r from-rose-600/70 to-rose-400/80'
          }`}
        />
      </div>
      <span className={`text-xs font-mono w-14 text-right flex-shrink-0 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
        {fmtDelta(delta)}
      </span>
    </div>
  );
}

/** Week drill-down panel for a single selected week. */
function WeekDrilldown({ week }: { week: ScenarioWeekExplanation }) {
  const deltas = Object.values(week.delta_shap);
  const maxAbs = deltas.length > 0 ? Math.max(...deltas.map(Math.abs)) : 1;

  const drivers    = week.week_drivers.filter(d => d.direction === 'positive').slice(0, 3);
  const suppressors = week.week_drivers.filter(d => d.direction === 'negative').slice(0, 3);

  const modelDelta = week.simulated_prediction - week.baseline_prediction;

  return (
    <div className="space-y-4">
      {/* Model output line */}
      <div className="flex items-center gap-4 px-3 py-2 rounded-xl bg-surface-800/40 border border-surface-700/30">
        <div className="text-center">
          <p className="text-[10px] text-surface-500 uppercase tracking-wide">Baseline output</p>
          <p className="text-sm font-bold text-surface-200">{week.baseline_prediction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className={`flex-1 text-center text-sm font-bold ${modelDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {fmtDelta(modelDelta)} units
        </div>
        <div className="text-center">
          <p className="text-[10px] text-surface-500 uppercase tracking-wide">Simulated output</p>
          <p className="text-sm font-bold text-surface-200">{week.simulated_prediction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Delta SHAP bars */}
      <div>
        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">
          Feature Δ (Simulated − Baseline SHAP)
        </p>
        <div className="space-y-0.5">
          {Object.entries(week.delta_shap)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .map(([feat, delta]) => (
              <WeekDeltaBar key={feat} feature={feat} delta={delta} maxAbs={maxAbs} />
            ))}
        </div>
      </div>

      {/* Drivers / Suppressors */}
      {(drivers.length > 0 || suppressors.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {drivers.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-900/20 border border-emerald-800/30">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Top Drivers ↑</span>
              </div>
              {drivers.map(d => (
                <div key={d.feature} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-surface-300">{featureLabel(d.feature)}</span>
                  <span className="text-xs font-mono text-emerald-400">{fmtDelta(d.delta)}</span>
                </div>
              ))}
            </div>
          )}
          {suppressors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-900/20 border border-rose-800/30">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wide">Suppressors ↓</span>
              </div>
              {suppressors.map(d => (
                <div key={d.feature} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-surface-300">{featureLabel(d.feature)}</span>
                  <span className="text-xs font-mono text-rose-400">{fmtDelta(d.delta)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SHAP math annotation */}
      <p className="text-[10px] text-surface-600 italic">
        SHAP base value: {week.base_value?.toFixed(2)} — each feature's delta shows its marginal contribution to the demand shift.
      </p>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function ExplainSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-4 bg-surface-800 rounded w-1/3" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 bg-surface-800 rounded w-28" />
          <div className={`h-5 bg-surface-800 rounded`} style={{ width: `${20 + i * 12}%` }} />
          <div className="h-3 bg-surface-800 rounded w-10" />
        </div>
      ))}
      <div className="h-px bg-surface-800/60 my-2" />
      <div className="flex gap-2">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-7 w-10 bg-surface-800 rounded-lg" />)}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface Props {
  scenarioId: number;
  horizonWeeks: number;
}

const DEFAULT_WEEK_DISPLAY = 12;

export function ScenarioExplainPanel({ scenarioId, horizonWeeks }: Props) {
  const [data, setData]       = useState<ScenarioExplainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const fetchExplain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await scenarioApi.getExplain(scenarioId);
      setData(res);
      setSelectedWeek(1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to load explainability data';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    fetchExplain();
  }, [fetchExplain]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-2xl bg-surface-900/60 backdrop-blur-sm border border-surface-800/50 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-800/40">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-surface-200">Scenario Explainability</span>
          <Loader2 className="w-3.5 h-3.5 text-surface-500 animate-spin ml-auto" />
        </div>
        <ExplainSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-surface-900/60 backdrop-blur-sm border border-surface-800/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-surface-200">Scenario Explainability</span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-surface-800/40 border border-surface-700/30">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-surface-400">{error ?? 'Explainability data unavailable'}</p>
        </div>
      </div>
    );
  }

  if (!data.explainer_ready) {
    return (
      <div className="rounded-2xl bg-surface-900/60 backdrop-blur-sm border border-surface-800/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-surface-200">Scenario Explainability</span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-900/20 border border-amber-800/30">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-300">SHAP explanation unavailable</p>
            <p className="text-xs text-surface-400 mt-0.5">{data.reason ?? 'The model explainer could not be built for this scenario.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { weeks = [], driver_summary = [] } = data;
  const maxAbsDelta = driver_summary.length > 0 ? Math.max(...driver_summary.map(d => d.mean_abs_delta)) : 1;

  // Week tabs: default W1–W12, "Show All" reveals the rest
  const displayWeeks = showAll ? weeks : weeks.slice(0, DEFAULT_WEEK_DISPLAY);
  const hasMore = weeks.length > DEFAULT_WEEK_DISPLAY;
  const selectedWeekData = weeks.find(w => w.week === selectedWeek) ?? weeks[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl bg-surface-900/60 backdrop-blur-sm border border-surface-800/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-surface-800/40">
        <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-surface-100">Scenario Explainability</p>
          <p className="text-[10px] text-surface-500">Why did this scenario change demand?</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 border border-violet-800/40 font-medium">
            SHAP · {weeks.length}w
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* ── Section 1: Aggregate Driver Summary ── */}
        <div>
          <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-3">
            Aggregate Impact (Mean Δ across all {weeks.length} weeks)
          </p>
          <div className="space-y-0.5">
            {driver_summary.map(item => (
              <DriverBar key={item.feature} item={item} maxAbs={maxAbsDelta} />
            ))}
          </div>
          <p className="text-[10px] text-surface-600 mt-2 italic">
            ↑ positive = simulation raised this feature's contribution vs baseline.
            Weeks positive/negative shown in badges.
          </p>
        </div>

        <div className="h-px bg-surface-800/50" />

        {/* ── Section 2: Per-Week Drill-Down ── */}
        <div>
          <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-3">
            Per-Week Drill-Down
          </p>

          {/* Week tab pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {displayWeeks.map(w => (
              <button
                key={w.week}
                id={`scenario-explain-week-${w.week}`}
                onClick={() => setSelectedWeek(w.week)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-150 ${
                  selectedWeek === w.week
                    ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40 shadow-sm shadow-violet-500/10'
                    : 'bg-surface-800/50 text-surface-400 border border-surface-700/40 hover:bg-surface-700/50 hover:text-surface-200'
                }`}
              >
                W{w.week}
              </button>
            ))}

            {/* Show All toggle */}
            {hasMore && (
              <button
                id="scenario-explain-show-all"
                onClick={() => setShowAll(prev => !prev)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg
                           bg-surface-800/30 text-surface-500 border border-surface-700/30
                           hover:bg-surface-700/40 hover:text-surface-300 transition-all duration-150"
              >
                {showAll ? (
                  <><ChevronUp className="w-3 h-3" /> Show less</>
                ) : (
                  <><ChevronDown className="w-3 h-3" /> +{weeks.length - DEFAULT_WEEK_DISPLAY} more</>
                )}
              </button>
            )}
          </div>

          {/* Selected week detail */}
          <AnimatePresence mode="wait">
            {selectedWeekData && (
              <motion.div
                key={selectedWeek}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-surface-200">
                    Week {selectedWeekData.week}
                    <span className="ml-2 text-surface-500 font-normal">{selectedWeekData.date}</span>
                  </p>
                </div>
                <WeekDrilldown week={selectedWeekData} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}

export default ScenarioExplainPanel;
