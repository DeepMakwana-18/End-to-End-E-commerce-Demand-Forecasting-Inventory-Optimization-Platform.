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
        'p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 border relative overflow-hidden transition-all duration-200 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 dark:bg-none dark:bg-[#1B202A] dark:border-[#353D4D]',
        cardBg,
        border
      )}
    >
      <div className="flex items-start justify-between relative">
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs', bgIcon)}>
          <Icon className="w-4 h-4" />
        </div>
        {pulse && (
          <span className="flex h-2 w-2 mt-1">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 bg-rose-400" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
        )}
      </div>

      <div className="relative">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-ds-text-muted mb-1 leading-none">{label}</p>
        <div className={cn('text-2xl font-bold font-sans tabular-nums tracking-tight leading-tight', color)}>{value}</div>
        {sub && <p className="text-[10px] text-slate-500 dark:text-ds-text-muted mt-1 leading-tight line-clamp-1">{sub}</p>}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass-card p-4 h-28 skeleton rounded-2xl" />
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
      sub: summary.critical_count > 0 ? 'Immediate action' : 'Zero active',
      icon: Flame,
      color: 'text-rose-600 dark:text-rose-400',
      bgIcon: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
      cardBg: 'bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white dark:bg-rose-500/10',
      border: 'border-rose-200/80 dark:border-rose-500/25',
      pulse: summary.critical_count > 0,
      delay: 0,
    },
    {
      label: 'Medium',
      value: summary.medium_count,
      sub: summary.medium_count > 0 ? 'Prompt review' : 'No medium risk',
      icon: AlertTriangle,
      color: 'text-amber-700 dark:text-amber-400',
      bgIcon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      cardBg: 'bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white dark:bg-amber-500/10',
      border: 'border-amber-200/80 dark:border-amber-500/20',
      delay: 0.04,
    },
    {
      label: 'Low',
      value: summary.low_count,
      sub: 'Monitor closely',
      icon: Info,
      color: 'text-blue-700 dark:text-primary-400',
      bgIcon: 'bg-blue-100 text-blue-600 dark:bg-primary-500/20 dark:text-primary-400',
      cardBg: 'bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white dark:bg-primary-500/10',
      border: 'border-blue-200/80 dark:border-primary-500/20',
      delay: 0.08,
    },
    {
      label: 'Total Active',
      value: summary.total_active,
      sub: summary.latest_detected_at
        ? `Last: ${new Date(summary.latest_detected_at).toLocaleDateString()}`
        : hasEvaluated ? 'Zero anomalies' : 'Awaiting scan',
      icon: Activity,
      color: 'text-slate-800 dark:text-surface-100',
      bgIcon: 'bg-slate-100 text-slate-700 dark:bg-surface-700 dark:text-surface-200',
      cardBg: 'bg-gradient-to-b from-slate-50/80 via-slate-50/40 to-white dark:bg-surface-800/40',
      border: 'border-slate-200/90 dark:border-surface-700/30',
      delay: 0.12,
    },
    {
      label: 'Confidence',
      value: detectionConfidence != null ? `${detectionConfidence}%` : '—',
      sub: detectionConfidence != null
        ? (detectionConfidence > 85 ? 'Very High' : detectionConfidence > 70 ? 'High' : 'Moderate')
        : 'Awaiting scan',
      icon: Shield,
      color: 'text-indigo-700 dark:text-indigo-400',
      bgIcon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
      cardBg: 'bg-gradient-to-b from-indigo-50/70 via-indigo-50/30 to-white dark:bg-indigo-500/10',
      border: 'border-indigo-200/80 dark:border-indigo-500/20',
      delay: 0.16,
    },
    {
      label: 'Avg Severity',
      value: avgSeverityScore != null ? `${avgSeverityScore}%` : '—',
      sub: avgSeverityScore != null
        ? (avgSeverityScore > 60 ? 'High Risk' : avgSeverityScore > 30 ? 'Moderate Risk' : 'Low Risk')
        : 'No baseline data',
      icon: Gauge,
      color: avgSeverityScore != null && avgSeverityScore > 60
        ? 'text-rose-600 dark:text-danger-400'
        : avgSeverityScore != null && avgSeverityScore > 30
          ? 'text-amber-700 dark:text-warning-400'
          : 'text-teal-700 dark:text-teal-400',
      bgIcon: avgSeverityScore != null && avgSeverityScore > 60
        ? 'bg-rose-100 text-rose-600 dark:bg-danger-500/20 dark:text-danger-400'
        : avgSeverityScore != null && avgSeverityScore > 30
          ? 'bg-amber-100 text-amber-600 dark:bg-warning-500/20 dark:text-warning-400'
          : 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',
      cardBg: avgSeverityScore != null && avgSeverityScore > 60
        ? 'bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white dark:bg-danger-500/10'
        : avgSeverityScore != null && avgSeverityScore > 30
          ? 'bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white dark:bg-warning-500/10'
          : 'bg-gradient-to-b from-teal-50/70 via-teal-50/30 to-white dark:bg-teal-500/10',
      border: avgSeverityScore != null && avgSeverityScore > 60
        ? 'border-rose-200/80 dark:border-danger-500/20'
        : avgSeverityScore != null && avgSeverityScore > 30
          ? 'border-amber-200/80 dark:border-warning-500/20'
          : 'border-teal-200/80 dark:border-teal-500/20',
      delay: 0.20,
    },
    {
      label: 'Deviation Exposure',
      value: exposureLoading ? (
        <Skeleton className="h-6 w-16 my-0.5 rounded" />
      ) : deviationExposure != null && deviationExposure > 0 ? (
        `${(deviationExposure / 1000).toFixed(1)}k`
      ) : deviationExposure === 0 ? (
        '0'
      ) : (
        '—'
      ),
      sub: deviationExposure != null && deviationExposure > 0
        ? 'Weighted impact'
        : deviationExposure === 0
          ? 'No active deviation'
          : 'Awaiting scan',
      icon: DollarSign,
      color: deviationExposure != null && deviationExposure > 50000
        ? 'text-rose-600 dark:text-danger-400'
        : deviationExposure != null && deviationExposure > 5000
          ? 'text-amber-700 dark:text-warning-400'
          : 'text-slate-700 dark:text-surface-300',
      bgIcon: deviationExposure != null && deviationExposure > 50000
        ? 'bg-rose-100 text-rose-600 dark:bg-danger-500/20 dark:text-danger-400'
        : deviationExposure != null && deviationExposure > 5000
          ? 'bg-amber-100 text-amber-600 dark:bg-warning-500/20 dark:text-warning-400'
          : 'bg-slate-100 text-slate-600 dark:bg-surface-700 dark:text-surface-300',
      cardBg: deviationExposure != null && deviationExposure > 50000
        ? 'bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white dark:bg-danger-500/10'
        : deviationExposure != null && deviationExposure > 5000
          ? 'bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white dark:bg-warning-500/10'
          : 'bg-gradient-to-b from-slate-50/70 via-slate-50/30 to-white dark:bg-surface-800/40',
      border: deviationExposure != null && deviationExposure > 50000
        ? 'border-rose-200/80 dark:border-danger-500/20'
        : deviationExposure != null && deviationExposure > 5000
          ? 'border-amber-200/80 dark:border-warning-500/20'
          : 'border-slate-200/80 dark:border-surface-700/30',
      delay: 0.24,
    },
    {
      label: 'Reliability',
      value: forecastReliability != null ? `${forecastReliability}%` : '—',
      sub: forecastReliability != null
        ? (summary.total_active === 0
            ? '0 active misses'
            : forecastReliability > 80
              ? 'On target'
              : forecastReliability > 60
                ? 'Needs review'
                : 'Action required')
        : 'Awaiting baseline',
      icon: Target,
      color: forecastReliability != null && forecastReliability > 80
        ? 'text-emerald-700 dark:text-emerald-400'
        : forecastReliability != null && forecastReliability > 60
          ? 'text-amber-700 dark:text-warning-400'
          : forecastReliability != null
            ? 'text-rose-600 dark:text-danger-400'
            : 'text-slate-500 dark:text-surface-400',
      bgIcon: forecastReliability != null && forecastReliability > 80
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
        : forecastReliability != null && forecastReliability > 60
          ? 'bg-amber-100 text-amber-600 dark:bg-warning-500/20 dark:text-warning-400'
          : forecastReliability != null
            ? 'bg-rose-100 text-rose-600 dark:bg-danger-500/20 dark:text-danger-400'
            : 'bg-slate-100 text-slate-500 dark:bg-surface-700 dark:text-surface-400',
      cardBg: forecastReliability != null && forecastReliability > 80
        ? 'bg-gradient-to-b from-emerald-50/70 via-emerald-50/30 to-white dark:bg-emerald-500/10'
        : forecastReliability != null && forecastReliability > 60
          ? 'bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white dark:bg-warning-500/10'
          : forecastReliability != null
            ? 'bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white dark:bg-danger-500/10'
            : 'bg-gradient-to-b from-slate-50/70 via-slate-50/30 to-white dark:bg-surface-800/40',
      border: forecastReliability != null && forecastReliability > 80
        ? 'border-emerald-200/80 dark:border-emerald-500/20'
        : forecastReliability != null && forecastReliability > 60
          ? 'border-amber-200/80 dark:border-warning-500/20'
          : forecastReliability != null
            ? 'border-rose-200/80 dark:border-danger-500/20'
            : 'border-slate-200/80 dark:border-surface-700/30',
      delay: 0.28,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  );
}

