/**
 * AnomalyExplainPanel — Phase 5D
 *
 * SHAP root-cause explanation panel for individual anomalies.
 * Supports light and dark Titan AI surfaces with accessible contrast,
 * reduced-motion support, and honest attribution reconciliation notes.
 */

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles, AlertTriangle, Info, TrendingUp, TrendingDown,
  Loader2, CheckCircle2, HelpCircle, ShieldCheck,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import anomalyApi, { type AnomalyDriverItem, type AnomalyExplainResponse } from '@/services/anomalyApi';

// ── Quality Badge ─────────────────────────────────────────────────────

function QualityBadge({ quality, fallbacks }: { quality: string; fallbacks: string[] }) {
  const cfg: Record<string, { label: string; badge: string; icon: typeof CheckCircle2 }> = {
    full: {
      label: 'Full',
      badge: 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60',
      icon: CheckCircle2,
    },
    partial: {
      label: 'Partial',
      badge: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
      icon: AlertTriangle,
    },
    minimal: {
      label: 'Minimal',
      badge: 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60',
      icon: AlertTriangle,
    },
    unknown: {
      label: 'Unknown',
      badge: 'bg-[#f1f1f3] text-[#3f3f46] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]',
      icon: HelpCircle,
    },
  };
  const c = cfg[quality] ?? cfg.unknown;
  const Icon = c.icon;
  const LABEL_MAP: Record<string, string> = {
    lag_1: 'last-week lag',
    lag_4: '4-week lag',
    week: 'week',
    month: 'month',
    year: 'year',
  };

  return (
    <span
      title={
        fallbacks.length
          ? `Fallback features: ${fallbacks.map(f => LABEL_MAP[f] ?? f).join(', ')} — estimated from rolling baseline`
          : 'All features reconstructed from Forecast records'
      }
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-help',
        c.badge,
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {c.label} reconstruction
    </span>
  );
}

// ── Driver Bar ────────────────────────────────────────────────────────

function DriverBar({
  item, maxAbs, isDriver, prefersReducedMotion,
}: {
  item: AnomalyDriverItem;
  maxAbs: number;
  isDriver: boolean;
  prefersReducedMotion: boolean | null;
}) {
  const pct = maxAbs > 0 ? (item.abs_shap / maxAbs) * 100 : 0;
  const barColor = isDriver
    ? 'bg-emerald-600 dark:bg-emerald-500'
    : 'bg-rose-600 dark:bg-rose-500';
  const valueColor = isDriver
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-rose-700 dark:text-rose-400';

  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="w-32 flex-shrink-0">
        <p className="text-[11px] font-semibold text-[#0a0a0a] dark:text-[#fafaf9] truncate" title={item.label}>
          {item.label}
        </p>
        <p className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] font-mono tabular-nums">
          val={formatNumber(item.feature_value)}
        </p>
      </div>

      <div className="flex-1 bg-[#e4e4e7]/70 dark:bg-[#27272a] rounded-full h-2 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', barColor)}
          initial={prefersReducedMotion ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' }}
        />
      </div>

      <div className={cn('w-16 text-right font-mono text-[11px] font-bold tabular-nums', valueColor)}>
        {item.shap_value >= 0 ? '+' : ''}{item.shap_value.toFixed(1)}
      </div>
    </div>
  );
}

// ── Driver Section ────────────────────────────────────────────────────

function DriversSection({
  drivers,
  suppressors,
  prefersReducedMotion,
}: {
  drivers: AnomalyDriverItem[];
  suppressors: AnomalyDriverItem[];
  prefersReducedMotion: boolean | null;
}) {
  const allItems = [...drivers, ...suppressors];
  const maxAbs = Math.max(...allItems.map(d => d.abs_shap), 0.001);

  return (
    <div className="space-y-3">
      {drivers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-emerald-700 dark:text-emerald-400">
              Drivers — raised predicted demand
            </p>
          </div>
          <div className="space-y-0.5">
            {drivers.map(item => (
              <DriverBar
                key={item.feature}
                item={item}
                maxAbs={maxAbs}
                isDriver
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </div>
      )}

      {suppressors.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-rose-700 dark:text-rose-400">
              Suppressors — reduced predicted demand
            </p>
          </div>
          <div className="space-y-0.5">
            {suppressors.map(item => (
              <DriverBar
                key={item.feature}
                item={item}
                maxAbs={maxAbs}
                isDriver={false}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </div>
      )}

      {drivers.length === 0 && suppressors.length === 0 && (
        <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] text-center py-2">
          No significant SHAP contributions (model output matches the SHAP baseline).
        </p>
      )}
    </div>
  );
}

// ── Confidence Row ────────────────────────────────────────────────────

function ConfidenceRow({
  confidenceShap, confidenceSource, baseZ,
}: {
  confidenceShap: number | null;
  confidenceSource: string;
  baseZ: number | null;
}) {
  if (confidenceShap == null) return null;

  const isEnhanced = confidenceSource === 'shap_enhanced';
  const zBased = baseZ != null ? (
    Math.abs(baseZ) >= 5 ? 98 :
    Math.abs(baseZ) >= 4 ? 92 :
    Math.abs(baseZ) >= 3 ? 84 :
    Math.abs(baseZ) >= 2 ? 72 : 55
  ) : null;

  return (
    <div className="bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
        Detection Confidence
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <ShieldCheck
          className={cn('w-4 h-4', isEnhanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#1e3fc8] dark:text-[#60a5fa]')}
          aria-hidden="true"
        />
        <span className={cn(
          'text-sm font-bold font-mono tabular-nums',
          isEnhanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#1e3fc8] dark:text-[#60a5fa]'
        )}>
          {confidenceShap.toFixed(1)}%
        </span>
        {isEnhanced && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60 font-semibold">
            SHAP-enhanced
          </span>
        )}
      </div>
      {zBased != null && isEnhanced ? (
        <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
          Up from z-score baseline of {zBased}% based on feature driver agreement.
        </p>
      ) : (
        <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
          Derived from z-score magnitude (SHAP provides no additional boost).
        </p>
      )}
    </div>
  );
}

// ── Attribution Reconciliation Notice ─────────────────────────────────

function ShapMathNote({
  baseValue, allShap, predicted,
}: {
  baseValue: number | null;
  allShap: Record<string, number> | null;
  predicted: number | null;
}) {
  if (baseValue == null || allShap == null || predicted == null) return null;

  const shapSum = Object.values(allShap).reduce((a, b) => a + b, 0);
  const computed = baseValue + shapSum;
  const diff = Math.abs(computed - predicted);
  const isReconciled = diff < 1.0;

  return (
    <div
      className={cn(
        'rounded-[10px] border px-3 py-2.5 flex items-start gap-2',
        isReconciled
          ? 'bg-[#dcfce7]/50 border-[#bbf7d0] dark:bg-[#14532d]/25 dark:border-[#166534]/50'
          : 'bg-[#fffbeb] border-[#fde68a] dark:bg-amber-950/30 dark:border-amber-800/50',
      )}
    >
      <Info
        className={cn(
          'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
          isReconciled ? 'text-[#166534] dark:text-[#4ade80]' : 'text-[#92400e] dark:text-amber-300',
        )}
        aria-hidden="true"
      />
      <div className="text-[11px] leading-relaxed">
        {isReconciled ? (
          <p className="text-[#166534] dark:text-[#4ade80] font-medium">
            SHAP attribution reconciles with model output:{' '}
            <span className="font-mono font-semibold tabular-nums">
              base ({baseValue.toFixed(1)}) + ΣSHAP ({shapSum >= 0 ? '+' : ''}{shapSum.toFixed(1)}) = {computed.toFixed(1)}
            </span>
          </p>
        ) : (
          <div className="space-y-0.5">
            <p className="font-semibold text-[#92400e] dark:text-amber-300">
              Attribution not directly reconcilable with anomaly scale
            </p>
            <p className="text-[#52525b] dark:text-[#a1a1aa]">
              Model SHAP sum (<span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9] tabular-nums">
                {baseValue.toFixed(1)} + {shapSum >= 0 ? '+' : ''}{shapSum.toFixed(1)} = {computed.toFixed(1)}
              </span>) differs from the recorded model value ({predicted.toFixed(1)}) because anomaly detection uses rolling-baseline or product-level scales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────

interface Props {
  anomalyId: number;
  zScore?: number | null;
}

export function AnomalyExplainPanel({ anomalyId, zScore }: Props) {
  const [data, setData] = useState<AnomalyExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!anomalyId) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setData(null);
      setError(null);
      return anomalyApi.getExplain(anomalyId);
    })
      .then((res) => {
        if (!cancelled && res) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load SHAP explanation.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [anomalyId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Confidence &amp; Attribution Analysis
          </p>
          <Loader2 className="w-3 h-3 text-[#52525b] dark:text-[#a1a1aa] animate-spin" />
        </div>
        <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-4 space-y-2">
          {[70, 50, 85, 40].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2.5 skeleton rounded bg-[#e4e4e7] dark:bg-[#27272a]" style={{ width: 120 }} />
              <div className="flex-1 h-2 skeleton rounded-full bg-[#e4e4e7] dark:bg-[#27272a]" style={{ maxWidth: `${w}%` }} />
              <div className="h-2.5 skeleton rounded w-10 bg-[#e4e4e7] dark:bg-[#27272a]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#fee2e2]/60 dark:bg-[#7f1d1d]/30 border border-[#fecaca] dark:border-[#991b1b]/60 rounded-[12px] p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-[#991b1b] dark:text-[#fca5a5] mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-xs font-bold text-[#991b1b] dark:text-[#fca5a5]">Explanation unavailable</p>
          <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  if (data && !data.explainer_ready) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#52525b] dark:text-[#a1a1aa]" aria-hidden="true" />
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Confidence &amp; Attribution Analysis
          </p>
        </div>
        <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-4 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-[#52525b] dark:text-[#a1a1aa] mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">SHAP attribution unavailable</p>
            <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-1">
              {data.reason ?? 'The model explainer could not be initialized for this anomaly.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      className="space-y-2.5"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Confidence &amp; Attribution Analysis
          </p>
          <span className="text-[10px] font-mono text-[#52525b] dark:text-[#a1a1aa]">· {data.model_version_tag}</span>
        </div>
        <QualityBadge quality={data.reconstruction_quality} fallbacks={data.used_fallbacks} />
      </div>

      <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3.5 space-y-3.5">
        <ConfidenceRow
          confidenceShap={data.confidence_shap ?? null}
          confidenceSource={data.confidence_source}
          baseZ={zScore ?? null}
        />

        {data.narrative_summary && (
          <div className="bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[10px] p-3">
            <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-1">
              Attribution Summary
            </p>
            <p className="text-xs text-[#0a0a0a] dark:text-[#fafaf9] leading-relaxed">
              {data.narrative_summary}
            </p>
          </div>
        )}

        <DriversSection
          drivers={data.drivers}
          suppressors={data.suppressors}
          prefersReducedMotion={prefersReducedMotion}
        />

        <ShapMathNote
          baseValue={data.base_value ?? null}
          allShap={data.all_shap ?? null}
          predicted={data.predicted_at_anomaly ?? null}
        />

        {data.anomaly_type_note && (
          <div className="bg-[#fffbeb] dark:bg-amber-950/30 border border-[#fde68a] dark:border-amber-800/50 rounded-[10px] px-3 py-2 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#92400e] dark:text-amber-300 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">{data.anomaly_type_note}</p>
          </div>
        )}

        {data.used_fallbacks.length > 0 && (
          <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
            Note: {data.used_fallbacks.map(f => ({ lag_1: 'Last-week demand', lag_4: '4-week-ago demand' }[f] ?? f)).join(', ')}{' '}
            estimated from rolling baseline where no exact Forecast row existed.
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default AnomalyExplainPanel;
