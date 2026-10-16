/**
 * Alert Center Page — Phase 5E-C Rule-Driven Alerts
 *
 * Light Mode Refinement: Apple Modern design system, high-contrast severity styling,
 * prominent active alert indicators, clear operational stock/reorder comparison,
 * responsive action buttons, and robust enterprise layout.
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
  delay = 0,
}: AlertKPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.28, 0.11, 0.32, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'rounded-2xl p-5 border relative overflow-hidden group cursor-default h-full flex flex-col justify-between min-h-[142px] shadow-2xs hover:shadow-xs transition-all duration-200 dark:bg-none dark:bg-ds-surface',
        cardBg,
        borderColor
      )}
    >
      <div className="flex items-start justify-between relative z-10 w-full gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-ds-text-muted uppercase tracking-wider mb-1.5 truncate">
            {title}
          </p>
          <p className={cn('text-2xl sm:text-[28px] font-bold font-sans tabular-nums tracking-tight leading-none', valueColor)}>
            {value}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-ds-border-control" />
            <span className="text-xs font-medium text-slate-500 dark:text-ds-text-muted truncate">
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

// ── Component ────────────────────────────────────────────────────────

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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
      toast.success('Alert acknowledged', `Alert #${id} marked as acknowledged.`);
      invalidate();
    },
    onError: () => toast.error('Error', 'Failed to acknowledge alert'),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => alertsApi.resolve(id),
    onSuccess: (_, id) => {
      toast.success('Alert resolved', `Alert #${id} resolved.`);
      invalidate();
    },
    onError: () => toast.error('Error', 'Failed to resolve alert'),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => alertsApi.dismiss(id),
    onSuccess: (_, id) => {
      toast.info('Dismissed', `Alert #${id} dismissed.`);
      invalidate();
    },
    onError: () => toast.error('Error', 'Failed to dismiss alert'),
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
        toast.success('Scan complete', 'No new alerts — all inventory is compliant.');
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

  // ── Derived data ──────────────────────────────────────────────────

  const alerts: Alert[] = data?.alerts ?? [];
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

  const acknowledgedCount = alerts.filter((a) => a.lifecycle === 'acknowledged').length;

  return (
    <div className="space-y-6">
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
              Rule-driven inventory, anomaly &amp; model performance signals
            </p>
          </div>
        </div>

        {/* Action Controls (Scan Inventory + Filter) */}
        <div className="relative flex items-center gap-2 self-start sm:self-center">
          {/* Manual scan */}
          <button
            id="btn-scan-inventory"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all duration-150 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5 text-blue-600', scanMutation.isPending && 'animate-spin')}
            />
            <span>{scanMutation.isPending ? 'Scanning...' : 'Scan Inventory'}</span>
          </button>

          {/* Severity filter */}
          <div className="relative">
            <button
              id="btn-filter-alerts"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all duration-150',
                showFilters || severityFilter !== 'all'
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 active:scale-95'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {severityFilter === 'all'
                  ? 'Filter'
                  : `Filter: ${severityFilter.charAt(0).toUpperCase() + severityFilter.slice(1)}`}
              </span>
              {severityFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
              )}
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-2 z-50 space-y-1 shadow-xl rounded-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Filter by Severity
                    </span>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {severityLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setSeverityFilter(level);
                        setShowFilters(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 capitalize flex items-center justify-between',
                        severityFilter === level
                          ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/40 dark:text-blue-300'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                      )}
                    >
                      <span>{level === 'all' ? 'All Severities' : level}</span>
                      {severityFilter === level && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
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
          sub={activeCount > 0 ? 'Pending operator review' : 'Zero active breaches'}
          icon={Bell}
          cardBg="bg-gradient-to-b from-blue-50/70 via-blue-50/30 to-white dark:bg-ds-surface"
          borderColor="border-blue-200/80 dark:border-ds-border"
          iconBg="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
          iconColor="text-blue-600 dark:text-blue-400"
          valueColor="text-blue-950 dark:text-ds-text-primary"
          delay={0}
        />

        {/* Critical - Red */}
        <AlertKPICard
          title="Critical"
          value={String(criticalCount)}
          sub={criticalCount > 0 ? 'Immediate action required' : 'No critical stockouts'}
          icon={AlertOctagon}
          cardBg="bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white dark:bg-ds-surface"
          borderColor="border-rose-200/80 dark:border-ds-border"
          iconBg="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
          iconColor="text-rose-600 dark:text-rose-400"
          valueColor="text-rose-950 dark:text-ds-text-primary"
          delay={0.05}
        />

        {/* High - Amber */}
        <AlertKPICard
          title="High"
          value={String(highCount)}
          sub={highCount > 0 ? 'Threshold breaches' : 'No elevated risks'}
          icon={AlertTriangle}
          cardBg="bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white dark:bg-ds-surface"
          borderColor="border-amber-200/80 dark:border-ds-border"
          iconBg="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
          iconColor="text-amber-600 dark:text-amber-400"
          valueColor="text-amber-950 dark:text-ds-text-primary"
          delay={0.1}
        />

        {/* Acknowledged - Teal */}
        <AlertKPICard
          title="Acknowledged"
          value={String(acknowledgedCount)}
          sub="Triaged by operators"
          icon={Eye}
          cardBg="bg-gradient-to-b from-teal-50/70 via-teal-50/30 to-white dark:bg-ds-surface"
          borderColor="border-teal-200/80 dark:border-ds-border"
          iconBg="bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400"
          iconColor="text-teal-600 dark:text-teal-400"
          valueColor="text-teal-950 dark:text-ds-text-primary"
          delay={0.15}
        />
      </div>

      {/* ── 3. ALERT LIST CARDS ──────────────────────────────────────── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 inline-block" />
            <h2 className="text-base font-bold text-slate-900 dark:text-ds-text tracking-tight">
              Active Alert Registry
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-ds-text-secondary font-medium">
            Showing {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
          </span>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface p-12 text-center shadow-2xs">
            <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Retrieving live alert feeds...
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface p-12 text-center shadow-2xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-ds-text">
              No active alerts{severityFilter !== 'all' ? ` matching "${severityFilter}"` : ''}
            </p>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-1">
              All inventory thresholds, forecast signals, and anomaly models are compliant.
            </p>
          </motion.div>
        ) : (
          alerts.map((alert, i) => {
            const Icon = getAlertIcon(alert.alert_type);
            const isAck = alert.lifecycle === 'acknowledged';
            const isPendingAck =
              acknowledgeMutation.isPending && acknowledgeMutation.variables === alert.id;
            const isPendingRes =
              resolveMutation.isPending && resolveMutation.variables === alert.id;

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
                transition={{ delay: 0.05 + i * 0.03 }}
                className={cn(
                  'rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-all duration-200',
                  'bg-white dark:bg-ds-surface border border-slate-200/90 dark:border-ds-border shadow-2xs hover:shadow-md',
                  accentBorder,
                  isAck && 'bg-amber-50/20 dark:bg-amber-950/10'
                )}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Differentiated Icon Container */}
                  <div
                    className={cn(
                      'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs border',
                      iconContainerStyle
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content & Hierarchy */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-ds-text">
                        {alert.product_name || 'System Alert'}
                      </h4>

                      {/* SKU / Product ID indicator */}
                      {alert.product_id ? (
                        <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                          SKU #{alert.product_id}
                        </span>
                      ) : null}

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

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {alert.message}
                    </p>

                    {/* Operational Stock & Reorder Comparison Card */}
                    {alert.extra_data && Object.keys(alert.extra_data).length > 0 && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50/80 dark:bg-ds-surface-sunken/60 border border-slate-200/70 dark:border-ds-border/60 flex items-center gap-4 flex-wrap text-xs">
                        {alert.extra_data.current_stock !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              Current Stock:
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                              {String(alert.extra_data.current_stock)} units
                            </span>
                          </div>
                        )}

                        {alert.extra_data.reorder_point !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              Reorder Point:
                            </span>
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40">
                              {String(alert.extra_data.reorder_point)} units
                            </span>
                          </div>
                        )}

                        {/* Deficit calculation if both exist */}
                        {alert.extra_data.current_stock !== undefined &&
                          alert.extra_data.reorder_point !== undefined &&
                          Number(alert.extra_data.current_stock) <
                            Number(alert.extra_data.reorder_point) && (
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              <span>Deficit:</span>
                              <span className="font-mono font-bold">
                                {Number(alert.extra_data.reorder_point) -
                                  Number(alert.extra_data.current_stock)}{' '}
                                units below threshold
                              </span>
                            </div>
                          )}

                        {alert.extra_data.accuracy !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              Accuracy:
                            </span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                              {(Number(alert.extra_data.accuracy) * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}

                        {alert.extra_data.z_score !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              Z-Score:
                            </span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              {Number(alert.extra_data.z_score).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamp & Operator Audit */}
                    <div className="flex items-center gap-3.5 mt-2.5 text-[11px] text-slate-500 dark:text-ds-text-secondary font-sans tabular-nums">
                      <span>Triggered: {new Date(alert.created_at).toLocaleString()}</span>
                      {alert.acknowledged_at && (
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          • Acknowledged: {new Date(alert.acknowledged_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 4. ACTION BUTTONS (Acknowledge, Resolve, Dismiss) ── */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-ds-border/40 w-full sm:w-auto justify-end">
                  {/* Acknowledge (only for active alerts) */}
                  {alert.lifecycle === 'active' && (
                    <button
                      id={`btn-ack-${alert.id}`}
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={isPendingAck}
                      className={cn(
                        'h-8 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all duration-150 active:scale-95',
                        'bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
                        'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-wait'
                      )}
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{isPendingAck ? 'Updating...' : 'Acknowledge'}</span>
                    </button>
                  )}

                  {/* Resolve */}
                  <button
                    id={`btn-resolve-${alert.id}`}
                    onClick={() => resolveMutation.mutate(alert.id)}
                    disabled={isPendingRes}
                    className={cn(
                      'h-8 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-white shadow-2xs transition-all duration-150 active:scale-95',
                      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-wait'
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>{isPendingRes ? 'Resolving...' : 'Resolve'}</span>
                  </button>

                  {/* Dismiss */}
                  <button
                    id={`btn-dismiss-${alert.id}`}
                    onClick={() => dismissMutation.mutate(alert.id)}
                    title="Dismiss alert"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
