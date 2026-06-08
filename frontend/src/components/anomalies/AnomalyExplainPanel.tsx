/**
 * AnomalyExplainPanel — Phase 5D
 *
 * SHAP root-cause explanation panel for individual anomalies.
 * Placed inside AnomalyInvestigationDrawer between BaselineViz and BusinessImpact.
 *
 * Features:
 *  - Backend-fetched driver / suppressor SHAP contributions
 *  - Animated horizontal bar chart (amber = driver, rose = suppressor)
 *  - Backend narrative summary paragraph
 *  - SHAP-enhanced vs z-score confidence comparison
 *  - reconstruction_quality badge + used_fallbacks list
 *  - anomaly_type_note caveat for INVENTORY_SHOCK / FORECAST_MISS
 *  - SHAP math validation display (base + Σshap ≈ predicted)
 *  - Loading skeleton / explainer_ready=false fallback states
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, AlertTriangle, Info, TrendingUp, TrendingDown,
  Loader2, CheckCircle2, HelpCircle, ShieldCheck,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import anomalyApi, { type AnomalyDriverItem, type AnomalyExplainResponse } from '@/services/anomalyApi';

// ── Quality Badge ─────────────────────────────────────────────────────

function QualityBadge({ quality, fallbacks }: { quality: string; fallbacks: string[] }) {
  const cfg: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
    full:    { label: 'Full', color: 'text-accent-400',   bg: 'bg-accent-500/10 border-accent-500/25',   icon: CheckCircle2 },
    partial: { label: 'Partial', color: 'text-warning-400', bg: 'bg-warning-500/10 border-warning-500/25', icon: AlertTriangle },
    minimal: { label: 'Minimal', color: 'text-danger-400',  bg: 'bg-danger-500/10 border-danger-500/25',  icon: AlertTriangle },
    unknown: { label: 'Unknown', color: 'text-surface-500', bg: 'bg-surface-800/40 border-surface-700/30', icon: HelpCircle },
  };
  const c = cfg[quality] ?? cfg.unknown;
  const Icon = c.icon;
  const LABEL_MAP: Record<string, string> = {
    lag_1: 'last-week lag', lag_4: '4-week lag',
    week: 'week', month: 'month', year: 'year',
  };
  return (
    <span
      title={
        fallbacks.length
          ? `Fallback features: ${fallbacks.map(f => LABEL_MAP[f] ?? f).join(', ')} — estimated from rolling baseline`
          : 'All features reconstructed from Forecast table'
      }
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold cursor-help',
        c.bg, c.color,
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {c.label} reconstruction
    </span>
  );
}

// ── Driver Bar ────────────────────────────────────────────────────────

function DriverBar({
  item, maxAbs, isDriver,
}: {
  item: AnomalyDriverItem;
  maxAbs: number;
  isDriver: boolean;
}) {
  const pct = maxAbs > 0 ? (item.abs_shap / maxAbs) * 100 : 0;
  const barColor = isDriver
    ? 'bg-gradient-to-r from-amber-500/80 to-amber-400/60'
    : 'bg-gradient-to-r from-rose-500/80 to-rose-400/60';
  const valueColor = isDriver ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="flex items-center gap-2.5 py-1">
      {/* Feature label */}
      <div className="w-32 flex-shrink-0">
        <p className="text-[10px] font-medium text-surface-300 truncate" title={item.label}>
          {item.label}
        </p>
        <p className="text-[8px] text-surface-600 font-mono">
          val={formatNumber(item.feature_value)}
        </p>
      </div>

      {/* Animated bar */}
      <div className="flex-1 bg-surface-800/40 rounded-full h-2 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* SHAP value */}
      <div className={cn('w-16 text-right font-mono text-[10px] font-bold', valueColor)}>
        {item.shap_value >= 0 ? '+' : ''}{item.shap_value.toFixed(1)}
      </div>
    </div>
  );
}

// ── Driver Section ────────────────────────────────────────────────────

function DriversSection({ drivers, suppressors }: { drivers: AnomalyDriverItem[]; suppressors: AnomalyDriverItem[] }) {
  const allItems = [...drivers, ...suppressors];
  const maxAbs = Math.max(...allItems.map(d => d.abs_shap), 0.001);

  return (
    <div className="space-y-3">
      {drivers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80">
              Drivers — raised predicted demand
            </p>
          </div>
          <div className="space-y-0.5">
            {drivers.map(item => (
              <DriverBar key={item.feature} item={item} maxAbs={maxAbs} isDriver />
            ))}
          </div>
        </div>
      )}

      {suppressors.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown className="w-3 h-3 text-rose-400" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-rose-400/80">
              Suppressors — reduced predicted demand
            </p>
          </div>
          <div className="space-y-0.5">
            {suppressors.map(item => (
              <DriverBar key={item.feature} item={item} maxAbs={maxAbs} isDriver={false} />
            ))}
          </div>
        </div>
      )}

      {drivers.length === 0 && suppressors.length === 0 && (
        <p className="text-[10px] text-surface-500 text-center py-2">
          No significant SHAP contributions (model output is near the SHAP baseline).
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
    <div className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-3 space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-surface-500">
        Detection Confidence
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className={cn('w-3.5 h-3.5', isEnhanced ? 'text-accent-400' : 'text-primary-400')} />
            <span className={cn('text-sm font-bold font-mono', isEnhanced ? 'text-accent-400' : 'text-primary-400')}>
              {confidenceShap.toFixed(1)}%
            </span>
            {isEnhanced && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-400 border border-accent-500/25 font-semibold">
                SHAP-enhanced
              </span>
            )}
          </div>
          {zBased != null && isEnhanced && (
            <p className="text-[9px] text-surface-500">
              ↑ from z-score baseline of {zBased}%
              · boosted by driver agreement
            </p>
          )}
          {!isEnhanced && (
            <p className="text-[9px] text-surface-500">
              Based on z-score (SHAP provides no additional boost)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SHAP Math Note ────────────────────────────────────────────────────

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
  const isValid = diff < 1.0;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 flex items-start gap-2',
        isValid
          ? 'bg-accent-500/5 border-accent-500/20'
          : 'bg-warning-500/5 border-warning-500/20',
      )}
      title={`base(${baseValue.toFixed(1)}) + Σshap(${shapSum.toFixed(1)}) = ${computed.toFixed(1)} ≈ predicted(${predicted.toFixed(1)}), diff=${diff.toFixed(3)}`}
    >
      <Info className={cn('w-3 h-3 mt-0.5 flex-shrink-0', isValid ? 'text-accent-400/70' : 'text-warning-400/70')} />
      <p className="text-[9px] text-surface-500">
        <span className="font-mono text-surface-400">
          base({baseValue.toFixed(0)}) + Σshap({shapSum.toFixed(0)}) ≈ {computed.toFixed(0)}
        </span>
        {' '}·{' '}
        {isValid
          ? <span className="text-accent-400">SHAP math valid (diff = {diff.toFixed(2)})</span>
          : <span className="text-warning-400">diff = {diff.toFixed(2)} — may reflect seasonal post-processing</span>
        }
      </p>
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

  useEffect(() => {
    if (!anomalyId) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);

    anomalyApi.getExplain(anomalyId)
      .then(({ data: resp }) => {
        if (!cancelled) setData(resp);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load SHAP explanation.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [anomalyId]);

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">
            Root-Cause Analysis
          </p>
          <Loader2 className="w-3 h-3 text-surface-500 animate-spin" />
        </div>
        <div className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-4 space-y-2">
          {[70, 50, 85, 40].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2.5 skeleton rounded" style={{ width: 120 }} />
              <div className="flex-1 h-2 skeleton rounded-full" style={{ maxWidth: `${w}%` }} />
              <div className="h-2.5 skeleton rounded w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Network error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-danger-500/5 border border-danger-500/20 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-danger-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[10px] font-semibold text-danger-400">Explanation unavailable</p>
          <p className="text-[9px] text-surface-500 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  // ── Explainer not ready ──────────────────────────────────────────
  if (data && !data.explainer_ready) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-surface-500" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">
            Root-Cause Analysis
          </p>
        </div>
        <div className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-4 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-surface-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-surface-400">SHAP explanation unavailable</p>
            <p className="text-[10px] text-surface-500 mt-1">
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
      className="space-y-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">
            Root-Cause Analysis
          </p>
          <span className="text-[9px] text-surface-600">· SHAP · {data.model_version_tag}</span>
          {data.cached && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-surface-800/60 text-surface-500 border border-surface-700/30">
              cached
            </span>
          )}
        </div>
        <QualityBadge quality={data.reconstruction_quality} fallbacks={data.used_fallbacks} />
      </div>

      {/* Main panel */}
      <div className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-3.5 space-y-4">

        {/* Narrative summary */}
        {data.narrative_summary && (
          <div className="bg-surface-800/30 border border-surface-700/30 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
              AI Summary
            </p>
            <p className="text-xs text-surface-300 leading-relaxed">
              {data.narrative_summary}
            </p>
          </div>
        )}

        {/* Drivers + Suppressors */}
        <DriversSection drivers={data.drivers} suppressors={data.suppressors} />

        {/* Confidence row */}
        <ConfidenceRow
          confidenceShap={data.confidence_shap ?? null}
          confidenceSource={data.confidence_source}
          baseZ={zScore ?? null}
        />

        {/* SHAP math note */}
        <ShapMathNote
          baseValue={data.base_value ?? null}
          allShap={data.all_shap ?? null}
          predicted={data.predicted_at_anomaly ?? null}
        />

        {/* Anomaly type caveat */}
        {data.anomaly_type_note && (
          <div className="bg-warning-500/5 border border-warning-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
            <Info className="w-3 h-3 text-warning-400 mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-surface-400 leading-relaxed">{data.anomaly_type_note}</p>
          </div>
        )}

        {/* Fallback note */}
        {data.used_fallbacks.length > 0 && (
          <p className="text-[8px] text-surface-600 italic">
            * {data.used_fallbacks.map(f => ({ lag_1: 'Last-week demand', lag_4: '4-week-ago demand' }[f] ?? f)).join(', ')}{' '}
            estimated from rolling baseline (no Forecast row found for that date).
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default AnomalyExplainPanel;
