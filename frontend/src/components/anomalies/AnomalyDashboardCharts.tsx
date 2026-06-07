/**
 * AnomalyDashboardCharts
 * Section 3: Anomaly Breakdown Dashboard
 *  - Severity distribution chart (donut-style)
 *  - Type distribution chart (bar)
 *  - Anomaly trend timeline (sparkline)
 *  - Resolution trend
 */

import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Package, BarChart2,
  Flame, AlertTriangle, Info, CheckCircle2, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalySummary, Anomaly } from '@/types/anomaly';

// ── Severity Donut ────────────────────────────────────────────────────

interface SeverityDonutProps {
  summary: AnomalySummary;
}

function SeverityDonut({ summary }: SeverityDonutProps) {
  const data = [
    { label: 'Critical', count: summary.critical_count, color: '#ef4444', darkColor: '#f87171' },
    { label: 'Medium', count: summary.medium_count, color: '#f59e0b', darkColor: '#fbbf24' },
    { label: 'Low', count: summary.low_count, color: '#6366f1', darkColor: '#818cf8' },
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
    <div className="glass-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-3">
        Severity Distribution
      </p>
      <div className="flex items-center gap-4">
        {/* SVG Donut */}
        <svg viewBox="0 0 100 100" className="w-20 h-20 flex-shrink-0 -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(63,63,70,0.5)" strokeWidth="12" />
          {segments.map((seg) => (
            seg.count > 0 && (
              <motion.circle
                key={seg.label}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={seg.darkColor}
                strokeWidth="12"
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

        {/* Legend */}
        <div className="flex flex-col gap-1.5 flex-1">
          {data.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.darkColor }} />
                <span className="text-xs text-surface-400">{d.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold font-mono text-surface-200">{d.count}</span>
                <span className="text-[9px] text-surface-600">
                  ({total > 0 ? ((d.count / total) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          ))}
          <div className="pt-1 border-t border-surface-800/50 flex items-center justify-between">
            <span className="text-[10px] text-surface-500">Total Active</span>
            <span className="text-xs font-bold font-mono text-surface-200">{summary.total_active}</span>
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
    { label: 'Demand Spikes', value: summary.demand_spikes, color: '#34d399', bg: 'bg-accent-500/10', icon: TrendingUp },
    { label: 'Demand Drops', value: summary.demand_drops, color: '#f87171', bg: 'bg-danger-500/10', icon: TrendingDown },
    { label: 'Inventory Shocks', value: summary.inventory_shocks, color: '#fbbf24', bg: 'bg-warning-500/10', icon: Package },
    { label: 'Forecast Misses', value: summary.forecast_misses, color: '#818cf8', bg: 'bg-primary-500/10', icon: BarChart2 },
  ];
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-3">
        Type Distribution
      </p>
      <div className="space-y-2.5">
        {items.map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', bg)}>
              <Icon className="w-3 h-3" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-surface-400">{label}</span>
                <span className="text-[10px] font-bold font-mono" style={{ color }}>{value}</span>
              </div>
              <div className="h-1.5 bg-surface-800/80 rounded-full overflow-hidden">
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
}

function AnomalyTrendTimeline({ anomalies }: TrendTimelineProps) {
  // Build week buckets from the anomalies' own date range, NOT from Date.now().
  // This ensures anomalies with historic event_dates always render correctly.
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const buckets = 16; // show up to 16 weeks of the actual data span

  // Determine the true date range from event_date (or detected_at as fallback)
  const timestamps = anomalies
    .map((a) => new Date(a.event_date ?? a.detected_at).getTime())
    .filter((t) => !isNaN(t));

  // If no data, default to last 16 weeks from now (shows empty chart rather than crashing)
  // Use reduce instead of Math.max(...spread) to avoid RangeError on very large arrays.
  const tsMax = timestamps.length > 0 ? timestamps.reduce((a, b) => Math.max(a, b)) : Date.now();
  const tsMin = timestamps.length > 0 ? timestamps.reduce((a, b) => Math.min(a, b)) : tsMax - buckets * msPerWeek;
  const rangeEnd = timestamps.length > 0 ? tsMax + msPerWeek : Date.now();
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
  const W = 280, H = 60;
  const toX = (i: number) => (i / (buckets - 1)) * W;
  const toY = (v: number) => H - (v / maxTotal) * H;

  const pathD = weekData.map((w, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(w.total).toFixed(1)}`).join(' ');
  const dataTotal = weekData.reduce((s, w) => s + w.total, 0);
  const dateRangeLabel = timestamps.length > 0
    ? `${new Date(rangeStart).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} – ${new Date(rangeEnd).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`
    : 'No data';

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">
          Anomaly Trend
        </p>
        <div className="flex items-center gap-2 text-[9px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger-400" />Critical</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning-400" />Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-400" />Low</span>
        </div>
      </div>
      <p className="text-[9px] text-surface-600 mb-2">{dateRangeLabel} · {dataTotal} events</p>

      {/* Timeline SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 overflow-visible" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" y1={H * (1 - f)} x2={W} y2={H * (1 - f)}
            stroke="rgba(63,63,70,0.3)" strokeWidth="0.5" strokeDasharray="3,3" />
        ))}

        {/* Fill area */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          d={`${pathD} L ${toX(buckets - 1)} ${H} L 0 ${H} Z`}
          fill="rgba(99,102,241,0.08)"
        />

        {/* Trend line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="rgba(99,102,241,0.7)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Points */}
        {weekData.map((w, i) => (
          w.total > 0 && (
            <circle key={i} cx={toX(i)} cy={toY(w.total)} r="2.5"
              fill={w.critical > 0 ? '#f87171' : w.medium > 0 ? '#fbbf24' : '#818cf8'}
              opacity="0.9"
            />
          )
        ))}
      </svg>

      {/* X-axis labels – first and last bucket */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-surface-600">{weekData[0].weekLabel}</span>
        <span className="text-[9px] text-surface-600">{weekData[weekData.length - 1].weekLabel}</span>
      </div>
    </div>
  );
}

// ── Resolution Trend ──────────────────────────────────────────────────
// Uses server-side summary counts (authoritative) rather than counting from
// the async-loaded anomaly list, which may not have finished loading yet.

interface ResolutionTrendProps {
  summary: AnomalySummary;
  allCount: number; // total anomalies in dataset (active + resolved)
}

function ResolutionTrend({ summary, allCount }: ResolutionTrendProps) {
  // summary.total_active is the server-authoritative active count
  const active = summary.total_active;
  // resolved = total in dataset minus active
  const resolved = Math.max(0, allCount - active);
  const total = allCount || 1;
  const resolutionRate = (resolved / total) * 100;

  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-3">
        Resolution Status
      </p>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-surface-400">Resolution Rate</span>
            <span className="text-xs font-bold font-mono text-accent-400">{resolutionRate.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${resolutionRate}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-surface-800/30 rounded-lg p-2">
          <CheckCircle2 className="w-4 h-4 text-accent-400 flex-shrink-0" />
          <div>
            <p className="text-[9px] text-surface-500 uppercase">Resolved</p>
            <p className="text-sm font-bold font-mono text-accent-400">{resolved}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-surface-800/30 rounded-lg p-2">
          <Activity className="w-4 h-4 text-danger-400 flex-shrink-0" />
          <div>
            <p className="text-[9px] text-surface-500 uppercase">Active</p>
            <p className="text-sm font-bold font-mono text-danger-400">{active}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Exports ───────────────────────────────────────────────────────────

interface DashboardChartsProps {
  summary: AnomalySummary | null;
  anomalies: Anomaly[]; // all anomalies (include_resolved=true) for trend chart
  isLoading: boolean;
  isLoadingAnomalies: boolean; // separate gate for anomaly list load
}

export function AnomalyDashboardCharts({ summary, anomalies, isLoading, isLoadingAnomalies }: DashboardChartsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-4 h-36 skeleton" />
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
      {/* Trend chart: waits for anomaly list — shows skeleton until ready */}
      {isLoadingAnomalies
        ? <div className="glass-card p-4 h-36 skeleton" />
        : <AnomalyTrendTimeline anomalies={anomalies} />
      }
      {/* Resolution: uses server-side summary counts (not async list) */}
      <ResolutionTrend summary={summary} allCount={anomalies.length} />
    </motion.div>
  );
}
