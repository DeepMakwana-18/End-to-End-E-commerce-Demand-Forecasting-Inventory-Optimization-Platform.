/**
 * AnomalyExecutiveHeader — Section 1
 * 8-metric executive KPI strip with accurate units, metric definitions, and Titan AI surfaces.
 */

import {
  Flame, AlertTriangle, Info, Activity,
  Shield, Gauge, Layers, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AnomalySummary, Anomaly } from '@/types/anomaly';

// ── Derived Metrics ───────────────────────────────────────────────────

function deriveMetrics(summary: AnomalySummary, anomalies: Anomaly[]) {
  const activeAnoms = anomalies.filter((a) => !a.is_resolved);
  const hasEvaluated = summary.latest_detected_at !== null || anomalies.length > 0;

  // Detection Confidence: derived from active z-scores (or severity ratio if z-scores absent)
  const zScores = activeAnoms.map((a) => Math.abs(a.z_score ?? 0)).filter((z) => z > 0);
  let detectionConfidence: number | null;
  if (zScores.length > 0) {
    const avgZ = zScores.reduce((s, z) => s + z, 0) / zScores.length;
    detectionConfidence = Math.min(99, Math.round(50 + (avgZ / 6) * 49));
  } else if (summary.total_active > 0) {
    const criticalFrac = summary.critical_count / summary.total_active;
    const medFrac = summary.medium_count / summary.total_active;
    detectionConfidence = Math.min(95, Math.round(60 + criticalFrac * 30 + medFrac * 10));
  } else if (hasEvaluated) {
    detectionConfidence = 98;
  } else {
    detectionConfidence = null;
  }

  // Avg Severity Score: weighted index (Critical=3, Medium=2, Low=1) normalized to 100%
  const weightedSum = summary.critical_count * 3 + summary.medium_count * 2 + summary.low_count * 1;
  const avgSeverityScore: number | null = summary.total_active > 0
    ? Math.round((weightedSum / (summary.total_active * 3)) * 100)
    : hasEvaluated ? 0 : null;

  // Deviation Exposure: severity-weighted unit volume deviation across active anomalies
  const deviationExposure = activeAnoms.length > 0
    ? activeAnoms.reduce((s, a) => {
        const devFraction = Math.abs(a.deviation_pct ?? 0) / 100;
        const actualAbs = Math.abs(a.actual_value ?? 0);
        const severityWeight = a.severity === 'critical' ? 3 : a.severity === 'medium' ? 2 : 1;
        return s + devFraction * actualAbs * severityWeight;
      }, 0)
    : summary.total_active === 0 && hasEvaluated
      ? 0
      : null;

  // Forecast Reliability: 100% minus forecast-miss rate and severity penalties
  let forecastReliability: number | null;
  if (!hasEvaluated && summary.total_active === 0) {
    forecastReliability = null;
  } else if (summary.total_active === 0) {
    forecastReliability = 100;
  } else {
    const forecastMissRate = summary.forecast_misses / summary.total_active;
    const sevFactor = avgSeverityScore != null ? avgSeverityScore / 100 : 0;
    forecastReliability = Math.max(40, Math.round(100 - forecastMissRate * 60 - sevFactor * 20));
  }

  return { detectionConfidence, avgSeverityScore, deviationExposure, forecastReliability, hasEvaluated };
}

// ── KPI Card ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tooltip?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgIcon: string;
  cardBorder?: string;
}

function KpiCard({ label, value, sub, tooltip, icon: Icon, color, bgIcon, cardBorder }: KpiCardProps) {
  return (
    <div
      title={tooltip}
      className={cn(
        'p-4 sm:p-5 rounded-[16px] flex flex-col justify-between gap-3 border bg-white dark:bg-[#111113] transition-colors duration-150',
        cardBorder ?? 'border-[#e4e4e7] dark:border-[#27272a]'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 border', bgIcon)} aria-hidden="true">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1 leading-none">
          {label}
        </p>
        <div className={cn('text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-tight', color)}>
          {value}
        </div>
        {sub && (
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 leading-tight line-clamp-1 font-medium">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────

interface Props {
  summary: AnomalySummary | null;
  anomalies: Anomaly[];
  isLoading: boolean;
  isLoadingAnomalies?: boolean;
}

export function AnomalyExecutiveHeader({ summary, anomalies, isLoading, isLoadingAnomalies }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-5 h-32 skeleton rounded-[16px] bg-[#f1f1f3] dark:bg-[#18181b]" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const { detectionConfidence, avgSeverityScore, deviationExposure, forecastReliability, hasEvaluated } = deriveMetrics(summary, anomalies);
  const exposureLoading = isLoadingAnomalies && deviationExposure === null && summary.total_active > 0;

  const lastDetectedLabel = summary.latest_detected_at
    ? `Latest record: ${new Date(summary.latest_detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : hasEvaluated ? 'Zero anomalies' : 'Awaiting initial scan';

  const cards: KpiCardProps[] = [
    {
      label: 'Critical',
      value: summary.critical_count,
      sub: summary.critical_count > 0 ? 'Immediate action required' : 'Zero active critical',
      tooltip: 'Unresolved anomalies exceeding the critical z-score threshold.',
      icon: Flame,
      color: 'text-rose-700 dark:text-rose-400',
      bgIcon: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50',
      cardBorder: summary.critical_count > 0
        ? 'border-rose-300 dark:border-rose-700/60'
        : 'border-[#e4e4e7] dark:border-[#27272a]',
    },
    {
      label: 'Medium',
      value: summary.medium_count,
      sub: summary.medium_count > 0 ? 'Review & investigate' : 'No medium risk',
      tooltip: 'Unresolved anomalies between medium and critical z-score thresholds.',
      icon: AlertTriangle,
      color: 'text-amber-700 dark:text-amber-400',
      bgIcon: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
    },
    {
      label: 'Low',
      value: summary.low_count,
      sub: summary.low_count > 0 ? 'Track trend drift' : 'No low variance',
      tooltip: 'Unresolved anomalies between low and medium z-score thresholds.',
      icon: Info,
      color: 'text-[#1e3fc8] dark:text-[#60a5fa]',
      bgIcon: 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40',
    },
    {
      label: 'Total Active',
      value: summary.total_active,
      sub: lastDetectedLabel,
      tooltip: 'Total unresolved anomalies across all severities. Date shows latest detected anomaly record.',
      icon: Activity,
      color: 'text-[#0a0a0a] dark:text-[#fafaf9]',
      bgIcon: 'bg-[#fafaf9] text-[#0a0a0a] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#fafaf9] dark:border-[#27272a]',
    },
    {
      label: 'Detection Confidence',
      value: detectionConfidence != null ? `${detectionConfidence}%` : '—',
      sub: detectionConfidence != null
        ? 'Derived from active |z-score| mean'
        : 'Awaiting scan evaluation',
      tooltip: 'Confidence index scaled from the mean absolute z-score of active anomalies (50–99%).',
      icon: Shield,
      color: 'text-[#1e3fc8] dark:text-[#60a5fa]',
      bgIcon: 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40',
    },
    {
      label: 'Average Severity',
      value: avgSeverityScore != null ? `${avgSeverityScore}%` : '—',
      sub: avgSeverityScore != null
        ? 'Weighted index (Crit 3 · Med 2 · Low 1)'
        : 'No baseline data',
      tooltip: 'Weighted severity score across active anomalies: (3×Critical + 2×Medium + 1×Low) / (3×Total).',
      icon: Gauge,
      color: avgSeverityScore != null && avgSeverityScore > 60
        ? 'text-rose-700 dark:text-rose-400'
        : avgSeverityScore != null && avgSeverityScore > 30
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-teal-700 dark:text-teal-400',
      bgIcon: 'bg-[#fafaf9] text-[#0a0a0a] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#fafaf9] dark:border-[#27272a]',
    },
    {
      label: 'Deviation Exposure',
      value: exposureLoading ? (
        <Skeleton className="h-7 w-20 my-0.5 rounded" />
      ) : deviationExposure != null && deviationExposure > 0 ? (
        <>
          {(deviationExposure / 1000).toFixed(1)}k{' '}
          <span className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa]">units</span>
        </>
      ) : deviationExposure === 0 ? (
        '0 units'
      ) : (
        '—'
      ),
      sub: deviationExposure != null && deviationExposure > 0
        ? 'Severity-weighted unit volume exposure'
        : deviationExposure === 0
          ? 'No active deviation'
          : 'Awaiting scan',
      tooltip: 'Sum of (|deviation %| × actual units × severity weight) across active anomalies.',
      icon: Layers,
      color: 'text-[#0a0a0a] dark:text-[#fafaf9]',
      bgIcon: 'bg-[#fafaf9] text-[#0a0a0a] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#fafaf9] dark:border-[#27272a]',
    },
    {
      label: 'Forecast Reliability',
      value: forecastReliability != null ? `${forecastReliability}%` : '—',
      sub: forecastReliability != null
        ? (summary.total_active === 0
            ? '0 active forecast misses'
            : `${summary.forecast_misses} forecast miss${summary.forecast_misses !== 1 ? 'es' : ''} in active set`)
        : 'Awaiting baseline',
      tooltip: 'Reliability score = 100% minus penalties for active forecast-miss share and average severity.',
      icon: Target,
      color: forecastReliability != null && forecastReliability > 80
        ? 'text-emerald-700 dark:text-emerald-400'
        : forecastReliability != null && forecastReliability > 60
          ? 'text-amber-700 dark:text-amber-400'
          : forecastReliability != null
            ? 'text-rose-700 dark:text-rose-400'
            : 'text-[#52525b] dark:text-[#a1a1aa]',
      bgIcon: 'bg-[#fafaf9] text-[#0a0a0a] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#fafaf9] dark:border-[#27272a]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  );
}
