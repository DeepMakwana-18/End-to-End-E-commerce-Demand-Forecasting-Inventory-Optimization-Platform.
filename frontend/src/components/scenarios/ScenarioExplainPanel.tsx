/**
 * ScenarioExplainPanel — Delta-SHAP explainability panel for What-If scenario results.
 *
 * • Light and dark Titan AI surfaces & high-contrast typography
 * • Honest compact neutral state when all SHAP deltas are 0.00 (never labels 0.0 as a positive driver)
 * • Progressive disclosure for per-week breakdown when unchanged
 * • Keyboard-accessible W1–W12 tabs (role="tablist" / arrow keys) + reduced-motion support
 */

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import scenarioApi, { type ScenarioExplainResponse, type ScenarioWeekExplanation, type ScenarioDriverSummaryItem } from '@/services/scenarioApi';

// ── Feature display helpers ──────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  lag_1:  'Last Week Demand',
  lag_4:  '4-Week Demand',
  week:   'Week of Year',
  month:  'Month of Year',
  year:   'Year Trend',
};

function featureLabel(name: string): string {
  return FEATURE_LABELS[name] ?? name;
}

function fmtDelta(v: number): string {
  if (Math.abs(v) < 0.005) return '0.00';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v >= 0 ? '+' : ''}${(v / 1000).toFixed(1)}k`;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DriverBar({ item, maxAbs }: { item: ScenarioDriverSummaryItem; maxAbs: number }) {
  const isNeutral = Math.abs(item.mean_delta) < 0.005;
  const pct = maxAbs > 0 ? Math.abs(item.mean_delta) / maxAbs : 0;
  const isPos = item.mean_delta > 0;
  const barWidth = isNeutral ? '0%' : `${Math.max(pct * 100, 2)}%`;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium w-36 flex-shrink-0 truncate" title={featureLabel(item.feature)}>
        {featureLabel(item.feature)}
      </span>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 h-4 bg-[#f1f1f3] dark:bg-[#18181b] rounded-md overflow-hidden relative border border-[#e4e4e7] dark:border-[#27272a]">
          {!isNeutral && (
            <div
              className={cn(
                'h-full rounded-md transition-all duration-200',
                isPos ? 'bg-[#059669] dark:bg-emerald-500' : 'bg-[#DC2626] dark:bg-rose-500'
              )}
              style={{ width: barWidth }}
            />
          )}
        </div>
        <span className={cn(
          'text-xs font-mono tabular-nums font-bold w-16 text-right flex-shrink-0',
          isNeutral
            ? 'text-[#52525b] dark:text-[#a1a1aa]'
            : isPos
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
        )}>
          {fmtDelta(item.mean_delta)}
        </span>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {item.weeks_positive > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50 font-semibold">
            ↑{item.weeks_positive}w
          </span>
        )}
        {item.weeks_negative > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50 font-semibold">
            ↓{item.weeks_negative}w
          </span>
        )}
      </div>
    </div>
  );
}

function WeekDeltaBar({ feature, delta, maxAbs }: { feature: string; delta: number; maxAbs: number }) {
  const isNeutral = Math.abs(delta) < 0.005;
  const pct = maxAbs > 0 ? Math.abs(delta) / maxAbs : 0;
  const isPos = delta > 0;
  const barWidth = isNeutral ? '0%' : `${Math.max(pct * 100, 2)}%`;

  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium w-32 flex-shrink-0 truncate" title={featureLabel(feature)}>
        {featureLabel(feature)}
      </span>
      <div className="flex-1 h-3.5 bg-[#f1f1f3] dark:bg-[#18181b] rounded overflow-hidden relative border border-[#e4e4e7] dark:border-[#27272a]">
        {!isNeutral && (
          <div
            className={cn(
              'h-full rounded transition-all duration-200',
              isPos ? 'bg-[#059669] dark:bg-emerald-500' : 'bg-[#DC2626] dark:bg-rose-500'
            )}
            style={{ width: barWidth }}
          />
        )}
      </div>
      <span className={cn(
        'text-xs font-mono tabular-nums font-bold w-14 text-right flex-shrink-0',
        isNeutral
          ? 'text-[#52525b] dark:text-[#a1a1aa]'
          : isPos
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-rose-700 dark:text-rose-400'
      )}>
        {fmtDelta(delta)}
      </span>
    </div>
  );
}

function WeekDrilldown({ week }: { week: ScenarioWeekExplanation }) {
  const deltas = Object.values(week.delta_shap);
  const maxAbs = deltas.length > 0 ? Math.max(...deltas.map(Math.abs), 0.01) : 1;
  const hasWeekDelta = deltas.some((d) => Math.abs(d) >= 0.005);

  const drivers = week.week_drivers.filter(d => d.delta >= 0.005).slice(0, 3);
  const suppressors = week.week_drivers.filter(d => d.delta <= -0.005).slice(0, 3);

  const modelDelta = week.simulated_prediction - week.baseline_prediction;

  return (
    <div className="space-y-4">
      {/* Model output line */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2.5 rounded-[10px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a]">
        <div className="text-center">
          <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-wide">Baseline Output</p>
          <p className="text-sm font-bold font-mono text-[#0a0a0a] dark:text-[#fafaf9] tabular-nums">
            {week.baseline_prediction.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </p>
        </div>
        <div className={cn(
          'text-center flex flex-col justify-center text-sm font-bold font-mono tabular-nums',
          Math.abs(modelDelta) < 0.05
            ? 'text-[#52525b] dark:text-[#a1a1aa]'
            : modelDelta > 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
        )}>
          <span>{fmtDelta(modelDelta)} units</span>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-wide">Simulated Output</p>
          <p className="text-sm font-bold font-mono text-[#1e3fc8] dark:text-[#60a5fa] tabular-nums">
            {week.simulated_prediction.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </p>
        </div>
      </div>

      {hasWeekDelta ? (
        <>
          <div>
            <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-2">
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

          {(drivers.length > 0 || suppressors.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {drivers.length > 0 && (
                <div className="p-3 rounded-[10px] bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-800/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Top Drivers ↑</span>
                  </div>
                  {drivers.map(d => (
                    <div key={d.feature} className="flex items-center justify-between py-0.5">
                      <span className="text-xs font-medium text-[#0a0a0a] dark:text-[#fafaf9]">{featureLabel(d.feature)}</span>
                      <span className="text-xs font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{fmtDelta(d.delta)}</span>
                    </div>
                  ))}
                </div>
              )}
              {suppressors.length > 0 && (
                <div className="p-3 rounded-[10px] bg-[#FFF1F2] dark:bg-rose-950/40 border border-[#FECDD3] dark:border-rose-800/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">Suppressors ↓</span>
                  </div>
                  {suppressors.map(d => (
                    <div key={d.feature} className="flex items-center justify-between py-0.5">
                      <span className="text-xs font-medium text-[#0a0a0a] dark:text-[#fafaf9]">{featureLabel(d.feature)}</span>
                      <span className="text-xs font-mono font-bold tabular-nums text-rose-700 dark:text-rose-400">{fmtDelta(d.delta)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium">
          All feature SHAP deltas are <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">0.00</span> for Week {week.week}.
        </p>
      )}

      <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
        SHAP base value: <span className="font-mono font-semibold">{week.base_value?.toFixed(2)}</span>
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface Props {
  scenarioId: number;
  horizonWeeks: number;
}

const DEFAULT_WEEK_DISPLAY = 12;

export function ScenarioExplainPanel({ scenarioId }: Props) {
  const [data, setData] = useState<ScenarioExplainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [showZeroDrilldown, setShowZeroDrilldown] = useState(false);
  const tabRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let isMounted = true;
    scenarioApi.getExplain(scenarioId)
      .then(({ data: res }) => {
        if (!isMounted) return;
        setData(res);
        setError(null);
        setSelectedWeek(1);
        setShowZeroDrilldown(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          ?? 'Failed to load explainability data';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [scenarioId]);

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number, weeksList: ScenarioWeekExplanation[]) => {
    if (!weeksList.length) return;
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % weeksList.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + weeksList.length) % weeksList.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = weeksList.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const targetWeek = weeksList[nextIndex].week;
      setSelectedWeek(targetWeek);
      tabRefs.current[targetWeek]?.focus();
    }
  };

  if (loading) {
    return (
      <div className="rounded-[16px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
          <span className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Scenario Explainability (SHAP)</span>
          <Loader2 className="w-3.5 h-3.5 text-[#52525b] dark:text-[#a1a1aa] animate-spin ml-auto" />
        </div>
        <p className="text-xs text-[#52525b] dark:text-[#a1a1aa]">Computing baseline vs simulated SHAP attributions...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[16px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
          <span className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Scenario Explainability (SHAP)</span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
          <AlertCircle className="w-4 h-4 text-[#d97706] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa]">{error ?? 'Explainability data unavailable'}</p>
        </div>
      </div>
    );
  }

  if (!data.explainer_ready) {
    return (
      <div className="rounded-[16px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
          <span className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Scenario Explainability (SHAP)</span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-[12px] bg-[#fffbeb] dark:bg-amber-950/30 border border-[#fde68a] dark:border-amber-800/50">
          <AlertCircle className="w-4 h-4 text-[#d97706] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-[#92400e] dark:text-amber-300">SHAP explanation unavailable</p>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5">{data.reason ?? 'The model explainer could not be built for this scenario.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { weeks = [], driver_summary = [] } = data;
  const maxAbsDelta = driver_summary.length > 0 ? Math.max(...driver_summary.map(d => d.mean_abs_delta), 0.01) : 1;
  const hasNonZeroExplain =
    driver_summary.some((d) => Math.abs(d.mean_abs_delta) >= 0.005 || Math.abs(d.mean_delta) >= 0.005) ||
    weeks.some((w) => Object.values(w.delta_shap ?? {}).some((v) => Math.abs(v) >= 0.005));

  const displayWeeks = showAll ? weeks : weeks.slice(0, DEFAULT_WEEK_DISPLAY);
  const hasMore = weeks.length > DEFAULT_WEEK_DISPLAY;
  const selectedWeekData = weeks.find(w => w.week === selectedWeek) ?? weeks[0];

  return (
    <section
      aria-label="Scenario Explainability"
      className="rounded-[16px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Scenario Explainability (SHAP)</h3>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5">
            Feature contribution shift relative to baseline forecast
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40 font-semibold">
          SHAP · {weeks.length}w
        </span>
      </div>

      <div className="p-5 space-y-5">
        {!hasNonZeroExplain ? (
          /* Honest compact neutral state when all SHAP deltas are 0.00 */
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
              <Info className="w-4 h-4 text-[#52525b] dark:text-[#a1a1aa] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs">
                <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                  No measurable feature contribution change from baseline
                </p>
                <p className="text-[#52525b] dark:text-[#a1a1aa] mt-1 leading-relaxed">
                  All feature SHAP deltas across the {weeks.length}-week horizon are <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">0.00</span> because the simulated inputs did not shift tree-based demand predictions away from baseline.
                </p>
              </div>
            </div>

            {weeks.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowZeroDrilldown((prev) => !prev)}
                  aria-expanded={showZeroDrilldown}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3fc8] dark:text-[#60a5fa] hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] rounded"
                >
                  {showZeroDrilldown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showZeroDrilldown ? 'Hide per-week details' : `Inspect per-week details (${weeks.length} weeks)`}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Aggregate Driver Summary for nonzero scenarios */
          <div>
            <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-3">
              Aggregate Impact (Mean Δ across {weeks.length} weeks)
            </p>
            <div className="space-y-0.5">
              {driver_summary.map(item => (
                <DriverBar key={item.feature} item={item} maxAbs={maxAbsDelta} />
              ))}
            </div>
            <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-2">
              Positive values indicate features that raised simulated demand relative to baseline.
            </p>
          </div>
        )}

        {/* Per-Week Drill-Down (always shown when nonzero, progressive disclosure when all-zero) */}
        {(hasNonZeroExplain || showZeroDrilldown) && weeks.length > 0 && (
          <div className="pt-4 border-t border-[#e4e4e7] dark:border-[#27272a]">
            <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-3">
              Per-Week Drill-Down
            </p>

            <div
              role="tablist"
              aria-label="Scenario explainability weeks"
              className="flex flex-wrap gap-1.5 mb-4"
            >
              {displayWeeks.map((w, idx) => {
                const selected = selectedWeek === w.week;
                return (
                  <button
                    key={w.week}
                    ref={(el) => { tabRefs.current[w.week] = el; }}
                    id={`scenario-explain-week-${w.week}`}
                    role="tab"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setSelectedWeek(w.week)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx, displayWeeks)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-[8px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                      selected
                        ? 'bg-[#0a0a0a] text-[#fafaf9] dark:bg-[#fafaf9] dark:text-[#0a0a0a] border border-[#0a0a0a] dark:border-[#fafaf9]'
                        : 'bg-[#fafaf9] dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9]'
                    )}
                  >
                    W{w.week}
                  </button>
                );
              })}

              {hasMore && (
                <button
                  id="scenario-explain-show-all"
                  type="button"
                  onClick={() => setShowAll(prev => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] cursor-pointer"
                >
                  {showAll ? (
                    <><ChevronUp className="w-3 h-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> +{weeks.length - DEFAULT_WEEK_DISPLAY} more</>
                  )}
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {selectedWeekData && (
                <motion.div
                  key={selectedWeek}
                  role="tabpanel"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
                  className="p-4 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                      Week {selectedWeekData.week}
                      <span className="ml-2 text-[#52525b] dark:text-[#a1a1aa] font-medium">{selectedWeekData.date}</span>
                    </p>
                  </div>
                  <WeekDrilldown week={selectedWeekData} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

export default ScenarioExplainPanel;
