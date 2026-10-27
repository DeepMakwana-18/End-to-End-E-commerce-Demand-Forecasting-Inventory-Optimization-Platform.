/**
 * Alert Center Page — Phase 5E-C Rule-Driven Alerts
 *
 * Frontend Refinements:
 * 1. Compact, high-density incident cards without losing operational metrics.
 * 2. Clearly differentiated actions: Acknowledge (secondary outline), Resolve (primary success), and Dismiss (safeguarded with confirmation).
 * 3. Fixed KPI description truncation with multi-line wrapping and consistent card min-height.
 * 4. Multi-facet filter drawer: filter by Severity, Alert Type, Lifecycle status, and Search by SKU/name.
 * 5. Safe Dismiss action: inline confirmation preventing accidental destructive deletion of alert records.
 * 6. Generous bottom clearance (pb-28 sm:pb-32) preventing floating AI assistant from obscuring controls.
 * 7. Design system harmony in both Light Mode and Dark Mode.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Filter,
  XCircle,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { alertsApi } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from '@/hooks/useToast';
import type { Alert } from '@/types';

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

const severityLevels = ['all', 'critical', 'high', 'medium', 'low'] as const;

const alertTypeFilters = [
  { id: 'all', label: 'All Types' },
  { id: 'stockout', label: 'Stockout Risk' },
  { id: 'low_stock', label: 'Low Stock' },
  { id: 'reorder', label: 'Reorder' },
  { id: 'forecast_miss', label: 'Forecast Miss' },
  { id: 'overstock', label: 'Overstock' },
  { id: 'anomaly_detected', label: 'Anomaly' },
] as const;

// ── Custom Alert KPI Card ────────────────────────────────────────────

interface AlertKPICardProps {
  title: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  cardBg: string;
  borderColor: string;
  valueColor: string;
  tooltipText?: string;
  delay?: number;
}

function AlertKPICard({
  title,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  cardBg,
  borderColor,
  valueColor,
  tooltipText,
  delay = 0,
}: AlertKPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.28, 0.11, 0.32, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'rounded-2xl p-5 border relative overflow-hidden group cursor-default h-full flex flex-col justify-between min-h-[156px] shadow-2xs hover:shadow-xs transition-all duration-200 dark:bg-none dark:bg-ds-surface',
        cardBg,
        borderColor
      )}
    >
      <div className="flex items-start justify-between relative z-10 w-full gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <p className="text-[11px] font-bold text-slate-500 dark:text-ds-text-muted uppercase tracking-wider truncate">
              {title}
            </p>
            {tooltipText && (
              <span
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-help"
                title={tooltipText}
              >
                <HelpCircle className="w-3 h-3" />
              </span>
            )}
          </div>
          <p className={cn('text-2xl sm:text-[28px] font-bold font-sans tabular-nums tracking-tight leading-none', valueColor)}>
            {value}
          </p>
          <div className="mt-3 flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-ds-border-control mt-1.5 flex-shrink-0" />
            <span className="text-xs font-medium text-slate-500 dark:text-ds-text-muted leading-snug">
              {sub}
            </span>
          </div>
        </div>

        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 border',
            iconBg
          )}
        >
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [confirmingDismissId, setConfirmingDismissId] = useState<number | null>(null);

  // ── Real API data ─────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', severityFilter],
    queryFn: () =>
      alertsApi.getAll({
        severity: severityFilter === 'all' ? undefined : severityFilter,
        limit: 100,
      }).then((r) => r.data),
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
  }, [queryClient]);

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) => alertsApi.acknowledge(id),
    onSuccess: (_, id) => {
      toast.success('Alert acknowledged', `Alert #${id} marked as acknowledged by operator.`);
      invalidate();
    },
    onError: () => toast.error('Error', 'Failed to acknowledge alert'),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => alertsApi.resolve(id),
    onSuccess: (_, id) => {
      toast.success('Alert resolved', `Alert #${id} resolved successfully.`);
      invalidate();
    },
    onError: () => toast.error('Error', 'Failed to resolve alert'),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => alertsApi.dismiss(id),
    onSuccess: (_, id) => {
      toast.info('Alert Dismissed', `Alert #${id} removed from registry.`);
      setConfirmingDismissId(null);
      invalidate();
    },
    onError: () => {
      toast.error('Error', 'Failed to dismiss alert');
      setConfirmingDismissId(null);
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => alertsApi.scanInventory(),
    onSuccess: (res) => {
      const count = res.data.new_alerts;
      if (count > 0) {
        toast.warning(
          `${count} new alert${count > 1 ? 's' : ''} found`,
          'Inventory rule scan complete.'
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

  useMemo(() => {
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

  const rawAlerts: Alert[] = data?.alerts ?? [];
  const activeCount = statsData?.total_active ?? 0;

  // Read backend stats handling both lowercase and uppercase enum serialization
  const criticalCount =
    statsData?.by_severity?.critical ??
    statsData?.by_severity?.CRITICAL ??
    0;

  const highCount =
    statsData?.by_severity?.high ??
    statsData?.by_severity?.HIGH ??
    0;

  const acknowledgedCount = rawAlerts.filter((a) => a.lifecycle === 'acknowledged').length;

  // Multi-facet client filtering
  const filteredAlerts = useMemo(() => {
    return rawAlerts.filter((alert) => {
      // Type filter
      if (typeFilter !== 'all' && alert.alert_type?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      // Lifecycle filter
      if (lifecycleFilter !== 'all' && alert.lifecycle?.toLowerCase() !== lifecycleFilter.toLowerCase()) {
        return false;
      }
      // Search query filter (matches SKU or Product Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = alert.product_name?.toLowerCase().includes(q);
        const skuMatch = String(alert.extra_data?.sku || '').toLowerCase().includes(q);
        const idMatch = String(alert.product_id || '').toLowerCase().includes(q);
        const msgMatch = alert.message?.toLowerCase().includes(q);
        if (!nameMatch && !skuMatch && !idMatch && !msgMatch) return false;
      }
      return true;
    });
  }, [rawAlerts, typeFilter, lifecycleFilter, searchQuery]);

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

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* ── 1. PAGE HEADER ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden gap-4"
      >
        {/* Subtle decorative blue-to-indigo gradient glow */}
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 inline-block" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-ds-text tracking-tight">
                Alert Center
              </h1>
              {/* Prominent Active Count Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40 tabular-nums shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {activeCount} Active {activeCount === 1 ? 'Alert' : 'Alerts'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-0.5 ml-3.5 font-medium">
              Operational incident registry, threshold breaches, and automated rule signals
            </p>
          </div>
        </div>

        {/* Action Controls (Scan Inventory + Filter) */}
        <div className="relative flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          {/* Manual scan */}
          <button
            id="btn-scan-inventory"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all duration-150 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5 text-blue-600 dark:text-blue-400', scanMutation.isPending && 'animate-spin')}
            />
            <span>{scanMutation.isPending ? 'Scanning...' : 'Scan Inventory'}</span>
          </button>

          {/* Filter Toggle */}
          <div className="relative">
            <button
              id="btn-filter-alerts"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all duration-150 cursor-pointer',
                showFilters || activeFiltersCount > 0
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 active:scale-95'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {activeFiltersCount === 0
                  ? 'Filter'
                  : `Filter (${activeFiltersCount})`}
              </span>
            </button>

            {/* Filter Dropdown Popover */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3 z-50 space-y-3 shadow-xl rounded-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Filter Registry
                    </span>
                    <div className="flex items-center gap-2">
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      )}
                      <button
                        onClick={() => setShowFilters(false)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Severity Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Severity
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {severityLevels.map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setSeverityFilter(lvl)}
                          className={cn(
                            'text-left px-2 py-1 rounded-lg text-xs font-semibold capitalize flex items-center justify-between transition-colors cursor-pointer',
                            severityFilter === lvl
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          )}
                        >
                          <span>{lvl === 'all' ? 'All' : lvl}</span>
                          {severityFilter === lvl && <Check className="w-3 h-3 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alert Type Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Alert Type
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {alertTypeFilters.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lifecycle Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-1">
                      {['all', 'active', 'acknowledged'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setLifecycleFilter(st)}
                          className={cn(
                            'flex-1 text-center py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer',
                            lifecycleFilter === st
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70'
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
      </motion.div>

      {/* ── 2. KPI CARDS (Blue, Red, Amber, Teal) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Alerts - Blue */}
        <AlertKPICard
          title="Active Alerts"
          value={String(activeCount)}
          sub={activeCount > 0 ? 'Pending operator triage and resolution' : 'Zero active breaches'}
          icon={Bell}
          cardBg="bg-gradient-to-b from-blue-50/70 via-blue-50/30 to-white dark:bg-ds-surface"
          borderColor="border-blue-200/80 dark:border-ds-border"
          iconBg="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
          iconColor="text-blue-600 dark:text-blue-400"
          valueColor="text-blue-950 dark:text-ds-text-primary"
          tooltipText="Total unresolved operational alerts in database"
          delay={0}
        />

        {/* Critical - Red */}
        <AlertKPICard
          title="Critical"
          value={String(criticalCount)}
          sub={criticalCount > 0 ? 'Immediate action required for stockouts' : 'No critical stockouts'}
          icon={AlertOctagon}
          cardBg="bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white dark:bg-ds-surface"
          borderColor="border-rose-200/80 dark:border-ds-border"
          iconBg="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
          iconColor="text-rose-600 dark:text-rose-400"
          valueColor="text-rose-950 dark:text-ds-text-primary"
          tooltipText="Critical alerts requiring immediate remediation"
          delay={0.05}
        />

        {/* High - Amber */}
        <AlertKPICard
          title="High"
          value={String(highCount)}
          sub={highCount > 0 ? 'Threshold breaches and reorder risks' : 'No elevated risks'}
          icon={AlertTriangle}
          cardBg="bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white dark:bg-ds-surface"
          borderColor="border-amber-200/80 dark:border-ds-border"
          iconBg="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
          iconColor="text-amber-600 dark:text-amber-400"
          valueColor="text-amber-950 dark:text-ds-text-primary"
          tooltipText="High-priority inventory and forecast miss alerts"
          delay={0.1}
        />

        {/* Acknowledged - Teal */}
        <AlertKPICard
          title="Acknowledged"
          value={String(acknowledgedCount)}
          sub="Triaged by operators pending resolution"
          icon={Eye}
          cardBg="bg-gradient-to-b from-teal-50/70 via-teal-50/30 to-white dark:bg-ds-surface"
          borderColor="border-teal-200/80 dark:border-ds-border"
          iconBg="bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400"
          iconColor="text-teal-600 dark:text-teal-400"
          valueColor="text-teal-950 dark:text-ds-text-primary"
          tooltipText="Alerts acknowledged by operators pending resolution"
          delay={0.15}
        />
      </div>

      {/* ── 3. SEARCH & QUICK FILTER BAR ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 inline-block" />
          <h2 className="text-base font-bold text-slate-900 dark:text-ds-text tracking-tight">
            Active Alert Registry
          </h2>
          <span className="text-xs text-slate-500 dark:text-ds-text-secondary font-medium ml-1">
            Showing {filteredAlerts.length} of {rawAlerts.length} {rawAlerts.length === 1 ? 'alert' : 'alerts'}
          </span>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product, or rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 4. ALERT LIST CARDS (Compact Incident Layout) ────────────── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface p-12 text-center shadow-2xs">
            <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Retrieving live alert feeds...
            </p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface p-10 text-center shadow-2xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-ds-text">
              No alerts match the active filters
            </p>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-1 max-w-sm mx-auto">
              All inventory thresholds, forecast signals, and anomaly models are compliant under current criteria.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear all filters
              </button>
            )}
          </motion.div>
        ) : (
          filteredAlerts.map((alert, i) => {
            const Icon = getAlertIcon(alert.alert_type);
            const isAck = alert.lifecycle === 'acknowledged';
            const isPendingAck =
              acknowledgeMutation.isPending && acknowledgeMutation.variables === alert.id;
            const isPendingRes =
              resolveMutation.isPending && resolveMutation.variables === alert.id;
            const isConfirmingDismiss = confirmingDismissId === alert.id;

            const sev = (alert.severity || '').toLowerCase();

            // Semantic left accent strip & styling
            const isCritical = sev === 'critical';
            const isHigh = sev === 'high';
            const isMedium = sev === 'medium';

            const accentBorder = isCritical
              ? 'border-l-4 border-l-rose-500 hover:border-rose-300/80'
              : isHigh
              ? 'border-l-4 border-l-amber-500 hover:border-amber-300/80'
              : isMedium
              ? 'border-l-4 border-l-blue-500 hover:border-blue-300/80'
              : 'border-l-4 border-l-slate-400 hover:border-slate-300';

            const severityBadgeStyle = isCritical
              ? 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
              : isHigh
              ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
              : isMedium
              ? 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40'
              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';

            const iconContainerStyle = isCritical
              ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/40'
              : isHigh
              ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/40'
              : isMedium
              ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40'
              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300';

            return (
              <motion.div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: Math.min(0.03 * i, 0.3) }}
                className={cn(
                  'rounded-2xl p-4 sm:p-4.5 transition-all duration-150',
                  'bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-2xs hover:shadow-xs',
                  accentBorder,
                  isAck && 'bg-amber-50/15 dark:bg-amber-950/10'
                )}
              >
                {/* ── TOP HEADER ROW: Icon + Title + SKU + Badges + Timestamp ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs border',
                        iconContainerStyle
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-ds-text">
                      {alert.product_name || 'System Alert'}
                    </h4>

                    {/* SKU indicator */}
                    {(alert.extra_data?.sku || alert.product_id) && (
                      <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700/70">
                        {String(alert.extra_data?.sku || `SKU #${alert.product_id}`)}
                      </span>
                    )}

                    {/* Severity badge */}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs',
                        severityBadgeStyle
                      )}
                    >
                      {alert.severity}
                    </span>

                    {/* Type badge */}
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-2xs">
                      {getTypeLabel(alert.alert_type)}
                    </span>

                    {/* Lifecycle badge */}
                    {alert.lifecycle !== 'active' && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs flex items-center gap-1',
                          alert.lifecycle === 'acknowledged'
                            ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300'
                        )}
                      >
                        {alert.lifecycle === 'acknowledged' ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {alert.lifecycle.charAt(0).toUpperCase() + alert.lifecycle.slice(1)}
                      </span>
                    )}
                  </div>

                  {/* Triggered timestamp */}
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-sans tabular-nums whitespace-nowrap self-start sm:self-center">
                    Triggered: {new Date(alert.created_at).toLocaleDateString()} · {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* ── MIDDLE ROW: Concise Explanation & Structured Metrics ── */}
                <div className="py-2.5 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {alert.message}
                  </p>

                  {/* Structured Operational Metrics Row */}
                  {alert.extra_data && Object.keys(alert.extra_data).length > 0 && (
                    <div className="p-2 rounded-xl bg-slate-50/90 dark:bg-ds-surface-sunken/60 border border-slate-200/70 dark:border-ds-border/60 flex items-center gap-3.5 flex-wrap text-xs">
                      {/* Current Stock */}
                      {alert.extra_data.current_stock !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            Current Stock:
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px]">
                            {String(alert.extra_data.current_stock)} units
                          </span>
                        </div>
                      )}

                      {/* Reorder Point */}
                      {alert.extra_data.reorder_point !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            Reorder Point:
                          </span>
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 text-[11px]">
                            {String(alert.extra_data.reorder_point)} units
                          </span>
                        </div>
                      )}

                      {/* Deficit */}
                      {alert.extra_data.current_stock !== undefined &&
                        alert.extra_data.reorder_point !== undefined &&
                        Number(alert.extra_data.current_stock) <
                          Number(alert.extra_data.reorder_point) && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            <span>Deficit:</span>
                            <span className="font-mono font-bold">
                              {Number(alert.extra_data.reorder_point) -
                                Number(alert.extra_data.current_stock)}{' '}
                              units below threshold
                            </span>
                          </div>
                        )}

                      {/* Safety Stock */}
                      {alert.extra_data.safety_stock !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            Safety Stock:
                          </span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                            {String(alert.extra_data.safety_stock)} units
                          </span>
                        </div>
                      )}

                      {/* Z-score */}
                      {alert.extra_data.z_score !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            Z-Score:
                          </span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                            {Number(alert.extra_data.z_score).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Accuracy */}
                      {alert.extra_data.accuracy !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            Accuracy:
                          </span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                            {(Number(alert.extra_data.accuracy) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── BOTTOM ACTION ROW: Operator Audit & Distinguishable Actions ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  {/* Left: Audit / Acknowledged status */}
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">
                    {alert.acknowledged_at ? (
                      <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Acknowledged: {new Date(alert.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : alert.rule_key ? (
                      <span className="font-mono text-slate-400 text-[10px]">
                        Rule: {alert.rule_key.split(':')[0]}
                      </span>
                    ) : (
                      <span>Pending operator review</span>
                    )}
                  </div>

                  {/* Right: Actions (Acknowledge, Resolve, and Dismiss with Confirmation) */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Acknowledge (Secondary Outline Action) */}
                    {alert.lifecycle === 'active' && (
                      <button
                        id={`btn-ack-${alert.id}`}
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        disabled={isPendingAck}
                        title="Mark alert as seen and accepted by an operator"
                        className={cn(
                          'h-7.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer',
                          'bg-amber-50/90 text-amber-800 border-amber-200/90 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
                          'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-wait'
                        )}
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{isPendingAck ? 'Updating...' : 'Acknowledge'}</span>
                      </button>
                    )}

                    {/* Resolve (Primary Success Action) */}
                    <button
                      id={`btn-resolve-${alert.id}`}
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={isPendingRes}
                      title="Mark alert as addressed and close the incident"
                      className={cn(
                        'h-7.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-white shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer',
                        'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs',
                        'focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-wait'
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>{isPendingRes ? 'Resolving...' : 'Resolve'}</span>
                    </button>

                    {/* Dismiss Action with Inline Safeguard Confirmation */}
                    {isConfirmingDismiss ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 p-1 rounded-xl border border-rose-200 dark:border-rose-900/60 animate-in fade-in zoom-in-95">
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 pl-1">
                          Delete?
                        </span>
                        <button
                          onClick={() => dismissMutation.mutate(alert.id)}
                          disabled={dismissMutation.isPending}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmingDismissId(null)}
                          className="px-1.5 py-0.5 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`btn-dismiss-${alert.id}`}
                        onClick={() => setConfirmingDismissId(alert.id)}
                        aria-label={`Dismiss alert #${alert.id} (Permanently removes from database)`}
                        title="Dismiss alert (Permanently removes from database)"
                        className="w-7.5 h-7.5 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
