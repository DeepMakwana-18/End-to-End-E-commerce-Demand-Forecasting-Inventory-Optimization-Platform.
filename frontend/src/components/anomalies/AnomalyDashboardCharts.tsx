/**
 * AnomalyDashboardCharts — Section 3: Anomaly Analytics Dashboard
 * 2x2 Desktop Layout with Titan AI surfaces, high-contrast labels, and discrete weekly event bars.
 */

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Package, BarChart2,
  CheckCircle2, Activity, ShieldCheck, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalySummary, Anomaly } from '@/types/anomaly';

// ── Severity Donut ────────────────────────────────────────────────────

function SeverityDonut({ summary }: { summary: AnomalySummary }) {
  const hasEvaluated = summary.latest_detected_at !== null;
  const isZeroActive = summary.total_active === 0;

  const data = [
    { label: 'Critical', count: summary.critical_count, color: '#EF4444', bg: 'bg-rose-500' },
    { label: 'Medium', count: summary.medium_count, color: '#F59E0B', bg: 'bg-amber-500' },
    { label: 'Low', count: summary.low_count, color: '#1e3fc8', bg: 'bg-[#1e3fc8]' },
  ];

  const total = summary.total_active || 1;
  const r = 38;
  const cx = 50;
  const cy = 50;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const segments = data.map((d) => {
    const pct = d.count / total;
    const seg = { ...d, pct, dashArray: `${pct * circ} ${circ}`, offset, strokeDashoffset: -offset };
    offset += pct * circ;
    return seg;
  });

  return (
    <div className="rounded-[16px] p-5 sm:p-6 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Severity Distribution
          </p>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
            Breakdown across risk thresholds
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] font-semibold border border-[#e4e4e7] dark:border-[#27272a]">
          {isZeroActive ? (hasEvaluated ? 'Zero active' : 'Unscanned') : `${summary.total_active} active`}
        </span>
      </div>

      <div className="flex items-center gap-6 sm:gap-8 my-auto">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-[#f1f1f3] dark:text-[#18181b]"
              strokeWidth="11"
            />
            {summary.total_active > 0 && segments.map((seg) => (
              seg.count > 0 && (
                <circle
                  key={seg.label}
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="11"
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                />
              )
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {isZeroActive ? (
              hasEvaluated ? (
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              ) : (
                <span className="text-sm font-mono font-bold text-[#52525b] dark:text-[#a1a1aa]">0</span>
              )
            ) : (
              <>
                <span className="text-xl sm:text-2xl font-extrabold font-sans text-[#0a0a0a] dark:text-[#fafaf9] leading-none">
                  {summary.total_active}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#52525b] dark:text-[#a1a1aa] font-bold mt-0.5">
                  Active
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          {data.map((d) => {
            const pct = summary.total_active > 0 ? ((d.count / summary.total_active) * 100).toFixed(0) : '0';
            return (
              <div key={d.label} className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', d.bg)} />
                  <span className="text-[#0a0a0a] dark:text-[#fafaf9] font-medium truncate">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 font-mono tabular-nums">
                  <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9]">{d.count}</span>
                  <span className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] w-9 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
          <div className="pt-2 mt-1 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa]">All Active</span>
            <span className="text-sm font-bold font-mono text-[#0a0a0a] dark:text-[#fafaf9]">{summary.total_active}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Type Distribution Bar Chart ───────────────────────────────────────

function TypeDistributionChart({ summary }: { summary: AnomalySummary }) {
  const items = [
    { label: 'Demand Spikes', value: summary.demand_spikes, color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40', icon: TrendingUp },
    { label: 'Demand Drops', value: summary.demand_drops, color: '#E11D48', bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40', icon: TrendingDown },
    { label: 'Inventory Shocks', value: summary.inventory_shocks, color: '#D97706', bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40', icon: Package },
    { label: 'Forecast Misses', value: summary.forecast_misses, color: '#1e3fc8', bg: 'bg-[#eff6ff] dark:bg-[#1e3fc8]/20 text-[#1e3fc8] dark:text-[#93c5fd] border-[#bfdbfe] dark:border-[#1e3fc8]/40', icon: BarChart2 },
  ];
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  const total = summary.total_active || 1;

  return (
    <div className="rounded-[16px] p-5 sm:p-6 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3.5 gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Type Distribution
          </p>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
            Active anomalies by impact category
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] font-semibold border border-[#e4e4e7] dark:border-[#27272a]">
          4 Categories
        </span>
      </div>

      <div className="space-y-3 my-auto">
        {items.map(({ label, value, color, bg, icon: Icon }) => {
          const pct = summary.total_active > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={label} className="flex items-center gap-3">
              <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 border', bg)} aria-hidden="true">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1 leading-none">
                  <span className="text-xs text-[#0a0a0a] dark:text-[#fafaf9] font-medium">{label}</span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">{pct}%</span>
                    <span className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">{value}</span>
                  </div>
                </div>
                <div className="h-2 bg-[#f1f1f3] dark:bg-[#18181b] rounded-full overflow-hidden border border-[#e4e4e7] dark:border-[#27272a]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(value / maxVal) * 100}%`, backgroundColor: color }}
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

// ── Discrete Event Trend Chart ────────────────────────────────────────

interface TrendBucket {
  weekLabel: string;
  rangeLabel: string;
  critical: number;
  medium: number;
  low: number;
  total: number;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TrendBucket }> }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  return (
    <div className="titan-chart-tooltip rounded-[12px] p-3 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs z-50 min-w-[170px]">
      <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] pb-1 mb-1.5 border-b border-[#e4e4e7] dark:border-[#27272a]">
        {b.rangeLabel}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[#52525b] dark:text-[#a1a1aa]">Events recorded:</span>
          <span className="font-bold font-mono text-[#0a0a0a] dark:text-[#fafaf9]">{b.total}</span>
        </div>
        {b.critical > 0 && (
          <div className="flex justify-between text-rose-700 dark:text-rose-400">
            <span>Critical:</span>
            <span className="font-bold font-mono">{b.critical}</span>
          </div>
        )}
        {b.medium > 0 && (
          <div className="flex justify-between text-amber-700 dark:text-amber-400">
            <span>Medium:</span>
            <span className="font-bold font-mono">{b.medium}</span>
          </div>
        )}
        {b.low > 0 && (
          <div className="flex justify-between text-[#1e3fc8] dark:text-[#60a5fa]">
            <span>Low:</span>
            <span className="font-bold font-mono">{b.low}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AnomalyTrendTimeline({ anomalies, summary }: { anomalies: Anomaly[]; summary: AnomalySummary }) {
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

    const weekData: TrendBucket[] = Array.from({ length: buckets }, (_, i) => {
      const weekStart = rangeStart + i * bucketMs;
      const weekEnd = weekStart + bucketMs;
      const weekly = anomalies.filter((a) => {
        const ts = new Date(a.event_date ?? a.detected_at).getTime();
        return ts >= weekStart && ts < weekEnd;
      });
      const startFmt = new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endFmt = new Date(weekEnd - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        critical: weekly.filter((a) => a.severity === 'critical').length,
        medium: weekly.filter((a) => a.severity === 'medium').length,
        low: weekly.filter((a) => a.severity === 'low').length,
        total: weekly.length,
        weekLabel: startFmt,
        rangeLabel: `${startFmt} – ${endFmt}`,
      };
    });

    const dataTotal = weekData.reduce((s, w) => s + w.total, 0);
    const dateRangeLabel = `${new Date(rangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(rangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return { weekData, dataTotal, dateRangeLabel };
  }, [anomalies]);

  const dateRangeLabel = timelineData
    ? timelineData.dateRangeLabel
    : hasEvaluated
      ? 'Baseline Scanned'
      : 'Awaiting Scan Baseline';

  const dataTotal = timelineData ? timelineData.dataTotal : 0;

  return (
    <div className="rounded-[16px] p-5 sm:p-6 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Anomaly Event Trend (Weekly Count)
          </p>
          <div className="flex items-center gap-3 text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1e3fc8]" />Low</span>
          </div>
        </div>
        <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mb-3 font-medium">
          {dateRangeLabel} · <span className="font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">{dataTotal} events recorded</span>
        </p>
      </div>

      {timelineData ? (
        <div className="my-auto pt-1">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={timelineData.weekData} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: 'var(--ds-text-muted)', fontSize: 10, fontWeight: 500 }}
                axisLine={{ stroke: 'var(--ds-hairline)' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--ds-text-muted)', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(30, 63, 200, 0.06)' }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                {timelineData.weekData.map((w, i) => (
                  <Cell
                    key={i}
                    fill={
                      w.total === 0
                        ? 'transparent'
                        : w.critical > 0
                          ? '#EF4444'
                          : w.medium > 0
                            ? '#F59E0B'
                            : '#1e3fc8'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-6 px-4 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-center my-auto">
          {hasEvaluated ? (
            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <p className="text-xs font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">Zero Anomalies in Window</p>
              <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">Baseline scan verified normal distribution</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <HelpCircle className="w-6 h-6 text-[#52525b] dark:text-[#a1a1aa]" />
              <p className="text-xs font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">Awaiting Scan Baseline</p>
              <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">Run Detection to populate trend</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Resolution Status ─────────────────────────────────────────────────

function ResolutionTrend({ summary, allCount }: { summary: AnomalySummary; allCount: number }) {
  const hasEvaluated = summary.latest_detected_at !== null || allCount > 0;
  const active = summary.total_active;
  const resolved = Math.max(0, allCount - active);
  const total = allCount || (active + resolved);

  const resolutionRate = total > 0 ? (resolved / total) * 100 : (hasEvaluated && active === 0 ? 100 : null);

  return (
    <div className="rounded-[16px] p-5 sm:p-6 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
              Resolution Status
            </p>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Triage and investigation closure rate
            </p>
          </div>
          <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
            {resolutionRate != null ? `${resolutionRate.toFixed(0)}%` : '—'}
          </span>
        </div>

        <div className="h-2.5 bg-[#f1f1f3] dark:bg-[#18181b] rounded-full overflow-hidden border border-[#e4e4e7] dark:border-[#27272a] mb-4">
          <div
            className="h-full rounded-full bg-[#16a34a]"
            style={{ width: `${resolutionRate ?? 0}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <div className="flex items-center gap-3 bg-[#dcfce7]/50 dark:bg-[#14532d]/30 border border-[#bbf7d0] dark:border-[#166534]/50 rounded-[12px] p-3">
          <div className="w-8 h-8 rounded-[8px] bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#166534] dark:text-emerald-300 uppercase font-bold leading-none">Resolved</p>
            <p className="text-lg font-extrabold font-mono text-[#166534] dark:text-emerald-400 mt-1 leading-none tabular-nums">{resolved}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#fee2e2]/50 dark:bg-[#7f1d1d]/30 border border-[#fecaca] dark:border-[#991b1b]/50 rounded-[12px] p-3">
          <div className="w-8 h-8 rounded-[8px] bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center flex-shrink-0 text-rose-700 dark:text-rose-400" aria-hidden="true">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#991b1b] dark:text-rose-300 uppercase font-bold leading-none">Active</p>
            <p className="text-lg font-extrabold font-mono text-[#991b1b] dark:text-rose-400 mt-1 leading-none tabular-nums">{active}</p>
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
          <div key={i} className="p-5 h-48 skeleton rounded-[16px] bg-[#f1f1f3] dark:bg-[#18181b]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SeverityDonut summary={summary} />
      <TypeDistributionChart summary={summary} />
      {isLoadingAnomalies ? (
        <div className="p-5 h-48 skeleton rounded-[16px] bg-[#f1f1f3] dark:bg-[#18181b]" />
      ) : (
        <AnomalyTrendTimeline anomalies={anomalies} summary={summary} />
      )}
      <ResolutionTrend summary={summary} allCount={anomalies.length} />
    </div>
  );
}
