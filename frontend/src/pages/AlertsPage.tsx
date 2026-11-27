/**
 * Titan AI — Alert Center Page (/app/alerts)
 *
 * Refined with Titan AI editorial design system:
 * - Warm paper / near-black surfaces, editorial header, blue primary actions, semantic severity hierarchy.
 * - Scannable compact alert rows with expandable detail state (stock/reorder/safety, full message, rule ID).
 * - Distinguishes total active alert records from unique affected products and highlights multi-rule SKUs.
 * - Clear separation of Acknowledge, Resolve, and Dismiss (soft-delete) with explicit accessible labels and confirmation.
 * - Fixes WebSocket subscription lifecycle (useEffect with cleanup) and filter popover outside-click dismissal.
 * - Restrained 150-220ms transitions with prefers-reduced-motion support and 44px-class mobile touch targets.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Filter,
  X,
  RefreshCw,
  BrainCircuit,
  Eye,
  Zap,
  ShieldAlert,
  Check,
  Search,
  HelpCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { alertsApi } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from '@/hooks/useToast';
import type { Alert } from '@/types';
import '@/styles/titan-dashboard.css';

// ── Icon + label helpers ─────────────────────────────────────────────

const getAlertIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'stockout':
      return AlertOctagon;
    case 'low_stock':
      return AlertTriangle;
    case 'overstock':
      return Info;
    case 'anomaly_detected':
      return Zap;
    case 'model_accuracy_degraded':
      return BrainCircuit;
    case 'forecast_miss':
      return ShieldAlert;
    default:
      return Bell;
  }
};

const getTypeLabel = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'stockout':
      return 'Stockout Risk';
    case 'low_stock':
      return 'Low Stock';
    case 'reorder':
      return 'Reorder';
    case 'overstock':
      return 'Overstock';
    case 'anomaly_detected':
      return 'Anomaly';
    case 'model_accuracy_degraded':
      return 'Model Degraded';
    case 'forecast_miss':
      return 'Forecast Miss';
    default:
      return type ? type.replace(/_/g, ' ') : 'General Alert';
  }
};

const getProductGroupKey = (alert: Alert): string | null => {
  const sku = alert.extra_data?.sku ? String(alert.extra_data.sku).trim() : '';
  if (sku) return `sku:${sku}`;
  if (alert.product_id !== undefined && alert.product_id !== null) {
    return `prod:${alert.product_id}`;
  }
  return null;
};

/**
 * Produce a concise, scannable 1-line summary preserving exact units without
 * repeating severity, product name, and SKU multiple times in the compact view.
 */
const getConciseKeyFact = (alert: Alert): string => {
  const ed = alert.extra_data;
  if (ed) {
    if (ed.current_stock !== undefined && ed.reorder_point !== undefined) {
      const current = Number(ed.current_stock);
      const rop = Number(ed.reorder_point);
      const deficit = rop - current;
      const deficitText = deficit > 0 ? ` (${deficit} units below ROP)` : '';
      return `Stock: ${current} units · Reorder point: ${rop} units${deficitText}`;
    }
    if (ed.z_score !== undefined) {
      const anomType = ed.anomaly_type ? String(ed.anomaly_type).replace(/_/g, ' ') : 'deviation';
      return `${anomType} · Z-score: ${Number(ed.z_score).toFixed(2)}`;
    }
    if (ed.accuracy !== undefined) {
      return `Model accuracy: ${(Number(ed.accuracy) * 100).toFixed(1)}%`;
    }
  }
  return alert.message;
};

const SEVERITY_LEVELS = ['all', 'critical', 'high', 'medium', 'low'] as const;

const ALERT_TYPE_FILTERS = [
  { id: 'all', label: 'All Types' },
  { id: 'stockout', label: 'Stockout Risk' },
  { id: 'low_stock', label: 'Low Stock' },
  { id: 'reorder', label: 'Reorder' },
  { id: 'forecast_miss', label: 'Forecast Miss' },
  { id: 'overstock', label: 'Overstock' },
  { id: 'anomaly_detected', label: 'Anomaly' },
  { id: 'model_accuracy_degraded', label: 'Model Degraded' },
] as const;

// ── Custom Alert KPI Card ────────────────────────────────────────────

interface AlertKPICardProps {
  title: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  tooltipText: string;
  emphasized?: boolean;
  delayMs?: number;
}

function AlertKPICard({
  title,
  value,
  sub,
  icon: Icon,
  iconColor,
  tooltipText,
  emphasized = false,
  delayMs = 0,
}: AlertKPICardProps) {
  return (
    <div
      style={{ '--reveal-delay': `${delayMs}ms` } as React.CSSProperties}
      className={cn(
        'titan-dash-reveal titan-kpi-wrap',
        emphasized && 'titan-kpi-wrap--emphasized'
      )}
    >
      <div className="titan-kpi-card rounded-[16px] p-5 border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] flex flex-col justify-between min-h-[144px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.08em] truncate">
                {title}
              </p>
              <span
                className="text-[#52525b]/70 hover:text-[#0a0a0a] dark:text-[#a1a1aa]/70 dark:hover:text-[#fafaf9] cursor-help flex-shrink-0"
                title={tooltipText}
                aria-label={tooltipText}
              >
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </div>
            <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#0a0a0a] dark:text-[#fafaf9]">
              {value}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-center flex-shrink-0">
            <Icon className={cn('w-4.5 h-4.5', iconColor)} aria-hidden="true" />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] leading-snug">
          {sub}
        </p>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────

export default function AlertsPage() {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [confirmingDismissId, setConfirmingDismissId] = useState<number | null>(null);
  const [actionErrorById, setActionErrorById] = useState<Record<number, string>>({});
  const [lastScanResult, setLastScanResult] = useState<{
    newAlerts: number;
    timestamp: string;
  } | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilters]);

  // ── Real API data ─────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAll({ limit: 100 }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: () => alertsApi.getStats().then((r) => r.data),
    refetchInterval: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
    queryClient.invalidateQueries({ queryKey: ['kpis'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
  }, [queryClient]);

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) => alertsApi.acknowledge(id),
    onSuccess: (_, id) => {
      setActionErrorById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Alert acknowledged', `Alert #${id} marked as acknowledged.`);
      invalidate();
    },
    onError: (_, id) => {
      setActionErrorById((prev) => ({ ...prev, [id]: 'Failed to acknowledge alert. Try again.' }));
      toast.error('Acknowledge failed', `Could not acknowledge alert #${id}`);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => alertsApi.resolve(id),
    onSuccess: (_, id) => {
      setActionErrorById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Alert resolved', `Alert #${id} resolved and closed.`);
      invalidate();
    },
    onError: (_, id) => {
      setActionErrorById((prev) => ({ ...prev, [id]: 'Failed to resolve alert. Try again.' }));
      toast.error('Resolve failed', `Could not resolve alert #${id}`);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => alertsApi.dismiss(id),
    onSuccess: (_, id) => {
      setActionErrorById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.info('Alert dismissed', `Alert #${id} removed from active registry.`);
      setConfirmingDismissId(null);
      invalidate();
    },
    onError: (_, id) => {
      setActionErrorById((prev) => ({ ...prev, [id]: 'Failed to dismiss alert. Try again.' }));
      toast.error('Dismiss failed', `Could not dismiss alert #${id}`);
      setConfirmingDismissId(null);
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => alertsApi.scanInventory(),
    onSuccess: (res) => {
      const count = res.data.new_alerts;
      setLastScanResult({
        newAlerts: count,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      if (count > 0) {
        toast.warning(
          `${count} new alert${count > 1 ? 's' : ''} found`,
          'Manual inventory rule scan complete.'
        );
      } else {
        toast.success('Scan complete', 'No new alerts — all inventory thresholds compliant.');
      }
      invalidate();
    },
    onError: () => toast.error('Scan failed', 'Could not run inventory scan'),
  });

  // ── WebSocket — auto-refresh on alert events ─────────────────────

  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsub1 = subscribe('alert.triggered', () => { invalidate(); });
    const unsub2 = subscribe('alert.acknowledged', () => { invalidate(); });
    const unsub3 = subscribe('alert.resolved', () => { invalidate(); });
    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
    };
  }, [subscribe, invalidate]);

  // ── Derived data & Filtering ─────────────────────────────────────

  const rawAlerts: Alert[] = useMemo(() => data?.alerts ?? [], [data?.alerts]);
  const activeCount = statsData?.total_active ?? rawAlerts.length;

  const criticalCount =
    statsData?.by_severity?.critical ??
    statsData?.by_severity?.CRITICAL ??
    0;

  const highCount =
    statsData?.by_severity?.high ??
    statsData?.by_severity?.HIGH ??
    0;

  const acknowledgedCount = useMemo(
    () => rawAlerts.filter((a) => a.lifecycle === 'acknowledged').length,
    [rawAlerts]
  );

  // Count alerts per product/SKU so multi-rule SKUs are visually related without merging
  const productRuleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of rawAlerts) {
      const key = getProductGroupKey(alert);
      if (key) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [rawAlerts]);

  const uniqueAffectedProductsCount = productRuleCounts.size;

  // Multi-facet client filtering
  const filteredAlerts = useMemo(() => {
    return rawAlerts.filter((alert) => {
      if (severityFilter !== 'all' && alert.severity?.toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }
      if (typeFilter !== 'all' && alert.alert_type?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (lifecycleFilter !== 'all' && alert.lifecycle?.toLowerCase() !== lifecycleFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = alert.product_name?.toLowerCase().includes(q);
        const skuMatch = String(alert.extra_data?.sku || '').toLowerCase().includes(q);
        const idMatch = String(alert.product_id || '').toLowerCase().includes(q);
        const msgMatch = alert.message?.toLowerCase().includes(q);
        const ruleMatch = String(alert.rule_key || '').toLowerCase().includes(q);
        if (!nameMatch && !skuMatch && !idMatch && !msgMatch && !ruleMatch) return false;
      }
      return true;
    });
  }, [rawAlerts, severityFilter, typeFilter, lifecycleFilter, searchQuery]);

  const filteredUniqueProductsCount = useMemo(() => {
    const keys = new Set<string>();
    for (const alert of filteredAlerts) {
      const key = getProductGroupKey(alert);
      if (key) keys.add(key);
    }
    return keys.size;
  }, [filteredAlerts]);

  const activeFiltersCount =
    (severityFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (lifecycleFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setSeverityFilter('all');
    setTypeFilter('all');
    setLifecycleFilter('all');
    setSearchQuery('');
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* ── 1. Compact Titan Editorial Page Header ───────────────────── */}
      <header
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
        className="titan-dash-reveal pb-6 border-b border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-20"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.13em] text-[#52525b] dark:text-[#a1a1aa]">
            <span className="inline-block w-6 h-[1.5px] bg-[#f59e0b]" aria-hidden="true" />
            <span>ALERT INTELLIGENCE</span>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-[32px] font-extrabold text-[#0a0a0a] dark:text-[#fafaf9] tracking-[-0.02em] leading-[1.15]">
              Alert Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 tabular-nums">
              {activeCount} Active {activeCount === 1 ? 'Alert' : 'Alerts'}
              {uniqueAffectedProductsCount > 0 && ` · ${uniqueAffectedProductsCount} SKUs`}
            </span>
          </div>
          <p className="text-sm text-[#52525b] dark:text-[#a1a1aa] mt-1.5 font-medium">
            Operational incident registry, stockout threshold breaches, and automated rule signals
          </p>
        </div>

        {/* Action Controls (Scan Inventory + Filter) */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-end flex-shrink-0">
          <button
            id="btn-scan-inventory"
            type="button"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            aria-busy={scanMutation.isPending}
            className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-[10px] border text-xs font-semibold inline-flex items-center gap-2 transition-colors bg-[#1e3fc8] hover:bg-[#1935a8] text-white border-[#1e3fc8] disabled:opacity-60 disabled:cursor-wait cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', scanMutation.isPending && 'animate-spin')}
              aria-hidden="true"
            />
            <span>{scanMutation.isPending ? 'Scanning Inventory...' : 'Scan Inventory'}</span>
          </button>

          {/* Filter Toggle */}
          <div className="relative" ref={filterRef}>
            <button
              id="btn-filter-alerts"
              type="button"
              aria-expanded={showFilters}
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'min-h-[44px] sm:min-h-[36px] px-3.5 rounded-[10px] border text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                showFilters || activeFiltersCount > 0
                  ? 'bg-[#0a0a0a] text-[#fafaf9] border-[#0a0a0a] dark:bg-[#fafaf9] dark:text-[#0a0a0a] dark:border-[#fafaf9]'
                  : 'bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] border-[#e4e4e7] dark:border-[#27272a] hover:bg-[#fafaf9] dark:hover:bg-[#18181b]'
              )}
            >
              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {activeFiltersCount === 0 ? 'Filter' : `Filter (${activeFiltersCount})`}
              </span>
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: 6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] p-3.5 z-50 space-y-3 shadow-xl rounded-[14px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#e4e4e7] dark:border-[#27272a]">
                    <span className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                      Filter Registry
                    </span>
                    <div className="flex items-center gap-2">
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-[11px] font-semibold text-[#1e3fc8] dark:text-[#60a5fa] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" /> Reset
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Close filter popover"
                        onClick={() => setShowFilters(false)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[#52525b] hover:text-[#0a0a0a] hover:bg-[#fafaf9] dark:text-[#a1a1aa] dark:hover:bg-[#18181b] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Severity Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-wider block mb-1.5">
                      Severity
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {SEVERITY_LEVELS.map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSeverityFilter(lvl)}
                          className={cn(
                            'text-left px-2.5 py-1.5 rounded-[8px] text-xs font-semibold capitalize flex items-center justify-between transition-colors cursor-pointer',
                            severityFilter === lvl
                              ? 'bg-[#eff6ff] text-[#1e3fc8] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd]'
                              : 'text-[#52525b] dark:text-[#a1a1aa] hover:bg-[#fafaf9] dark:hover:bg-[#18181b]'
                          )}
                        >
                          <span>{lvl === 'all' ? 'All' : lvl}</span>
                          {severityFilter === lvl && <Check className="w-3 h-3" aria-hidden="true" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alert Type Filter */}
                  <div>
                    <label
                      htmlFor="alert-type-select"
                      className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-wider block mb-1.5"
                    >
                      Alert Type
                    </label>
                    <select
                      id="alert-type-select"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full text-xs rounded-[10px] border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3fc8]/25"
                    >
                      {ALERT_TYPE_FILTERS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lifecycle Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-wider block mb-1.5">
                      Lifecycle Status
                    </label>
                    <div className="flex items-center gap-1">
                      {['all', 'active', 'acknowledged'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setLifecycleFilter(st)}
                          className={cn(
                            'flex-1 text-center py-1.5 rounded-[8px] text-xs font-semibold capitalize transition-colors cursor-pointer',
                            lifecycleFilter === st
                              ? 'bg-[#1e3fc8] text-white'
                              : 'bg-[#fafaf9] dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa] hover:bg-[#e4e4e7]/50'
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Manual Scan Feedback Banner (distinct from global Live socket status) */}
      {lastScanResult && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3 rounded-[12px] border border-[#bfdbfe] dark:border-[#1e3fc8]/40 bg-[#eff6ff]/70 dark:bg-[#1e3fc8]/10 text-xs text-[#0a0a0a] dark:text-[#fafaf9] flex items-center justify-between gap-3"
        >
          <span className="font-medium">
            Manual inventory scan completed at <span className="font-mono font-semibold">{lastScanResult.timestamp}</span>:{' '}
            {lastScanResult.newAlerts > 0
              ? `${lastScanResult.newAlerts} new alert${lastScanResult.newAlerts > 1 ? 's' : ''} created.`
              : '0 new alerts — all inventory rules compliant.'}
          </span>
          <button
            type="button"
            onClick={() => setLastScanResult(null)}
            className="text-[11px] font-semibold text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── 2. KPI Summary Strip ─────────────────────────────────────── */}
      <section aria-label="Alert Telemetry Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AlertKPICard
          title="Active Alerts"
          value={isLoading ? '—' : String(activeCount)}
          sub={
            uniqueAffectedProductsCount > 0
              ? `Across ${uniqueAffectedProductsCount} unique affected ${uniqueAffectedProductsCount === 1 ? 'product' : 'products'}`
              : 'Unresolved operational alert records'
          }
          icon={Bell}
          iconColor="text-[#1e3fc8] dark:text-[#60a5fa]"
          tooltipText="Total unresolved alert records in database (distinct from unique affected SKUs when multiple rules fire)"
          emphasized={true}
          delayMs={30}
        />

        <AlertKPICard
          title="Critical"
          value={isLoading ? '—' : String(criticalCount)}
          sub={criticalCount > 0 ? 'Immediate stockout or critical breaches' : 'No critical breaches'}
          icon={AlertOctagon}
          iconColor="text-rose-600 dark:text-rose-400"
          tooltipText="Unresolved alerts classified with critical severity"
          delayMs={60}
        />

        <AlertKPICard
          title="High"
          value={isLoading ? '—' : String(highCount)}
          sub={highCount > 0 ? 'Threshold breaches and reorder risks' : 'No elevated risks'}
          icon={AlertTriangle}
          iconColor="text-amber-600 dark:text-amber-400"
          tooltipText="Unresolved alerts classified with high severity"
          delayMs={90}
        />

        <AlertKPICard
          title="Acknowledged"
          value={isLoading ? '—' : String(acknowledgedCount)}
          sub="Triaged by operators pending resolution"
          icon={Eye}
          iconColor="text-teal-600 dark:text-teal-400"
          tooltipText="Active alerts marked as acknowledged (not yet resolved)"
          delayMs={120}
        />
      </section>

      {/* ── 3. Search & Registry Header Bar ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
            Active Alert Registry
          </h2>
          <span className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium tabular-nums">
            Showing {filteredAlerts.length} of {rawAlerts.length} {rawAlerts.length === 1 ? 'alert' : 'alerts'}
            {filteredUniqueProductsCount > 0 && ` (${filteredUniqueProductsCount} unique ${filteredUniqueProductsCount === 1 ? 'product' : 'products'})`}
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] dark:text-[#a1a1aa]" aria-hidden="true" />
          <input
            type="text"
            aria-label="Search alerts by SKU, product, or rule"
            placeholder="Search by SKU, product, or rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] sm:min-h-[36px] pl-8 pr-8 py-1.5 rounded-[10px] text-xs bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#52525b] dark:placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search query"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Scannable Alert Registry List ─────────────────────────── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#1e3fc8] animate-spin mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">
              Retrieving live alert records...
            </p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-10 text-center">
            <div className="w-11 h-11 rounded-[12px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
              No alerts match the active filters
            </p>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 max-w-sm mx-auto">
              All inventory thresholds, forecast signals, and anomaly rules are clear under the current filter criteria.
            </p>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-[10px] text-xs font-semibold bg-[#fafaf9] hover:bg-[#e4e4e7]/60 text-[#0a0a0a] dark:bg-[#18181b] dark:hover:bg-[#27272a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.alert_type);
            const isAck = alert.lifecycle === 'acknowledged';
            const isPendingAck = acknowledgeMutation.isPending && acknowledgeMutation.variables === alert.id;
            const isPendingRes = resolveMutation.isPending && resolveMutation.variables === alert.id;
            const isPendingDismiss = dismissMutation.isPending && dismissMutation.variables === alert.id;
            const isAnyPending = isPendingAck || isPendingRes || isPendingDismiss;
            const isConfirmingDismiss = confirmingDismissId === alert.id;
            const isExpanded = expandedIds.has(alert.id);
            const cardError = actionErrorById[alert.id];

            const sev = (alert.severity || '').toLowerCase();
            const isCritical = sev === 'critical';
            const isHigh = sev === 'high';
            const isMedium = sev === 'medium';

            const accentBorder = isCritical
              ? 'border-l-4 border-l-rose-600 dark:border-l-rose-500'
              : isHigh
              ? 'border-l-4 border-l-amber-500'
              : isMedium
              ? 'border-l-4 border-l-[#1e3fc8] dark:border-l-[#60a5fa]'
              : 'border-l-4 border-l-slate-400';

            const severityBadgeStyle = isCritical
              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
              : isHigh
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
              : isMedium
              ? 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40'
              : 'bg-[#fafaf9] text-[#52525b] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]';

            const groupKey = getProductGroupKey(alert);
            const skuIdentifier = alert.extra_data?.sku ? String(alert.extra_data.sku) : null;
            const relatedRuleCount = groupKey ? productRuleCounts.get(groupKey) ?? 1 : 1;

            return (
              <article
                key={alert.id}
                id={`alert-card-${alert.id}`}
                className={cn(
                  'rounded-[16px] p-4 sm:p-5 transition-colors duration-150 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a]',
                  accentBorder,
                  isAck && 'bg-amber-50/20 dark:bg-amber-950/10'
                )}
              >
                {/* ── COMPACT PRIMARY ROW: Product Identity, Severity, Type, Key Fact, Time ── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0',
                          isCritical
                            ? 'text-rose-600 dark:text-rose-400'
                            : isHigh
                            ? 'text-amber-600 dark:text-amber-400'
                            : isMedium
                            ? 'text-[#1e3fc8] dark:text-[#60a5fa]'
                            : 'text-[#52525b] dark:text-[#a1a1aa]'
                        )}
                        aria-hidden="true"
                      />

                      <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                        {alert.product_name || 'System Alert'}
                      </h3>

                      {(skuIdentifier || alert.product_id) && (
                        <span className="text-[11px] font-mono font-semibold text-[#52525b] dark:text-[#a1a1aa] bg-[#fafaf9] dark:bg-[#18181b] px-1.5 py-0.5 rounded border border-[#e4e4e7] dark:border-[#27272a]">
                          {skuIdentifier || `Product #${alert.product_id}`}
                        </span>
                      )}

                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border',
                          severityBadgeStyle
                        )}
                      >
                        {alert.severity}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fafaf9] text-[#0a0a0a] border border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#fafaf9] dark:border-[#27272a]">
                        {getTypeLabel(alert.alert_type)}
                      </span>

                      {relatedRuleCount > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const target = skuIdentifier || String(alert.product_id || '');
                            if (target) setSearchQuery(target);
                          }}
                          title="Multiple active alert rules apply to this product. Click to filter all alerts for this SKU."
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40 cursor-pointer hover:underline"
                        >
                          <Layers className="w-3 h-3" aria-hidden="true" />
                          {relatedRuleCount} alerts on product
                        </button>
                      )}

                      {alert.lifecycle !== 'active' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
                          <Eye className="w-3 h-3" aria-hidden="true" />
                          Acknowledged
                        </span>
                      )}
                    </div>

                    {/* Concise Key Fact (no redundant severity/SKU repetition) */}
                    <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium leading-relaxed">
                      {getConciseKeyFact(alert)}
                    </p>
                  </div>

                  {/* Right Side: Triggered Timestamp + Details Toggle */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 flex-shrink-0">
                    <span className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] tabular-nums whitespace-nowrap">
                      {new Date(alert.created_at).toLocaleDateString()} ·{' '}
                      {new Date(alert.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`alert-details-${alert.id}`}
                      onClick={() => toggleExpand(alert.id)}
                      className="min-h-[36px] px-2.5 rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] text-[11px] font-semibold text-[#0a0a0a] dark:text-[#fafaf9] inline-flex items-center gap-1 hover:border-[#1e3fc8] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
                    >
                      <span>{isExpanded ? 'Hide details' : 'Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ── EXPANDABLE DETAILS DRAWER (Stock/Reorder/Safety, Full Message, Rule Key) ── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      id={`alert-details-${alert.id}`}
                      initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] space-y-2.5">
                        {/* Original Server Message */}
                        <p className="text-xs text-[#0a0a0a] dark:text-[#fafaf9] leading-relaxed bg-[#fafaf9] dark:bg-[#18181b] p-3 rounded-[10px] border border-[#e4e4e7] dark:border-[#27272a]">
                          {alert.message}
                        </p>

                        {/* Structured Metrics */}
                        {alert.extra_data && Object.keys(alert.extra_data).length > 0 && (
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {alert.extra_data.current_stock !== undefined && (
                              <span className="px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                                <span className="text-[#52525b] dark:text-[#a1a1aa]">Current Stock: </span>
                                <strong className="font-mono text-[#0a0a0a] dark:text-[#fafaf9]">
                                  {String(alert.extra_data.current_stock)} units
                                </strong>
                              </span>
                            )}
                            {alert.extra_data.reorder_point !== undefined && (
                              <span className="px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                                <span className="text-[#52525b] dark:text-[#a1a1aa]">Reorder Point: </span>
                                <strong className="font-mono text-[#0a0a0a] dark:text-[#fafaf9]">
                                  {String(alert.extra_data.reorder_point)} units
                                </strong>
                              </span>
                            )}
                            {alert.extra_data.safety_stock !== undefined && (
                              <span className="px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                                <span className="text-[#52525b] dark:text-[#a1a1aa]">Safety Stock: </span>
                                <strong className="font-mono text-[#0a0a0a] dark:text-[#fafaf9]">
                                  {String(alert.extra_data.safety_stock)} units
                                </strong>
                              </span>
                            )}
                            {alert.extra_data.health_score !== undefined && (
                              <span className="px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                                <span className="text-[#52525b] dark:text-[#a1a1aa]">Snapshot Health Score: </span>
                                <strong className="font-mono text-[#0a0a0a] dark:text-[#fafaf9]">
                                  {String(alert.extra_data.health_score)}
                                </strong>
                              </span>
                            )}
                            {alert.extra_data.z_score !== undefined && (
                              <span className="px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                                <span className="text-[#52525b] dark:text-[#a1a1aa]">Z-Score: </span>
                                <strong className="font-mono text-[#0a0a0a] dark:text-[#fafaf9]">
                                  {Number(alert.extra_data.z_score).toFixed(2)}
                                </strong>
                              </span>
                            )}
                            {alert.extra_data.accuracy !== undefined && (
                              <span className="px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                                <span className="text-[#52525b] dark:text-[#a1a1aa]">Accuracy: </span>
                                <strong className="font-mono text-[#0a0a0a] dark:text-[#fafaf9]">
                                  {(Number(alert.extra_data.accuracy) * 100).toFixed(1)}%
                                </strong>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Rule & Audit Metadata */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
                          <span>Alert ID: <span className="font-mono">#{alert.id}</span></span>
                          {alert.rule_key && (
                            <span>Rule Key: <span className="font-mono">{alert.rule_key}</span></span>
                          )}
                          {alert.acknowledged_at && (
                            <span>
                              Acknowledged: {new Date(alert.acknowledged_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Inline Error Feedback if a Server Action Failed */}
                {cardError && (
                  <p role="alert" className="mt-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {cardError}
                  </p>
                )}

                {/* ── ACTION BAR: Acknowledge, Resolve, and Explicit Dismiss ── */}
                <div className="mt-3 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium">
                    {alert.acknowledged_at ? (
                      <span className="text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" aria-hidden="true" />
                        Acknowledged at {new Date(alert.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span>Awaiting operator triage</span>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-2 self-end sm:self-center">
                    {alert.lifecycle === 'active' && (
                      <button
                        id={`btn-ack-${alert.id}`}
                        type="button"
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        disabled={isAnyPending}
                        aria-busy={isPendingAck}
                        title="Acknowledge alert (keeps alert open while noting operator review)"
                        className="min-h-[44px] sm:min-h-[34px] px-3 rounded-[10px] border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 disabled:opacity-50 disabled:cursor-wait cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
                      >
                        {isPendingAck ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{isPendingAck ? 'Acknowledging...' : 'Acknowledge'}</span>
                      </button>
                    )}

                    <button
                      id={`btn-resolve-${alert.id}`}
                      type="button"
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={isAnyPending}
                      aria-busy={isPendingRes}
                      title="Resolve alert and mark incident as closed"
                      className="min-h-[44px] sm:min-h-[34px] px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-wait cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
                    >
                      {isPendingRes ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{isPendingRes ? 'Resolving...' : 'Resolve'}</span>
                    </button>

                    {isConfirmingDismiss ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-[10px] border border-rose-200 dark:border-rose-800/60">
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                          Dismiss?
                        </span>
                        <button
                          type="button"
                          onClick={() => dismissMutation.mutate(alert.id)}
                          disabled={isPendingDismiss}
                          className="min-h-[32px] px-2.5 rounded-[6px] text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                        >
                          {isPendingDismiss ? 'Removing...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDismissId(null)}
                          disabled={isPendingDismiss}
                          className="min-h-[32px] px-2 rounded-[6px] text-[11px] font-medium text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`btn-dismiss-${alert.id}`}
                        type="button"
                        onClick={() => setConfirmingDismissId(alert.id)}
                        disabled={isAnyPending}
                        aria-label={`Dismiss alert #${alert.id} for ${alert.product_name || 'system'} (removes alert record without marking resolved)`}
                        title="Dismiss alert (removes record from registry without marking resolved)"
                        className="min-h-[44px] sm:min-h-[34px] px-2.5 rounded-[10px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] text-[#52525b] dark:text-[#a1a1aa] hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-950/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Dismiss</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
