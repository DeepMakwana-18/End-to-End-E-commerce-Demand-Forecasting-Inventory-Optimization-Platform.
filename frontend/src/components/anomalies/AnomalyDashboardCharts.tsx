/**
 * AnomalyDashboardCharts
 * Section 3: Anomaly Breakdown Dashboard
 *  - Severity distribution chart (donut-style with light mode calibration)
 *  - Type distribution chart (bars with readable zero-value tracks)
 *  - Anomaly trend timeline (sparkline with zero-data differentiation)
 *  - Resolution status (clear progress and semantic cards)
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
    { label: 'Critical', count: summary.critical_count, color: '#EF4444', darkColor: '#F87171' },
    { label: 'Medium', count: summary.medium_count, color: '#F59E0B', darkColor: '#FBBF24' },
    { label: 'Low', count: summary.low_count, color: '#6366F1', darkColor: '#818CF8' },
  ];

  const total = summary.total_active || 1;
  const r = 36;
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
    <div className="rounded-2xl p-5 bg-white dark:bg-surface-900/60 border border-slate-200/90 dark:border-surface-700/30 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-surface-400">
          Severity Distribution
        </p>
        <span className="text-[10px] text-slate-400 dark:text-surface-500 font-medium">
          {isZeroActive ? (hasEvaluated ? 'Zero active' : 'Unscanned') : 'Active anomalies'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* SVG Donut */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
            {/* Background circle calibrated for Light & Dark mode */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-slate-100 dark:text-surface-700/50"
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
                  strokeLinecap="butt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              )
            ))}
          </svg>
          {isZeroActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {hasEvaluated ? (
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              ) : (
                <span className="text-xs font-mono font-bold text-slate-400">0</span>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {data.map((d) => (
            <div key={d.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600 dark:text-surface-400 truncate">{d.label}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-bold font-mono text-slate-900 dark:text-surface-200">{d.count}</span>
                <span className="text-[10px] text-slate-400 dark:text-surface-500 font-mono">
                  ({summary.total_active > 0 ? ((d.count / summary.total_active) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          ))}
          <div className="pt-1.5 mt-0.5 border-t border-slate-100 dark:border-surface-800/60 flex items-center justify-between">
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-surface-400">Total Active</span>
            <span className="text-xs font-bold font-mono text-slate-900 dark:text-surface-200">{summary.total_active}</span>
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
    { label: 'Demand Spikes', value: summary.demand_spikes, color: '#059669', bg: 'bg-emerald-50 dark:bg-accent-500/10', icon: TrendingUp },
    { label: 'Demand Drops', value: summary.demand_drops, color: '#E11D48', bg: 'bg-rose-50 dark:bg-danger-500/10', icon: TrendingDown },
    { label: 'Inventory Shocks', value: summary.inventory_shocks, color: '#D97706', bg: 'bg-amber-50 dark:bg-warning-500/10', icon: Package },
    { label: 'Forecast Misses', value: summary.forecast_misses, color: '#6366F1', bg: 'bg-indigo-50 dark:bg-primary-500/10', icon: BarChart2 },
  ];
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-surface-900/60 border border-slate-200/90 dark:border-surface-700/30 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-surface-400">
          Type Distribution
        </p>
        <span className="text-[10px] text-slate-400 dark:text-surface-500 font-medium">Categorized</span>
      </div>
      <div className="space-y-2">
        {items.map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 shadow-2xs', bg)}>
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1 leading-none">
                <span className="text-[11px] text-slate-600 dark:text-surface-400 font-medium">{label}</span>
                <span
                  className={cn(
                    'text-[11px] font-bold font-mono',
                    value === 0 ? 'text-slate-400 dark:text-surface-500' : ''
                  )}
                  style={value > 0 ? { color } : undefined}
                >
                  {value}
                </span>
              </div>
              {/* Visible progress track for all values including 0 */}
              <div className="h-1.5 bg-slate-100 dark:bg-surface-800/80 rounded-full overflow-hidden border border-slate-200/50 dark:border-surface-700/40">
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
        ))}
      </div>
    </div>
  );
}

// ── Anomaly Trend Timeline (sparkline) ───────────────────────────────

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
    const W = 280, H = 55;
    const toX = (i: number) => (i / (buckets - 1)) * W;
    const toY = (v: number) => H - (v / maxTotal) * (H - 8) - 4;

    const pathD = weekData.map((w, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(w.total).toFixed(1)}`).join(' ');
    const dataTotal = weekData.reduce((s, w) => s + w.total, 0);
    const dateRangeLabel = `${new Date(rangeStart).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} – ${new Date(rangeEnd).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`;

    return { weekData, W, H, toX, toY, pathD, dataTotal, dateRangeLabel, buckets };
  }, [anomalies]);

  const dateRangeLabel = timelineData
    ? timelineData.dateRangeLabel
    : hasEvaluated
      ? 'Baseline Scanned'
      : 'Awaiting Scan';

  const dataTotal = timelineData ? timelineData.dataTotal : 0;

  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-surface-900/60 border border-slate-200/90 dark:border-surface-700/30 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-surface-400">
            Anomaly Trend
          </p>
          <div className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-surface-400 font-medium">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Crit</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Med</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Low</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-surface-500 mb-2">
          {dateRangeLabel} · <span className="font-semibold text-slate-600 dark:text-surface-300">{dataTotal} events</span>
        </p>
      </div>

      {timelineData ? (
        <>
          {/* Timeline SVG */}
          <svg viewBox={`0 0 ${timelineData.W} ${timelineData.H}`} className="w-full h-14 overflow-visible" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0.33, 0.66, 1].map((f) => (
              <line key={f} x1="0" y1={timelineData.H * (1 - f)} x2={timelineData.W} y2={timelineData.H * (1 - f)}
                stroke="#E2E8F0" strokeWidth="0.75" strokeDasharray="3,3" />
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
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Points */}
            {timelineData.weekData.map((w, i) => (
              w.total > 0 && (
                <circle key={i} cx={timelineData.toX(i)} cy={timelineData.toY(w.total)} r="2.5"
                  fill={w.critical > 0 ? '#EF4444' : w.medium > 0 ? '#F59E0B' : '#6366F1'}
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
              )
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between mt-1 text-[9.5px] text-slate-400 dark:text-surface-500 font-mono">
            <span>{timelineData.weekData[0].weekLabel}</span>
            <span>{timelineData.weekData[timelineData.weekData.length - 1].weekLabel}</span>
          </div>
        </>
      ) : (
        <div className="py-4 px-2 rounded-xl bg-slate-50/80 dark:bg-surface-800/40 border border-slate-100 dark:border-surface-700/40 text-center my-auto">
          {hasEvaluated ? (
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <p className="text-xs font-semibold text-slate-700 dark:text-surface-200">Zero Anomalies in Window</p>
              <p className="text-[10px] text-slate-400">Baseline scan verified normal distribution</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-surface-300">Awaiting Scan Baseline</p>
              <p className="text-[10px] text-slate-400">Run Detection to populate trend timeline</p>
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
    <div className="rounded-2xl p-5 bg-white dark:bg-surface-900/60 border border-slate-200/90 dark:border-surface-700/30 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-surface-400">
            Resolution Status
          </p>
          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {resolutionRate != null ? `${resolutionRate.toFixed(0)}%` : '—'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 dark:bg-surface-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-surface-700/60 mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${resolutionRate ?? 0}%` }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="flex items-center gap-2.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-2.5 shadow-2xs">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300 uppercase font-semibold leading-none">Resolved</p>
            <p className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 leading-none">{resolved}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40 rounded-xl p-2.5 shadow-2xs">
          <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-rose-800/80 dark:text-rose-300 uppercase font-semibold leading-none">Active</p>
            <p className="text-base font-bold font-mono text-rose-700 dark:text-rose-400 mt-1 leading-none">{active}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-4 h-36 skeleton rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"
    >
      <SeverityDonut summary={summary} />
      <TypeDistributionChart summary={summary} />
      {isLoadingAnomalies ? (
        <div className="glass-card p-4 h-36 skeleton rounded-2xl" />
      ) : (
        <AnomalyTrendTimeline anomalies={anomalies} summary={summary} />
      )}
      <ResolutionTrend summary={summary} allCount={anomalies.length} />
    </motion.div>
  );
}

