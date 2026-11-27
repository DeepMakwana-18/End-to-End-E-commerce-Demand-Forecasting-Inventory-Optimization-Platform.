/**
 * AnomalyInvestigationDrawer — Phase 4B.6 (Refined for Titan AI)
 *
 * Reading Order:
 *   1. Header — Identity, Severity, Product, and Date
 *   2. Observed vs Expected & Deviation Summary
 *   3. Detection Evidence — Historical Context Chart, Detection Metrics, Explanation & Severity Rationale
 *   4. Confidence & Attribution Limitations (AnomalyExplainPanel)
 *   5. Business Impact (real product/org pricing)
 *   6. Recommended Actions
 *   7. Record Details
 *   8. Fixed Footer Action (Mark as Resolved) — clears floating AI Copilot trigger when open
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X, TrendingUp, TrendingDown, Package, BarChart2,
  Target, DollarSign, AlertCircle, CheckCircle2, Zap,
  Loader2, Tag,
} from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import { SeverityBadge, TypeBadge, SEVERITY_CONFIG } from './AnomalyBadges';
import { AnomalyExplainPanel } from './AnomalyExplainPanel';
import { useAppStore } from '@/stores/appStore';
import anomalyApi from '@/services/anomalyApi';
import type {
  Anomaly, AnomalyType, AnomalySeverity,
  AnomalyContextResponse, AnomalyContextPoint,
} from '@/types/anomaly';

// ── Severity Explanation ──────────────────────────────────────────────

function getSeverityExplanation(severity: AnomalySeverity, zScore: number | null): string {
  const z = zScore?.toFixed(2) ?? '?';
  const map: Record<AnomalySeverity, string> = {
    critical: `Z-score of ${z}σ exceeds the critical threshold (≥4σ), representing an extreme statistical event (>99.99th percentile) requiring immediate intervention.`,
    medium: `Z-score of ${z}σ exceeds the medium threshold (≥3σ), a statistically significant deviation in roughly the top 0.3% of events warranting prompt review.`,
    low: `Z-score of ${z}σ exceeds the low alert threshold (≥2σ), a notable deviation in the top ~5% of events — monitor if the trend continues.`,
  };
  return map[severity];
}

// ── Baseline Visualization — Real SVG chart ───────────────────────────

function BaselineViz({ series, anomaly }: { series: AnomalyContextPoint[]; anomaly: Anomaly }) {
  if (!series.length) {
    return (
      <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-4 text-center">
        <p className="text-xs font-medium text-[#52525b] dark:text-[#a1a1aa]">
          No historical series data available for this anomaly.
        </p>
        <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-1">
          Run an anomaly scan to populate Forecast context records.
        </p>
      </div>
    );
  }

  const hasConfBand = series.some((p) => p.confidence_lower !== null && p.confidence_upper !== null);
  const anomalyPoint = series.find((p) => p.is_anomaly);

  const W = 300;
  const H = 80;
  const PAD = 4;
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
  const anomalyColor = isPositive ? '#059669' : '#dc2626';

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
        Historical Context ({series.length} data points)
      </p>

      <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none" aria-label="Historical baseline comparison chart">
          {hasConfBand && bandPath && (
            <path d={bandPath} fill="rgba(30,63,200,0.12)" />
          )}

          <path
            d={baselinePath}
            fill="none"
            stroke="#52525b"
            strokeOpacity="0.65"
            strokeWidth="1.5"
            strokeDasharray="4,3"
            strokeLinecap="round"
          />

          <path
            d={actualPath}
            fill="none"
            stroke="#1e3fc8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {anomalyPoint && (() => {
            const idx = series.findIndex((p) => p.is_anomaly);
            const ax = toX(idx);
            const ay = toY(anomalyPoint.actual ?? 0);
            return (
              <>
                <line
                  x1={ax}
                  y1={PAD}
                  x2={ax}
                  y2={H - PAD}
                  stroke={anomalyColor}
                  strokeWidth="0.9"
                  strokeDasharray="2,2"
                  opacity="0.65"
                />
                <circle cx={ax} cy={ay} r="6.5" fill="none" stroke={anomalyColor} strokeWidth="1" opacity="0.4" />
                <circle cx={ax} cy={ay} r="3.8" fill={anomalyColor} stroke="#ffffff" strokeWidth="1.2" />
              </>
            );
          })()}
        </svg>

        <div className="flex items-center gap-4 mt-2 text-[10px] font-medium text-[#52525b] dark:text-[#a1a1aa] flex-wrap">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="6" aria-hidden="true"><line x1="0" y1="3" x2="12" y2="3" stroke="#52525b" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
            Rolling Baseline
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="12" height="6" aria-hidden="true"><line x1="0" y1="3" x2="12" y2="3" stroke="#1e3fc8" strokeWidth="1.8" /></svg>
            Observed Series
          </span>
          {hasConfBand && (
            <span className="flex items-center gap-1.5">
              <svg width="12" height="6" aria-hidden="true"><rect width="12" height="6" fill="rgba(30,63,200,0.22)" rx="1" /></svg>
              Confidence Band
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="3.5" fill={anomalyColor} /></svg>
            Anomaly Event
          </span>
        </div>

        {series.length > 1 && (
          <div className="flex justify-between mt-1.5 text-[10px] font-mono text-[#52525b] dark:text-[#a1a1aa]">
            <span>{series[0].date}</span>
            <span>{series[series.length - 1].date}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Business Impact Panel (real data) ─────────────────────────────────

function BusinessImpactPanel({ ctx }: { ctx: AnomalyContextResponse }) {
  const isEstimated = ctx.revenue_impact_is_estimated;

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
      color: ctx.revenue_impact != null && ctx.revenue_impact > 5000
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-amber-700 dark:text-amber-400',
      bg: ctx.revenue_impact != null && ctx.revenue_impact > 5000
        ? 'bg-[#fee2e2] dark:bg-rose-950/50'
        : 'bg-[#fffbeb] dark:bg-amber-950/50',
      showEstBadge: isEstimated,
    },
    {
      label: 'Inventory Impact',
      value: ctx.inventory_impact != null ? `~${formatNumber(ctx.inventory_impact)} units` : '—',
      sub: '|actual − expected| units',
      tooltip: 'Absolute unit difference between actual observed value and rolling baseline.',
      icon: Package,
      color: 'text-[#1e3fc8] dark:text-[#60a5fa]',
      bg: 'bg-[#eff6ff] dark:bg-[#1e3fc8]/20',
      showEstBadge: false,
    },
    {
      label: 'Stockout Risk',
      value: ctx.stockout_risk_pct != null ? `${ctx.stockout_risk_pct.toFixed(0)}%` : '—',
      sub: ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 60
        ? 'Critical exposure'
        : ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 30
          ? 'Elevated risk'
          : 'Moderate risk',
      tooltip: 'Estimated stockout probability derived from anomaly type and deviation magnitude.',
      icon: AlertCircle,
      color: ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 60
        ? 'text-rose-700 dark:text-rose-400'
        : ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 30
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-emerald-700 dark:text-emerald-400',
      bg: ctx.stockout_risk_pct != null && ctx.stockout_risk_pct > 60
        ? 'bg-[#fee2e2] dark:bg-rose-950/50'
        : 'bg-[#fffbeb] dark:bg-amber-950/50',
      showEstBadge: false,
    },
    {
      label: 'Forecast Accuracy Hit',
      value: ctx.forecast_confidence_impact != null ? `-${ctx.forecast_confidence_impact.toFixed(0)}%` : '—',
      sub: 'Model confidence reduction',
      tooltip: 'Estimated reduction in forecast model accuracy due to this anomaly event.',
      icon: Target,
      color: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-[#fee2e2] dark:bg-rose-950/50',
      showEstBadge: false,
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
        Business Impact
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map(({ label, value, sub, tooltip, icon: Icon, color, bg, showEstBadge }) => (
          <div
            key={label}
            title={tooltip}
            className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3 flex items-start gap-2.5 cursor-help"
          >
            <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5', bg)}>
              <Icon className={cn('w-3.5 h-3.5', color)} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.04em] leading-tight">
                  {label}
                </p>
                {showEstBadge && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-[#fffbeb] text-[#92400e] border border-[#fde68a] dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50 font-bold leading-none">
                    EST
                  </span>
                )}
              </div>
              <p className={cn('text-sm font-bold font-mono tabular-nums mt-0.5', color)}>{value}</p>
              {sub && <p className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5 leading-snug">{sub}</p>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
        {isEstimated
          ? 'Revenue impact is estimated using organization-wide weighted average unit price (Σ revenue ÷ Σ units).'
          : 'Revenue impact uses the exact product price from the catalog.'}
      </p>
    </div>
  );
}

// ── Recommended Actions ───────────────────────────────────────────────

const ACTIONS: Record<AnomalyType, { icon: React.ElementType; title: string; steps: string[] }> = {
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
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-[#d97706] dark:text-[#fbbf24]" aria-hidden="true" />
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
          Recommended Actions
        </p>
      </div>
      <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3.5 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[8px] bg-[#fffbeb] dark:bg-amber-950/50 border border-[#fde68a] dark:border-amber-800/50 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-[#d97706] dark:text-[#fbbf24]" aria-hidden="true" />
          </div>
          <span className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">{action.title}</span>
        </div>
        <ol className="space-y-2">
          {action.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-4 h-4 rounded-full bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold font-mono text-[#1e3fc8] dark:text-[#60a5fa]">
                {i + 1}
              </span>
              <span className="text-xs text-[#0a0a0a] dark:text-[#fafaf9] leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
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
  const setActiveDrawerOpen = useAppStore((s) => s.setActiveDrawerOpen);
  const prefersReducedMotion = useReducedMotion();

  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Sync overlay state so floating AI Copilot trigger clears footer actions
  useEffect(() => {
    const isOpen = Boolean(anomaly);
    setActiveDrawerOpen(isOpen);
    return () => setActiveDrawerOpen(false);
  }, [anomaly, setActiveDrawerOpen]);

  // Focus placement, Escape handling, and focus trap while open
  useEffect(() => {
    if (!anomaly) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const timer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [anomaly, onClose]);

  // Fetch real context data whenever the drawer opens on a new anomaly
  useEffect(() => {
    if (!anomaly) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setCtx(null);
      return anomalyApi.getContext(anomaly.id);
    })
      .then((res) => {
        if (!cancelled && res) setCtx(res.data);
      })
      .catch(() => {
        if (!cancelled) setCtx(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [anomaly?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sevExplanation = anomaly
    ? getSeverityExplanation(anomaly.severity, ctx?.z_score ?? anomaly.z_score)
    : '';
  const confidence = ctx?.confidence ?? null;
  const isPositive = (anomaly?.deviation_pct ?? 0) > 0;

  return (
    <AnimatePresence>
      {anomaly && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="anomaly-drawer-title"
            initial={prefersReducedMotion ? false : { x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { x: '100%', opacity: 0.9 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 h-full z-50 w-full max-w-lg bg-white dark:bg-[#111113] border-l border-[#e4e4e7] dark:border-[#27272a] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* 1. Identity, Severity & Date Header */}
            <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex-shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className={cn(
                  'w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 border',
                  SEVERITY_CONFIG[anomaly.severity].bg,
                  SEVERITY_CONFIG[anomaly.severity].border,
                )}>
                  {(() => {
                    const Icon = SEVERITY_CONFIG[anomaly.severity].icon;
                    return <Icon className={cn('w-5 h-5', SEVERITY_CONFIG[anomaly.severity].color)} aria-hidden="true" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <h2 id="anomaly-drawer-title" className="sr-only">
                    Anomaly #{anomaly.id} Investigation
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={anomaly.anomaly_type} />
                    <SeverityBadge severity={anomaly.severity} />
                    {loading && <Loader2 className="w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa] animate-spin" />}
                  </div>
                  <p className="text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] mt-1">
                    Anomaly #{anomaly.id} · {anomaly.event_date ?? new Date(anomaly.detected_at).toLocaleDateString()}
                  </p>
                  {ctx?.product_name && (
                    <p className="text-xs text-[#1e3fc8] dark:text-[#60a5fa] font-semibold mt-0.5 flex items-center gap-1 truncate">
                      <Tag className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{ctx.product_name}</span>
                      {ctx.product_sku && <span className="text-[#52525b] dark:text-[#a1a1aa] font-normal">· SKU: {ctx.product_sku}</span>}
                    </p>
                  )}
                </div>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="Close investigation drawer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] hover:bg-[#e4e4e7]/60 dark:hover:bg-[#27272a] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
              {/* 2. Observed vs Expected & Deviation */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-2">
                  Observed vs Expected
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3 text-center">
                    <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-1">
                      Expected
                    </p>
                    <p className="text-sm font-bold font-mono tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">
                      {anomaly.expected_value != null ? formatNumber(anomaly.expected_value) : '—'}
                    </p>
                  </div>
                  <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3 text-center">
                    <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-1">
                      Observed
                    </p>
                    <p className={cn(
                      'text-sm font-bold font-mono tabular-nums',
                      isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    )}>
                      {anomaly.actual_value != null ? formatNumber(anomaly.actual_value) : '—'}
                    </p>
                  </div>
                  <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3 text-center">
                    <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-1">
                      Deviation
                    </p>
                    <p className={cn(
                      'text-sm font-bold font-mono tabular-nums',
                      isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    )}>
                      {anomaly.deviation_pct != null
                        ? `${anomaly.deviation_pct > 0 ? '+' : ''}${anomaly.deviation_pct.toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Detection Evidence (Chart, Z-Score/Confidence, Explanation, Severity Rationale) */}
              <div className="space-y-4">
                {loading ? (
                  <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-6 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa] animate-spin" />
                    <p className="text-xs font-medium text-[#52525b] dark:text-[#a1a1aa]">
                      Loading historical baseline context…
                    </p>
                  </div>
                ) : (
                  <BaselineViz series={ctx?.series ?? []} anomaly={anomaly} />
                )}

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-2">
                    Detection Evidence
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-2.5 text-center">
                      <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-0.5">
                        Z-Score
                      </p>
                      <p className="text-sm font-bold font-mono tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">
                        {(ctx?.z_score ?? anomaly.z_score)?.toFixed(3) ?? '—'}σ
                      </p>
                    </div>
                    <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-2.5 text-center">
                      <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-0.5">
                        Signal Confidence
                      </p>
                      <p className="text-sm font-bold font-mono tabular-nums text-[#1e3fc8] dark:text-[#60a5fa]">
                        {confidence != null ? `${confidence}%` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[12px] p-3 mb-2.5">
                    <p className="text-xs font-medium text-[#0a0a0a] dark:text-[#fafaf9] leading-relaxed">
                      {anomaly.explanation ?? 'No explanation available for this anomaly.'}
                    </p>
                  </div>

                  <div className={cn(
                    'border rounded-[12px] p-3',
                    SEVERITY_CONFIG[anomaly.severity].bg,
                    SEVERITY_CONFIG[anomaly.severity].border,
                  )}>
                    <p className="text-xs leading-relaxed text-[#0a0a0a] dark:text-[#fafaf9] font-medium">
                      {sevExplanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Confidence & Attribution Limitations */}
              {!loading && (
                <AnomalyExplainPanel
                  anomalyId={anomaly.id}
                  zScore={ctx?.z_score ?? anomaly.z_score}
                />
              )}

              {/* 5. Business Impact */}
              {ctx && !loading && <BusinessImpactPanel ctx={ctx} />}
              {loading && (
                <div className="space-y-2">
                  <div className="h-3 skeleton w-32 bg-[#e4e4e7] dark:bg-[#27272a] rounded" />
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 skeleton rounded-[12px] bg-[#e4e4e7] dark:bg-[#27272a]" />
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Recommended Actions */}
              <RecommendedActions type={anomaly.anomaly_type} />

              {/* 7. Record Details */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-2">
                  Record Details
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
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
                    <div
                      key={label}
                      className="bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[10px] p-2.5"
                    >
                      <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                        {label}
                      </p>
                      <p className="text-[#0a0a0a] dark:text-[#fafaf9] font-semibold mt-0.5 break-words">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 8. Fixed Footer Action */}
            {!anomaly.is_resolved && (
              <div className="px-5 sm:px-6 py-4 border-t border-[#e4e4e7] dark:border-[#27272a] flex-shrink-0 bg-[#fafaf9] dark:bg-[#18181b]">
                <button
                  id="drawer-resolve-btn"
                  type="button"
                  onClick={() => { onResolve([anomaly.id]); onClose(); }}
                  className="w-full h-11 px-4 rounded-[12px] bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#16a34a]"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Mark as Resolved</span>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
