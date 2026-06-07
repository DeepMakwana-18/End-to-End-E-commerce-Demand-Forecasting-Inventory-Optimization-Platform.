/**
 * AnomalyExecutiveHeader — Section 1
 * 8-metric executive KPI strip replacing the old 4-up cards.
 *
 * Metrics:
 *  - Critical, Medium, Low, Total Active
 *  - Detection Confidence (derived from avg z-score)
 *  - Avg Anomaly Severity (weighted score)
 *  - Est. Revenue Impact
 *  - Forecast Reliability Score
 */

import { motion } from 'framer-motion';
import {
  Flame, AlertTriangle, Info, Activity,
  Shield, Gauge, DollarSign, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalySummary, Anomaly } from '@/types/anomaly';

// ── Derived Metrics ───────────────────────────────────────────────────

function deriveMetrics(summary: AnomalySummary, anomalies: Anomaly[]) {
  const activeAnoms = anomalies.filter((a) => !a.is_resolved);

  // ── Detection Confidence ─────────────────────────────────────────────
  // Use per-anomaly z-scores if available; otherwise derive from severity mix.
  const zScores = activeAnoms.map((a) => Math.abs(a.z_score ?? 0)).filter((z) => z > 0);
  let detectionConfidence: number;
  if (zScores.length > 0) {
    const avgZ = zScores.reduce((s, z) => s + z, 0) / zScores.length;
    detectionConfidence = Math.min(99, Math.round(50 + (avgZ / 6) * 49));
  } else {
    // Fallback: confidence is higher when more critical/medium (statistically distinct)
    const criticalFrac = summary.total_active > 0 ? summary.critical_count / summary.total_active : 0;
    const medFrac = summary.total_active > 0 ? summary.medium_count / summary.total_active : 0;
    detectionConfidence = Math.min(95, Math.round(60 + criticalFrac * 30 + medFrac * 10));
  }

  // ── Avg Severity Score ───────────────────────────────────────────────
  // Computed from summary counts — always available, never depends on allAnomalies.
  // Formula: weighted_sum / (total_active × 3) × 100
  //   critical weight=3, medium weight=2, low weight=1
  const weightedSum = summary.critical_count * 3 + summary.medium_count * 2 + summary.low_count * 1;
  const avgSeverityScore = summary.total_active > 0
    ? Math.round((weightedSum / (summary.total_active * 3)) * 100)
    : 0;

  // ── Deviation Exposure ───────────────────────────────────────────────
  // Σ(|deviation_pct|/100 × |actual_value| × severity_weight) across active anomalies.
  // Requires anomaly list data. Returns null when list not yet loaded.
  const deviationExposure = activeAnoms.length > 0
    ? activeAnoms.reduce((s, a) => {
        const devFraction = Math.abs(a.deviation_pct ?? 0) / 100;
        const actualAbs = Math.abs(a.actual_value ?? 0);
        const severityWeight = a.severity === 'critical' ? 3 : a.severity === 'medium' ? 2 : 1;
        return s + devFraction * actualAbs * severityWeight;
      }, 0)
    : null; // null = list not yet loaded (show loading state in UI)

  // ── Forecast Reliability ─────────────────────────────────────────────
  const forecastMissRate = summary.total_active > 0 ? (summary.forecast_misses / summary.total_active) : 0;
  const forecastReliability = Math.max(40, Math.round(100 - forecastMissRate * 60 - (avgSeverityScore / 100) * 20));

  return { detectionConfidence, avgSeverityScore, deviationExposure, forecastReliability };
}

// ── KPI Card ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  delay?: number;
  pulse?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

function KpiCard({ label, value, sub, icon: Icon, color, bg, border, delay = 0, pulse }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn('glass-card p-4 flex flex-col gap-2 border relative overflow-hidden', border)}
    >
      {/* Subtle background glow */}
      <div className={cn('absolute inset-0 opacity-5 rounded-2xl', bg)} />

      <div className="flex items-start justify-between relative">
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', bg)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        {pulse && (
          <span className="flex h-2 w-2 mt-0.5">
            <span className={cn('animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75', bg)} />
            <span className={cn('relative inline-flex rounded-full h-2 w-2', bg.replace('/10', ''))} />
          </span>
        )}
      </div>

      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-0.5">{label}</p>
        <p className={cn('text-2xl font-black font-mono tabular-nums leading-none', color)}>{value}</p>
        {sub && <p className="text-[10px] text-surface-600 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────

interface Props {
  summary: AnomalySummary | null;
  anomalies: Anomaly[];
  isLoading: boolean;        // summary loading gate
  isLoadingAnomalies?: boolean; // anomaly list loading gate (optional — for exposure KPI)
}

export function AnomalyExecutiveHeader({ summary, anomalies, isLoading, isLoadingAnomalies }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass-card p-4 h-28 skeleton" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const { detectionConfidence, avgSeverityScore, deviationExposure, forecastReliability } = deriveMetrics(summary, anomalies);
  const exposureLoading = isLoadingAnomalies && deviationExposure === null;

  const cards: KpiCardProps[] = [
    {
      label: 'Critical',
      value: summary.critical_count,
      sub: 'Immediate action',
      icon: Flame,
      color: 'text-danger-400',
      bg: 'bg-danger-500/10',
      border: 'border-danger-500/25',
      pulse: summary.critical_count > 0,
      delay: 0,
    },
    {
      label: 'Medium',
      value: summary.medium_count,
      sub: 'Prompt review',
      icon: AlertTriangle,
      color: 'text-warning-400',
      bg: 'bg-warning-500/10',
      border: 'border-warning-500/20',
      delay: 0.04,
    },
    {
      label: 'Low',
      value: summary.low_count,
      sub: 'Monitor closely',
      icon: Info,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
      border: 'border-primary-500/20',
      delay: 0.08,
    },
    {
      label: 'Total Active',
      value: summary.total_active,
      sub: summary.latest_detected_at
        ? `Last: ${new Date(summary.latest_detected_at).toLocaleDateString()}`
        : 'No anomalies',
      icon: Activity,
      color: 'text-surface-200',
      bg: 'bg-surface-700/40',
      border: 'border-surface-700/30',
      delay: 0.12,
    },
    {
      label: 'Detection Confidence',
      value: `${detectionConfidence}%`,
      sub: detectionConfidence > 85 ? 'Very High' : detectionConfidence > 70 ? 'High' : 'Moderate',
      icon: Shield,
      color: detectionConfidence > 85 ? 'text-accent-400' : detectionConfidence > 70 ? 'text-warning-400' : 'text-primary-400',
      bg: detectionConfidence > 85 ? 'bg-accent-500/10' : 'bg-primary-500/10',
      border: detectionConfidence > 85 ? 'border-accent-500/20' : 'border-primary-500/20',
      delay: 0.16,
    },
    {
      label: 'Avg Severity',
      value: `${avgSeverityScore}%`,
      sub: avgSeverityScore > 60 ? 'High Risk' : avgSeverityScore > 30 ? 'Moderate Risk' : 'Low Risk',
      icon: Gauge,
      color: avgSeverityScore > 60 ? 'text-danger-400' : avgSeverityScore > 30 ? 'text-warning-400' : 'text-accent-400',
      bg: avgSeverityScore > 60 ? 'bg-danger-500/10' : 'bg-warning-500/10',
      border: avgSeverityScore > 60 ? 'border-danger-500/20' : 'border-warning-500/20',
      delay: 0.20,
    },
    {
      label: 'Deviation Exposure',
      value: exposureLoading
        ? '...'
        : deviationExposure != null && deviationExposure > 0
        ? `${(deviationExposure / 1000).toFixed(1)}k`
        : '—',
      sub: deviationExposure != null
        ? `Σ |dev%| × actual × sev. weight`
        : 'Loading anomaly data…',
      icon: DollarSign,
      color: deviationExposure != null && deviationExposure > 50000 ? 'text-danger-400' : deviationExposure != null && deviationExposure > 5000 ? 'text-warning-400' : 'text-surface-300',
      bg: deviationExposure != null && deviationExposure > 50000 ? 'bg-danger-500/10' : 'bg-surface-700/30',
      border: deviationExposure != null && deviationExposure > 50000 ? 'border-danger-500/20' : 'border-surface-700/30',
      delay: 0.24,
    },
    {
      label: 'Forecast Reliability',
      value: `${forecastReliability}%`,
      sub: forecastReliability > 80 ? 'On target' : forecastReliability > 60 ? 'Needs review' : 'Action required',
      icon: Target,
      color: forecastReliability > 80 ? 'text-accent-400' : forecastReliability > 60 ? 'text-warning-400' : 'text-danger-400',
      bg: forecastReliability > 80 ? 'bg-accent-500/10' : 'bg-warning-500/10',
      border: forecastReliability > 80 ? 'border-accent-500/20' : 'border-warning-500/20',
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
