/**
 * AnomalyInvestigationDrawer — Phase 4B.6
 *
 * Sections 4, 5, 6, 7 of the enterprise spec.
 * Now uses REAL data from GET /api/v1/anomalies/{id}/context:
 *  - Real historical demand/inventory series (12w before + 4w after)
 *  - Rolling baseline computed from actual Forecast table records
 *  - Confidence bands from forecast model (confidence_lower / confidence_upper)
 *  - Revenue impact using Product.price × unit deviation (NO hardcoded unit value)
 *  - Inventory, stockout, and forecast confidence impacts from real deviation
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Flame, AlertTriangle, Info, TrendingUp, TrendingDown,
  Package, BarChart2, Target, DollarSign, AlertCircle,
  CheckCircle2, Zap, Loader2, Tag, Hash,
} from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import { SeverityBadge, TypeBadge, SEVERITY_CONFIG } from './AnomalyBadges';
import anomalyApi from '@/services/anomalyApi';
import type { Anomaly, AnomalyType, AnomalySeverity, AnomalyContextResponse, AnomalyContextPoint } from '@/types/anomaly';

// ── Severity Explanation ──────────────────────────────────────────────

function getSeverityExplanation(severity: AnomalySeverity, zScore: number | null): string {
  const z = zScore?.toFixed(2) ?? '?';
  const map: Record<AnomalySeverity, string> = {
    critical: `Z-score of ${z}σ exceeds the critical threshold (≥4σ). This represents an extremely rare statistical event (>99.99th percentile) requiring immediate intervention.`,
    medium: `Z-score of ${z}σ exceeds the medium threshold (≥3σ). A statistically significant deviation in roughly the top 0.3% of events — warrants prompt review.`,
    low: `Z-score of ${z}σ exceeds the low alert threshold (≥2σ). A notable deviation in the top ~5% of events — monitor and investigate if trend continues.`,
  };
  return map[severity];
}

// ── Baseline Visualization — Real SVG chart ───────────────────────────

function BaselineViz({ series, anomaly }: { series: AnomalyContextPoint[]; anomaly: Anomaly }) {
  if (!series.length) {
    return (
      <div className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-4 text-center">
        <p className="text-xs text-surface-500">No historical series data available for this anomaly.</p>
        <p className="text-[10px] text-surface-600 mt-1">Run a scan first to populate Forecast records.</p>
      </div>
    );
  }

  const hasConfBand = series.some((p) => p.confidence_lower !== null && p.confidence_upper !== null);
  const anomalyPoint = series.find((p) => p.is_anomaly);

  // Build SVG paths
  const W = 300, H = 80, PAD = 4;
  const actuals = series.map((p) => p.actual ?? 0);
  const baselines = series.map((p) => p.baseline ?? 0);
  const lowers = hasConfBand ? series.map((p) => p.confidence_lower ?? 0) : [];
  const uppers = hasConfBand ? series.map((p) => p.confidence_upper ?? 0) : [];

  const allVals = [...actuals, ...baselines, ...lowers, ...uppers];
  const minV = Math.min(...allVals) * 0.9;
  const maxV = Math.max(...allVals) * 1.1 || 1;

  const toX = (i: number) => PAD + (i / (series.length - 1 || 1)) * (W - 2 * PAD);
  const toY = (v: number) => PAD + H - PAD - ((v - minV) / (maxV - minV)) * (H - 2 * PAD);

  const pathFor = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');

  const actualPath = pathFor(actuals);
  const baselinePath = pathFor(baselines);

  // Confidence band polygon
  const bandPath = hasConfBand
    ? [
        ...lowers.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`),
        ...[...uppers].reverse().map((v, i) => {
          const ri = uppers.length - 1 - i;
          return `L ${toX(ri).toFixed(1)} ${toY(v).toFixed(1)}`;
        }),
        'Z',
      ].join(' ')
    : '';

  const isPositive = (anomaly.deviation_pct ?? 0) > 0;
  const anomalyColor = isPositive ? '#34d399' : '#f87171';

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">
        Historical Context ({series.length} data points)
      </p>

      <div className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-3 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
          {/* Confidence band */}
          {hasConfBand && bandPath && (
            <path d={bandPath} fill="rgba(99,102,241,0.10)" />
          )}

          {/* Baseline (expected) line */}
          <path d={baselinePath} fill="none"
            stroke="rgba(99,102,241,0.5)" strokeWidth="1.5"
            strokeDasharray="4,3" strokeLinecap="round" />

          {/* Actual series line */}
          <path d={actualPath} fill="none"
            stroke="rgba(99,102,241,0.8)" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Anomaly point marker */}
          {anomalyPoint && (() => {
            const idx = series.findIndex((p) => p.is_anomaly);
            const ax = toX(idx);
            const ay = toY(anomalyPoint.actual ?? 0);
            return (
              <>
                {/* Vertical line to anomaly */}
                <line x1={ax} y1={PAD} x2={ax} y2={H - PAD}
                  stroke={anomalyColor} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
                {/* Outer glow ring */}
                <circle cx={ax} cy={ay} r="7"
                  fill="none" stroke={anomalyColor} strokeWidth="1" opacity="0.35" />
                {/* Main dot */}
                <circle cx={ax} cy={ay} r="4"
                  fill={anomalyColor} stroke="#09090b" strokeWidth="1.5" />
              </>
            );
          })()}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-[9px] text-surface-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="6"><line x1="0" y1="3" x2="12" y2="3" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
            Rolling Baseline
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="12" height="6"><line x1="0" y1="3" x2="12" y2="3" stroke="rgba(99,102,241,0.8)" strokeWidth="1.8" /></svg>
            Actual Demand
          </span>
          {hasConfBand && (
            <span className="flex items-center gap-1.5">
              <svg width="12" height="6"><rect width="12" height="6" fill="rgba(99,102,241,0.15)" rx="1" /></svg>
              Confidence Band
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg width="8" height="8"><circle cx="4" cy="4" r="3.5" fill={anomalyColor} /></svg>
            Anomaly Event
          </span>
        </div>

        {/* X-axis labels */}
        {series.length > 1 && (
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-surface-600">{series[0].date}</span>
            <span className="text-[9px] text-surface-600">{series[series.length - 1].date}</span>
          </div>
        )}
      </div>

      {/* Value cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Expected', value: anomaly.expected_value != null ? formatNumber(anomaly.expected_value) : '—', color: 'text-primary-400' },
          { label: 'Actual', value: anomaly.actual_value != null ? formatNumber(anomaly.actual_value) : '—', color: isPositive ? 'text-accent-400' : 'text-danger-400' },
          {
            label: 'Difference',
            value: anomaly.deviation_pct != null
              ? `${anomaly.deviation_pct > 0 ? '+' : ''}${anomaly.deviation_pct.toFixed(1)}%`
              : '—',
            color: isPositive ? 'text-accent-400' : 'text-danger-400',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-surface-600 uppercase tracking-wider mb-1">{label}</p>
            <p className={cn('text-sm font-bold font-mono', color)}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Business Impact Panel (real data) ─────────────────────────────────

function BusinessImpactPanel({ ctx }: { ctx: AnomalyContextResponse }) {
  const isEstimated = ctx.revenue_impact_is_estimated;

  // Build the revenue sub-label with price source explanation
  const revSub = isEstimated
    ? ctx.unit_price_used
      ? `Org. weighted avg: ${formatCurrency(ctx.unit_price_used)}/unit`
      : 'Org. weighted avg price'
    : ctx.product_price != null
    ? `@ ${formatCurrency(ctx.product_price)}/unit (exact)`
    : 'Product price unavailable';

  const items = [
    {
      label: isEstimated ? 'Estimated Revenue Impact' : 'Revenue Impact',
      value: ctx.revenue_impact != null ? `~${formatCurrency(ctx.revenue_impact)}` : 'N/A',
      sub: revSub,
      tooltip: isEstimated
        ? 'Estimated using organization-wide weighted average unit value (total revenue ÷ total units sold).'
        : ctx.product_price != null
        ? `Exact product price of ${formatCurrency(ctx.product_price)} used.`
        : 'No product pricing data available.',
      icon: DollarSign,
      color: ctx.revenue_impact != null && ctx.revenue_impact > 5000 ? 'text-danger-400' : 'text-warning-400',
      bg: ctx.revenue_impact != null && ctx.revenue_impact > 5000 ? 'bg-danger-500/10' : 'bg-warning-500/10',
      showEstBadge: isEstimated,
    },
    {
      label: 'Inventory Impact',
      value: ctx.inventory_impact != null ? `~${formatNumber(ctx.inventory_impact)} units` : '—',
      sub: '|actual − expected| units',
      tooltip: 'Absolute unit difference between actual observed value and rolling baseline.',
      icon: Package,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
      showEstBadge: false,
    },
    {
      label: 'Stockout Risk',
      value: ctx.stockout_risk_pct != null ? `${ctx.stockout_risk_pct.toFixed(0)}%` : '—',
      sub: ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 60 ? 'Critical exposure' : ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 30 ? 'Elevated risk' : 'Moderate risk',
      tooltip: 'Estimated stockout probability derived from anomaly type and deviation magnitude.',
      icon: AlertCircle,
      color: ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 60 ? 'text-danger-400' : ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 30 ? 'text-warning-400' : 'text-accent-400',
      bg: ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 60 ? 'bg-danger-500/10' : 'bg-warning-500/10',
      showEstBadge: false,
    },
    {
      label: 'Forecast Accuracy Hit',
      value: ctx.forecast_confidence_impact != null ? `-${ctx.forecast_confidence_impact.toFixed(0)}%` : '—',
      sub: 'Model confidence reduction',
      tooltip: 'Estimated reduction in forecast model accuracy due to this anomaly event.',
      icon: Target,
      color: 'text-danger-400',
      bg: 'bg-danger-500/10',
      showEstBadge: false,
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">Business Impact</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ label, value, sub, tooltip, icon: Icon, color, bg, showEstBadge }) => (
          <div
            key={label}
            title={tooltip}
            className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-3 flex items-start gap-2 cursor-help group relative"
          >
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', bg)}>
              <Icon className={cn('w-3.5 h-3.5', color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <p className="text-[9px] text-surface-500 uppercase tracking-wider leading-tight">{label}</p>
                {showEstBadge && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-warning-500/15 text-warning-400 border border-warning-500/20 font-semibold leading-none">
                    EST
                  </span>
                )}
              </div>
              <p className={cn('text-sm font-bold font-mono mt-0.5', color)}>{value}</p>
              {sub && <p className="text-[8px] text-surface-600 mt-0.5 leading-tight">{sub}</p>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-surface-600 italic">
        {isEstimated
          ? '* Revenue estimated using org-wide weighted avg unit price (Σ revenue ÷ Σ units). Hover cards for details.'
          : '* Revenue uses exact product price from database. Hover cards for source details.'}
      </p>
    </div>
  );
}

// ── Recommended Actions ───────────────────────────────────────────────

const ACTIONS: Record<AnomalyType, { icon: any; title: string; steps: string[] }> = {
  demand_spike: {
    icon: TrendingUp,
    title: 'Demand Spike Response',
    steps: [
      'Expedite replenishment orders immediately',
      'Review supplier lead times & capacity',
      'Increase safety stock for this SKU',
      'Validate if spike is seasonal or one-off',
      'Alert procurement & warehouse teams',
    ],
  },
  demand_drop: {
    icon: TrendingDown,
    title: 'Demand Drop Response',
    steps: [
      'Pause or reduce open purchase orders',
      'Investigate root cause (price, competition, seasonality)',
      'Review promotions or clearance options',
      'Adjust safety stock targets downward',
      'Flag for sales & marketing review',
    ],
  },
  inventory_shock: {
    icon: Package,
    title: 'Inventory Shock Response',
    steps: [
      'Conduct immediate physical stock count',
      'Reconcile WMS with ERP system data',
      'Identify source: write-off, theft, receiving error',
      'Correct system records & update forecasts',
      'Review receiving & fulfillment processes',
    ],
  },
  forecast_miss: {
    icon: BarChart2,
    title: 'Forecast Miss Response',
    steps: [
      'Review external events on the anomaly date',
      'Validate data quality & completeness',
      'Retrain ML model with corrected data',
      'Adjust model parameters for this product',
      'Add new feature signals to the model',
    ],
  },
};

function RecommendedActions({ type }: { type: AnomalyType }) {
  const action = ACTIONS[type];
  const Icon = action.icon;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-warning-400" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">Recommended Actions</p>
      </div>
      <div className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-warning-500/10 flex items-center justify-center">
            <Icon className="w-3 h-3 text-warning-400" />
          </div>
          <span className="text-xs font-semibold text-surface-200">{action.title}</span>
        </div>
        {action.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full border border-primary-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[8px] font-bold text-primary-400">{i + 1}</span>
            </div>
            <p className="text-xs text-surface-300 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────

interface Props {
  anomaly: Anomaly | null;
  onClose: () => void;
  onResolve: (ids: number[]) => void;
}

export function AnomalyInvestigationDrawer({ anomaly, onClose, onResolve }: Props) {
  const [ctx, setCtx] = useState<AnomalyContextResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch real context data whenever the drawer opens on a new anomaly
  useEffect(() => {
    if (!anomaly) {
      setCtx(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setCtx(null);
    anomalyApi.getContext(anomaly.id)
      .then(({ data }) => {
        if (!cancelled) setCtx(data);
      })
      .catch(() => {
        if (!cancelled) setCtx(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [anomaly?.id]);

  if (!anomaly) return null;

  const sevExplanation = getSeverityExplanation(anomaly.severity, ctx?.z_score ?? anomaly.z_score);
  const confidence = ctx?.confidence ?? null;

  return (
    <AnimatePresence>
      {anomaly && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full z-50 w-full max-w-lg bg-surface-900 border-l border-surface-800/60 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-surface-800/60 bg-surface-900/95 flex-shrink-0">
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  SEVERITY_CONFIG[anomaly.severity].bg)}>
                  {(() => {
                    const Icon = SEVERITY_CONFIG[anomaly.severity].icon;
                    return <Icon className={cn('w-5 h-5', SEVERITY_CONFIG[anomaly.severity].color)} />;
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={anomaly.anomaly_type} />
                    <SeverityBadge severity={anomaly.severity} />
                    {loading && <Loader2 className="w-3 h-3 text-surface-500 animate-spin" />}
                  </div>
                  <p className="text-[10px] text-surface-500 mt-1">
                    Anomaly #{anomaly.id} · {anomaly.event_date ?? new Date(anomaly.detected_at).toLocaleDateString()}
                  </p>
                  {ctx?.product_name && (
                    <p className="text-[10px] text-primary-400 mt-0.5 flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      {ctx.product_name}
                      {ctx.product_sku && <span className="text-surface-500">· SKU: {ctx.product_sku}</span>}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-surface-800/50 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Core Stats */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-2">Detection Details</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: 'Z-Score',
                      value: (ctx?.z_score ?? anomaly.z_score)?.toFixed(3) ?? '—',
                      color: 'text-surface-100',
                    },
                    {
                      label: 'Deviation',
                      value: anomaly.deviation_pct != null
                        ? `${anomaly.deviation_pct > 0 ? '+' : ''}${anomaly.deviation_pct.toFixed(1)}%`
                        : '—',
                      color: (anomaly.deviation_pct ?? 0) > 0 ? 'text-accent-400' : 'text-danger-400',
                    },
                    {
                      label: 'Confidence',
                      value: confidence != null ? `${confidence}%` : '—',
                      color: confidence != null && confidence > 85 ? 'text-accent-400'
                        : confidence != null && confidence > 70 ? 'text-warning-400' : 'text-primary-400',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-surface-800/40 border border-surface-700/40 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] text-surface-500 uppercase tracking-wider mb-1">{label}</p>
                      <p className={cn('text-sm font-bold font-mono', color)}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-2">Anomaly Explanation</p>
                <div className="bg-surface-800/30 border border-surface-700/40 rounded-xl p-3">
                  <p className="text-sm text-surface-200 leading-relaxed">
                    {anomaly.explanation ?? 'No explanation available for this anomaly.'}
                  </p>
                </div>
              </div>

              {/* Severity Explanation */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-2">Severity Rationale</p>
                <div className={cn('border rounded-xl p-3', SEVERITY_CONFIG[anomaly.severity].bg, SEVERITY_CONFIG[anomaly.severity].border)}>
                  <p className="text-xs leading-relaxed text-surface-300">{sevExplanation}</p>
                </div>
              </div>

              {/* Baseline Visualization — Real Data */}
              {loading ? (
                <div className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-6 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                  <p className="text-xs text-surface-500">Loading real historical context…</p>
                </div>
              ) : (
                <BaselineViz series={ctx?.series ?? []} anomaly={anomaly} />
              )}

              {/* Business Impact — Real product pricing */}
              {ctx && !loading && (
                <BusinessImpactPanel ctx={ctx} />
              )}
              {loading && (
                <div className="space-y-2">
                  <div className="h-3 skeleton w-32" />
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              <RecommendedActions type={anomaly.anomaly_type} />

              {/* Record Details */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-2">Record Details</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Detected At', value: new Date(anomaly.detected_at).toLocaleString() },
                    { label: 'Event Date', value: anomaly.event_date ?? '—' },
                    { label: 'Status', value: anomaly.is_resolved ? 'Resolved' : 'Active' },
                    {
                      label: 'Product',
                      value: ctx?.product_name
                        ? `${ctx.product_name} (#${anomaly.product_id})`
                        : anomaly.product_id ? `#${anomaly.product_id}` : 'Aggregate',
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-800/30 border border-surface-700/30 rounded-lg p-2">
                      <p className="text-[9px] text-surface-500 uppercase tracking-wider">{label}</p>
                      <p className="text-surface-200 font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer Action */}
            {!anomaly.is_resolved && (
              <div className="px-5 py-4 border-t border-surface-800/50 flex-shrink-0 bg-surface-900/95">
                <button
                  id="drawer-resolve-btn"
                  onClick={() => { onResolve([anomaly.id]); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-accent-500/15 text-accent-400 border border-accent-500/25 hover:bg-accent-500/25 transition-all duration-200"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Resolved
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
