/**
 * AnomalyExecutiveHeader — Section 1
 * 8-metric executive KPI strip with semantic color treatments and zero-data handling.
 *
 * Metrics:
 *  - Critical (restrained red)
 *  - Medium (amber)
 *  - Low (blue/indigo)
 *  - Total Active (slate)
 *  - Detection Confidence (indigo)
 *  - Avg Severity (teal where appropriate)
 *  - Deviation Exposure (amber/slate)
 *  - Forecast Reliability (green when supported by actual data)
 */

import { motion } from 'framer-motion';
import {
  Flame, AlertTriangle, Info, Activity,
  Shield, Gauge, DollarSign, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AnomalySummary, Anomaly } from '@/types/anomaly';

// ── Derived Metrics ───────────────────────────────────────────────────

function deriveMetrics(summary: AnomalySummary, anomalies: Anomaly[]) {
  const activeAnoms = anomalies.filter((a) => !a.is_resolved);

  // Check if baseline scan evaluation has occurred
  const hasEvaluated = summary.latest_detected_at !== null || anomalies.length > 0;

  // ── Detection Confidence ─────────────────────────────────────────────
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
    // Verified 0 active anomalies after scan
    detectionConfidence = 98;
  } else {
    // Awaiting baseline evaluation
    detectionConfidence = null;
  }

  // ── Avg Severity Score ───────────────────────────────────────────────
  const weightedSum = summary.critical_count * 3 + summary.medium_count * 2 + summary.low_count * 1;
  const avgSeverityScore: number | null = summary.total_active > 0
    ? Math.round((weightedSum / (summary.total_active * 3)) * 100)
    : hasEvaluated ? 0 : null;

  // ── Deviation Exposure ───────────────────────────────────────────────
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

  // ── Forecast Reliability ─────────────────────────────────────────────
  // Zero-data handling: do not turn unverified data into a 100% guarantee.
  let forecastReliability: number | null;
  if (!hasEvaluated && summary.total_active === 0) {
    forecastReliability = null; // Awaiting baseline data
  } else if (summary.total_active === 0) {
    forecastReliability = 100; // Scanned data verified 0 active misses
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
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgIcon: string;
  cardBg: string;
  border: string;
  delay?: number;
  pulse?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, color, bgIcon, cardBg, border, delay = 0, pulse }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-3 border relative overflow-hidden transition-all duration-200 shadow-2xs hover:shadow-xs hover:-translate-y-0.5',
        'bg-white dark:bg-ds-surface border-slate-200/90 dark:border-ds-border',
        cardBg
      )}
    >
      <div className="flex items-start justify-between relative">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs', bgIcon)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {pulse && (
          <span className="flex h-2.5 w-2.5 mt-0.5">
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 bg-rose-400" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
        )}
      </div>

      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-ds-text-secondary mb-1 leading-none">
          {label}
        </p>
        <div className={cn('text-2xl sm:text-3xl font-extrabold font-sans tabular-nums tracking-tight leading-tight', color)}>
          {value}
        </div>
        {sub && (
          <p className="text-xs text-slate-400 dark:text-ds-text-muted mt-1 leading-tight line-clamp-1">
            {sub}
          </p>
        )}
      </div>
    </motion.div>
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
          <div key={i} className="card-apple p-5 h-32 skeleton rounded-2xl bg-slate-100 dark:bg-ds-surface-sunken" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const { detectionConfidence, avgSeverityScore, deviationExposure, forecastReliability, hasEvaluated } = deriveMetrics(summary, anomalies);
  const exposureLoading = isLoadingAnomalies && deviationExposure === null && summary.total_active > 0;

  const cards: KpiCardProps[] = [
    {
      label: 'Critical',
      value: summary.critical_count,
      sub: summary.critical_count > 0 ? 'Immediate action required' : 'Zero active critical',
      icon: Flame,
      color: 'text-rose-600 dark:text-rose-400',
      bgIcon: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40',
      cardBg: 'hover:border-rose-300 dark:hover:border-rose-700/50',
      border: 'border-slate-200/90 dark:border-ds-border',
      pulse: summary.critical_count > 0,
      delay: 0,
    },
    {
      label: 'Medium',
      value: summary.medium_count,
      sub: summary.medium_count > 0 ? 'Review & investigate' : 'No medium risk',
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgIcon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40',
      cardBg: 'hover:border-amber-300 dark:hover:border-amber-700/50',
      border: 'border-slate-200/90 dark:border-ds-border',
      delay: 0.04,
    },
    {
      label: 'Low',
      value: summary.low_count,
      sub: summary.low_count > 0 ? 'Track trend drift' : 'No low variance',
      icon: Info,
      color: 'text-blue-600 dark:text-blue-400',
      bgIcon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40',
      cardBg: 'hover:border-blue-300 dark:hover:border-blue-700/50',
      border: 'border-slate-200/90 dark:border-ds-border',
      delay: 0.08,
    },
    {
      label: 'Total Active',
      value: summary.total_active,
      sub: summary.latest_detected_at
        ? `Last scan: ${new Date(summary.latest_detected_at).toLocaleDateString()}`
        : hasEvaluated ? 'Zero anomalies' : 'Awaiting initial scan',
      icon: Activity,
      color: 'text-slate-900 dark:text-ds-text-heading',
      bgIcon: 'bg-slate-100 text-slate-700 dark:bg-ds-surface-sunken dark:text-ds-text-primary border border-slate-200 dark:border-ds-hairline',
      cardBg: 'hover:border-slate-300 dark:hover:border-slate-600',
      border: 'border-slate-200/90 dark:border-ds-border',
      delay: 0.12,
    },
    {
      label: 'Detection Confidence',
      value: detectionConfidence != null ? `${detectionConfidence}%` : '—',
      sub: detectionConfidence != null
        ? (detectionConfidence > 85 ? 'High confidence detection' : detectionConfidence > 70 ? 'Moderate confidence' : 'Low confidence')
        : 'Awaiting scan evaluation',
      icon: Shield,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgIcon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40',
      cardBg: 'hover:border-indigo-300 dark:hover:border-indigo-700/50',
      border: 'border-slate-200/90 dark:border-ds-border',
      delay: 0.16,
    },
    {
      label: 'Average Severity',
      value: avgSeverityScore != null ? `${avgSeverityScore}%` : '—',
      sub: avgSeverityScore != null
        ? (avgSeverityScore > 60 ? 'Critical bias' : avgSeverityScore > 30 ? 'Moderate severity' : 'Low severity bias')
        : 'No baseline data',
      icon: Gauge,
      color: avgSeverityScore != null && avgSeverityScore > 60
        ? 'text-rose-600 dark:text-rose-400'
        : avgSeverityScore != null && avgSeverityScore > 30
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-teal-600 dark:text-teal-400',
      bgIcon: avgSeverityScore != null && avgSeverityScore > 60
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
        : avgSeverityScore != null && avgSeverityScore > 30
          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
          : 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/40',
      cardBg: 'hover:border-slate-300 dark:hover:border-slate-600',
      border: 'border-slate-200/90 dark:border-ds-border',
      delay: 0.20,
    },
    {
      label: 'Deviation Exposure',
      value: exposureLoading ? (
        <Skeleton className="h-7 w-20 my-0.5 rounded" />
      ) : deviationExposure != null && deviationExposure > 0 ? (
        `${(deviationExposure / 1000).toFixed(1)}k`
      ) : deviationExposure === 0 ? (
        '0'
      ) : (
        '—'
      ),
      sub: deviationExposure != null && deviationExposure > 0
        ? 'Weighted volume exposure'
        : deviationExposure === 0
          ? 'No active deviation'
          : 'Awaiting scan',
      icon: DollarSign,
      color: deviationExposure != null && deviationExposure > 50000
        ? 'text-rose-600 dark:text-rose-400'
        : deviationExposure != null && deviationExposure > 5000
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-slate-800 dark:text-ds-text-heading',
      bgIcon: deviationExposure != null && deviationExposure > 50000
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
        : deviationExposure != null && deviationExposure > 5000
          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
          : 'bg-slate-100 text-slate-700 dark:bg-ds-surface-sunken dark:text-ds-text-primary border border-slate-200 dark:border-ds-hairline',
      cardBg: 'hover:border-slate-300 dark:hover:border-slate-600',
      border: 'border-slate-200/90 dark:border-ds-border',
      delay: 0.24,
    },
    {
      label: 'Forecast Reliability',
      value: forecastReliability != null ? `${forecastReliability}%` : '—',
      sub: forecastReliability != null
        ? (summary.total_active === 0
            ? '0 active forecast misses'
            : forecastReliability > 80
              ? 'Forecast models on target'
              : forecastReliability > 60
                ? 'Model drift detected'
                : 'Attention required')
        : 'Awaiting baseline',
      icon: Target,
      color: forecastReliability != null && forecastReliability > 80
        ? 'text-emerald-600 dark:text-emerald-400'
        : forecastReliability != null && forecastReliability > 60
          ? 'text-amber-600 dark:text-amber-400'
          : forecastReliability != null
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-slate-500 dark:text-ds-text-muted',
      bgIcon: forecastReliability != null && forecastReliability > 80
        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
        : forecastReliability != null && forecastReliability > 60
          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
          : forecastReliability != null
            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
            : 'bg-slate-100 text-slate-500 dark:bg-ds-surface-sunken dark:text-ds-text-muted border border-slate-200 dark:border-ds-hairline',
      cardBg: 'hover:border-slate-300 dark:hover:border-slate-600',
      border: 'border-slate-200/90 dark:border-ds-border',
      delay: 0.28,
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

