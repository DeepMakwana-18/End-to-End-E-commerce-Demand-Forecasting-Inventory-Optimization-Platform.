/**
 * AnomalyDashboardCharts — Section 3: Anomaly Analytics Dashboard
 * 2x2 Desktop Layout:
 *  - Row 1: Severity Distribution (spacious Donut) | Type Distribution (progress tracks)
 *  - Row 2: Anomaly Trend (wide timeline chart)     | Resolution Status (progress & metrics)
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Package, BarChart2,
  CheckCircle2, Activity, ShieldCheck, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalySummary, Anomaly } from '@/types/anomaly';

// ── Severity Donut ────────────────────────────────────────────────────

interface SeverityDonutProps {
  summary: AnomalySummary;
}

function SeverityDonut({ summary }: SeverityDonutProps) {
  const hasEvaluated = summary.latest_detected_at !== null;
  const isZeroActive = summary.total_active === 0;

  const data = [
    { label: 'Critical', count: summary.critical_count, color: '#EF4444', bg: 'bg-rose-500' },
    { label: 'Medium', count: summary.medium_count, color: '#F59E0B', bg: 'bg-amber-500' },
    { label: 'Low', count: summary.low_count, color: '#6366F1', bg: 'bg-indigo-500' },
  ];

  const total = summary.total_active || 1;
  const r = 38;
  const cx = 50;
  const cy = 50;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const segments = data.map((d) => {
    const pct = d.count / total;
    const seg = { ...d, pct, dashArray: `${pct * circ} ${circ}`, offset, strokeDashoffset: -(offset) };
    offset += pct * circ;
    return seg;
  });

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-ds-text-secondary">
            Severity Distribution
          </p>
          <p className="text-xs text-slate-400 dark:text-ds-text-muted mt-0.5">
            Breakdown across risk thresholds
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-ds-surface-sunken text-slate-600 dark:text-ds-text-muted font-semibold border border-slate-200/60 dark:border-ds-border">
          {isZeroActive ? (hasEvaluated ? 'Zero active' : 'Unscanned') : `${summary.total_active} active anomalies`}
        </span>
      </div>

      <div className="flex items-center gap-6 sm:gap-8 my-auto">
        {/* SVG Donut */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Background circle calibrated for Light & Dark mode */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-slate-100 dark:text-ds-surface-sunken"
              strokeWidth="11"
            />
            {summary.total_active > 0 && segments.map((seg) => (
              seg.count > 0 && (
                <motion.circle
                  key={seg.label}
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="11"
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                />
              )
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {isZeroActive ? (
              hasEvaluated ? (
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              ) : (
                <span className="text-sm font-mono font-bold text-slate-400">0</span>
              )
            ) : (
              <>
                <span className="text-xl sm:text-2xl font-black font-sans text-slate-900 dark:text-ds-text-heading leading-none">
                  {summary.total_active}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-ds-text-muted font-bold mt-0.5">
                  Total
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          {data.map((d) => {
            const pct = summary.total_active > 0 ? ((d.count / summary.total_active) * 100).toFixed(0) : '0';
            return (
              <div key={d.label} className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', d.bg)} />
                  <span className="text-slate-700 dark:text-ds-text-secondary font-medium truncate">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                  <span className="font-bold text-slate-900 dark:text-ds-text-heading">{d.count}</span>
                  <span className="text-[11px] text-slate-400 dark:text-ds-text-muted font-normal w-9 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
          <div className="pt-2 mt-1 border-t border-slate-100 dark:border-ds-border flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-ds-text-secondary">All Active</span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-ds-text-heading">{summary.total_active}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Type Distribution Bar Chart ───────────────────────────────────────

interface TypeChartProps {
  summary: AnomalySummary;
}

function TypeDistributionChart({ summary }: TypeChartProps) {
  const items = [
    { label: 'Demand Spikes', value: summary.demand_spikes, color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40', icon: TrendingUp },
    { label: 'Demand Drops', value: summary.demand_drops, color: '#E11D48', bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40', icon: TrendingDown },
    { label: 'Inventory Shocks', value: summary.inventory_shocks, color: '#D97706', bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40', icon: Package },
    { label: 'Forecast Misses', value: summary.forecast_misses, color: '#6366F1', bg: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40', icon: BarChart2 },
  ];
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  const total = summary.total_active || 1;

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-ds-text-secondary">
            Type Distribution
          </p>
          <p className="text-xs text-slate-400 dark:text-ds-text-muted mt-0.5">
            Active anomalies by business impact category
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-ds-surface-sunken text-slate-600 dark:text-ds-text-muted font-semibold border border-slate-200/60 dark:border-ds-border">
          4 Categories
        </span>
      </div>

      <div className="space-y-3 my-auto">
        {items.map(({ label, value, color, bg, icon: Icon }) => {
          const pct = summary.total_active > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={label} className="flex items-center gap-3">
              <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-2xs', bg)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1 leading-none">
                  <span className="text-xs text-slate-700 dark:text-ds-text-secondary font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 dark:text-ds-text-muted font-mono">{pct}%</span>
                    <span
                      className={cn(
                        'text-xs font-bold font-mono',
                        value === 0 ? 'text-slate-400 dark:text-ds-text-muted' : ''
                      )}
                      style={value > 0 ? { color } : undefined}
                    >
                      {value}
                    </span>
                  </div>
                </div>
                {/* Progress track */}
                <div className="h-2 bg-slate-100 dark:bg-ds-surface-sunken rounded-full overflow-hidden border border-slate-200/60 dark:border-ds-border">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(value / maxVal) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Anomaly Trend Timeline (wide chart) ──────────────────────────────

interface TrendTimelineProps {
  anomalies: Anomaly[];
  summary: AnomalySummary;
}

function AnomalyTrendTimeline({ anomalies, summary }: TrendTimelineProps) {
  const hasEvaluated = summary.latest_detected_at !== null;

  const timelineData = useMemo(() => {
    const timestamps = anomalies
      .map((a) => new Date(a.event_date ?? a.detected_at).getTime())
      .filter((t) => !isNaN(t));

    if (timestamps.length === 0) return null;

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const buckets = 16;
    const tsMax = timestamps.reduce((a, b) => Math.max(a, b));
    const tsMin = timestamps.reduce((a, b) => Math.min(a, b));
    const rangeEnd = tsMax + msPerWeek;
    const rangeStart = Math.min(tsMin, rangeEnd - buckets * msPerWeek);

    const totalMs = rangeEnd - rangeStart;
    const bucketMs = totalMs / buckets;

    const weekData = Array.from({ length: buckets }, (_, i) => {
      const weekStart = rangeStart + i * bucketMs;
      const weekEnd = weekStart + bucketMs;
      const weekly = anomalies.filter((a) => {
        const ts = new Date(a.event_date ?? a.detected_at).getTime();
        return ts >= weekStart && ts < weekEnd;
      });
      return {
        critical: weekly.filter((a) => a.severity === 'critical').length,
        medium: weekly.filter((a) => a.severity === 'medium').length,
        low: weekly.filter((a) => a.severity === 'low').length,
        total: weekly.length,
        weekLabel: new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });

    const maxTotal = Math.max(...weekData.map((w) => w.total), 1);
    const W = 560, H = 64;
    const toX = (i: number) => (i / (buckets - 1)) * W;
    const toY = (v: number) => H - (v / maxTotal) * (H - 12) - 6;

    const pathD = weekData.map((w, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(w.total).toFixed(1)}`).join(' ');
    const dataTotal = weekData.reduce((s, w) => s + w.total, 0);
    const dateRangeLabel = `${new Date(rangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(rangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return { weekData, W, H, toX, toY, pathD, dataTotal, dateRangeLabel, buckets };
  }, [anomalies]);

  const dateRangeLabel = timelineData
    ? timelineData.dateRangeLabel
    : hasEvaluated
      ? 'Baseline Scanned'
      : 'Awaiting Scan Baseline';

  const dataTotal = timelineData ? timelineData.dataTotal : 0;

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-ds-text-secondary">
            Anomaly Trend
          </p>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-ds-text-secondary font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Low</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-ds-text-muted mb-3">
          {dateRangeLabel} · <span className="font-semibold text-slate-700 dark:text-ds-text-heading">{dataTotal} events recorded</span>
        </p>
      </div>

      {timelineData ? (
        <div className="my-auto pt-2">
          {/* Timeline SVG */}
          <svg viewBox={`0 0 ${timelineData.W} ${timelineData.H}`} className="w-full h-16 sm:h-20 overflow-visible" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line
                key={f}
                x1="0"
                y1={timelineData.H * (1 - f)}
                x2={timelineData.W}
                y2={timelineData.H * (1 - f)}
                stroke="currentColor"
                className="text-slate-200/60 dark:text-ds-border"
                strokeWidth="0.75"
                strokeDasharray="4,4"
              />
            ))}

            {/* Fill area */}
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              d={`${timelineData.pathD} L ${timelineData.toX(timelineData.buckets - 1)} ${timelineData.H} L 0 ${timelineData.H} Z`}
              fill="rgba(99,102,241,0.08)"
            />

            {/* Trend line */}
            <motion.path
              d={timelineData.pathD}
              fill="none"
              stroke="#6366F1"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9 }}
            />

            {/* Points */}
            {timelineData.weekData.map((w, i) => (
              w.total > 0 && (
                <circle
                  key={i}
                  cx={timelineData.toX(i)}
                  cy={timelineData.toY(w.total)}
                  r="3.5"
                  fill={w.critical > 0 ? '#EF4444' : w.medium > 0 ? '#F59E0B' : '#6366F1'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-ds-text-muted font-mono">
            <span>{timelineData.weekData[0].weekLabel}</span>
            <span>{timelineData.weekData[Math.floor(timelineData.buckets / 2)].weekLabel}</span>
            <span>{timelineData.weekData[timelineData.weekData.length - 1].weekLabel}</span>
          </div>
        </div>
      ) : (
        <div className="py-6 px-4 rounded-xl bg-slate-50/80 dark:bg-ds-surface-sunken/40 border border-slate-100 dark:border-ds-border text-center my-auto">
          {hasEvaluated ? (
            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <p className="text-xs font-semibold text-slate-700 dark:text-ds-text-heading">Zero Anomalies in Window</p>
              <p className="text-[11px] text-slate-400 dark:text-ds-text-muted">Baseline scan verified normal distribution</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <HelpCircle className="w-6 h-6 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-ds-text-secondary">Awaiting Scan Baseline</p>
              <p className="text-[11px] text-slate-400 dark:text-ds-text-muted">Run Detection to populate trend timeline</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Resolution Status ─────────────────────────────────────────────────

interface ResolutionTrendProps {
  summary: AnomalySummary;
  allCount: number;
}

function ResolutionTrend({ summary, allCount }: ResolutionTrendProps) {
  const hasEvaluated = summary.latest_detected_at !== null || allCount > 0;
  const active = summary.total_active;
  const resolved = Math.max(0, allCount - active);
  const total = allCount || (active + resolved);
  
  const resolutionRate = total > 0 ? (resolved / total) * 100 : (hasEvaluated && active === 0 ? 100 : null);

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-ds-text-secondary">
              Resolution Status
            </p>
            <p className="text-xs text-slate-400 dark:text-ds-text-muted mt-0.5">
              Triage and investigation closure rate
            </p>
          </div>
          <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {resolutionRate != null ? `${resolutionRate.toFixed(0)}%` : '—'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-slate-100 dark:bg-ds-surface-sunken rounded-full overflow-hidden border border-slate-200/60 dark:border-ds-border mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${resolutionRate ?? 0}%` }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <div className="flex items-center gap-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300 uppercase font-bold leading-none">Resolved</p>
            <p className="text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-1 leading-none">{resolved}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40 rounded-xl p-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center flex-shrink-0 text-rose-600 dark:text-rose-400">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-rose-800/80 dark:text-rose-300 uppercase font-bold leading-none">Active</p>
            <p className="text-lg font-extrabold font-mono text-rose-700 dark:text-rose-400 mt-1 leading-none">{active}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Exports ───────────────────────────────────────────────────────────

interface DashboardChartsProps {
  summary: AnomalySummary | null;
  anomalies: Anomaly[];
  isLoading: boolean;
  isLoadingAnomalies: boolean;
}

export function AnomalyDashboardCharts({ summary, anomalies, isLoading, isLoadingAnomalies }: DashboardChartsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 h-48 skeleton rounded-2xl bg-slate-100 dark:bg-ds-surface-sunken" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      <SeverityDonut summary={summary} />
      <TypeDistributionChart summary={summary} />
      {isLoadingAnomalies ? (
        <div className="p-5 h-48 skeleton rounded-2xl bg-slate-100 dark:bg-ds-surface-sunken" />
      ) : (
        <AnomalyTrendTimeline anomalies={anomalies} summary={summary} />
      )}
      <ResolutionTrend summary={summary} allCount={anomalies.length} />
    </motion.div>
  );
}
