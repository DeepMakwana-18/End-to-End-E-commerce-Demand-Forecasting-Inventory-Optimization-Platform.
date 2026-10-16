/** Alert Center Page — Phase 5E-C Rule-Driven Alerts
 *
 * Features:
 *  - Real backend data via GET /alerts (live, not static store)
 *  - Alert lifecycle: active → acknowledged → resolved
 *  - Manual inventory scan trigger
 *  - WS-driven auto-refresh on alert.triggered / alert.acknowledged / alert.resolved
 *  - Severity filter
 *  - Extra context from rule engine (rule_key, extra_data)
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, AlertTriangle, AlertOctagon, Info, CheckCircle2, Filter,
  XCircle, X, RefreshCw, BrainCircuit, Eye, Zap, ShieldAlert,
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { cn, getSeverityBg } from '@/lib/utils';
import { alertsApi } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from '@/hooks/useToast';
import type { Alert } from '@/types';

// ── Icon + label helpers ─────────────────────────────────────────────

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'stockout': return AlertOctagon;
    case 'low_stock': return AlertTriangle;
    case 'overstock': return Info;
    case 'anomaly_detected': return Zap;
    case 'model_accuracy_degraded': return BrainCircuit;
    case 'forecast_miss': return ShieldAlert;
    default: return Bell;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'stockout': return 'Stockout Risk';
    case 'low_stock': return 'Low Stock';
    case 'reorder': return 'Reorder';
    case 'overstock': return 'Overstock';
    case 'anomaly_detected': return 'Anomaly';
    case 'model_accuracy_degraded': return 'Model Degraded';
    case 'forecast_miss': return 'Forecast Miss';
    default: return type.replace(/_/g, ' ');
  }
};

const lifecycleBadge = (lifecycle: string) => {
  switch (lifecycle) {
    case 'acknowledged':
      return 'bg-ds-amber-warning/10 text-ds-amber-warning border-ds-amber-warning/25';
    case 'resolved':
      return 'bg-ds-emerald-success/10 text-ds-emerald-success border-ds-emerald-success/25';
    default:
      return 'bg-ds-surface-sunken text-ds-text-secondary border-ds-border';
  }
};

const severityLevels = ['all', 'critical', 'high', 'medium', 'low'] as const;

// ── Component ────────────────────────────────────────────────────────

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // ── Real API data ─────────────────────────────────────────────────

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts', severityFilter],
    queryFn: () =>
      alertsApi.getAll({
        severity: severityFilter === 'all' ? undefined : severityFilter,
        limit: 100,
      }).then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: () => alertsApi.getStats().then(r => r.data),
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
        toast.warning(`${count} new alert${count > 1 ? 's' : ''} found`, 'Inventory rule scan complete.');
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
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [subscribe, invalidate]);

  // ── Derived data ──────────────────────────────────────────────────

  const alerts: Alert[] = data?.alerts ?? [];
  const activeCount = statsData?.total_active ?? 0;
  const criticalCount = statsData?.by_severity?.critical ?? 0;
  const highCount = statsData?.by_severity?.high ?? 0;
  const acknowledgedCount = alerts.filter(a => a.lifecycle === 'acknowledged').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ds-text tracking-tight">Alert Center</h1>
          <p className="text-sm text-ds-text-secondary mt-1">
            Rule-driven inventory, anomaly &amp; model alerts — <span className="text-ds-blue-action font-semibold font-mono">{activeCount} active</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual scan */}
          <button
            id="btn-scan-inventory"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="btn-apple btn-apple-soft text-xs h-9 px-3.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', scanMutation.isPending && 'animate-spin')} />
            {scanMutation.isPending ? 'Scanning...' : 'Scan Inventory'}
          </button>
          {/* Severity filter */}
          <div className="relative">
            <button
              id="btn-filter-alerts"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'btn-apple btn-apple-soft text-xs h-9 px-3.5',
                (showFilters || severityFilter !== 'all') && 'bg-ds-blue-action text-white'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
              {severityFilter !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 card-apple p-2 z-50 space-y-1 shadow-[var(--ds-raise-3)] backdrop-blur-2xl"
                >
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-ds-border">
                    <span className="text-xs font-semibold text-ds-text">Severity</span>
                    <button onClick={() => setShowFilters(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-ds-text-secondary hover:text-ds-text hover:bg-ds-surface-sunken"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {severityLevels.map(level => (
                    <button
                      key={level}
                      onClick={() => { setSeverityFilter(level); setShowFilters(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 capitalize',
                        severityFilter === level
                          ? 'bg-ds-blue-action text-white'
                          : 'text-ds-text-secondary hover:bg-ds-surface-sunken hover:text-ds-text'
                      )}
                    >
                      {level === 'all' ? 'All Severities' : level}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Alerts" value={String(activeCount)} icon={Bell} gradient="gradient-primary" delay={0} />
        <KPICard title="Critical" value={String(criticalCount)} icon={AlertOctagon} gradient="gradient-danger" delay={0.05} />
        <KPICard title="High" value={String(highCount)} icon={AlertTriangle} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Acknowledged" value={String(acknowledgedCount)} icon={Eye} gradient="gradient-accent" delay={0.15} />
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="card-apple p-8 text-center shadow-[var(--ds-raise-1)]">
            <RefreshCw className="w-6 h-6 text-ds-blue-action animate-spin mx-auto mb-2" />
            <p className="text-sm text-ds-text-secondary">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-apple p-8 text-center shadow-[var(--ds-raise-1)]">
            <CheckCircle2 className="w-10 h-10 text-ds-emerald-success mx-auto mb-3" />
            <p className="text-sm text-ds-text font-medium">
              No active alerts{severityFilter !== 'all' && ` with severity "${severityFilter}"`}
            </p>
            <p className="text-xs text-ds-text-secondary mt-1">All systems nominal</p>
          </motion.div>
        ) : (
          alerts.map((alert, i) => {
            const Icon = getAlertIcon(alert.alert_type);
            const isAck = alert.lifecycle === 'acknowledged';
            const isPendingAck = acknowledgeMutation.isPending && acknowledgeMutation.variables === alert.id;
            const isPendingRes = resolveMutation.isPending && resolveMutation.variables === alert.id;

            return (
              <motion.div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: 0.05 + i * 0.03 }}
                className={cn(
                  'card-apple p-4 flex items-start gap-4 group hover:shadow-[var(--ds-raise-2)] transition-all duration-200 border border-ds-border/60',
                  isAck && 'border-ds-amber-warning/30'
                )}
              >
                {/* Icon */}
                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0', getSeverityBg(alert.severity))}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-sm font-semibold text-ds-text">
                      {alert.product_name || 'System Alert'}
                    </h4>
                    {/* Severity badge */}
                    <span className={cn('badge-apple border font-bold uppercase', getSeverityBg(alert.severity))}>
                      {alert.severity}
                    </span>
                    {/* Type badge */}
                    <span className="badge-apple bg-ds-surface-sunken text-ds-text-secondary border border-ds-border">
                      {getTypeLabel(alert.alert_type)}
                    </span>
                    {/* Lifecycle badge */}
                    {alert.lifecycle !== 'active' && (
                      <span className={cn('badge-apple flex items-center gap-1 font-bold border', lifecycleBadge(alert.lifecycle))}>
                        {alert.lifecycle === 'acknowledged' ? <Eye className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {alert.lifecycle.charAt(0).toUpperCase() + alert.lifecycle.slice(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ds-text-secondary leading-relaxed">{alert.message}</p>

                  {/* Extra context from rule engine */}
                  {alert.extra_data && Object.keys(alert.extra_data).length > 0 && (
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      {alert.extra_data.current_stock !== undefined && (
                        <span className="text-[11px] text-ds-text-secondary font-mono">
                          Stock: <span className="text-ds-text font-semibold">{String(alert.extra_data.current_stock)}</span>
                        </span>
                      )}
                      {alert.extra_data.reorder_point !== undefined && (
                        <span className="text-[11px] text-ds-text-secondary font-mono">
                          Reorder at: <span className="text-ds-text font-semibold">{String(alert.extra_data.reorder_point)}</span>
                        </span>
                      )}
                      {alert.extra_data.accuracy !== undefined && (
                        <span className="text-[11px] text-ds-text-secondary font-mono">
                          Accuracy: <span className="text-ds-red-danger font-semibold">{(Number(alert.extra_data.accuracy) * 100).toFixed(1)}%</span>
                        </span>
                      )}
                      {alert.extra_data.z_score !== undefined && (
                        <span className="text-[11px] text-ds-text-secondary font-mono">
                          Z-score: <span className="text-ds-amber-warning font-semibold">{Number(alert.extra_data.z_score).toFixed(2)}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-[11px] text-ds-text-secondary font-mono">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                    {alert.acknowledged_at && (
                      <p className="text-[11px] text-ds-amber-warning font-mono">
                        Ack: {new Date(alert.acknowledged_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Acknowledge (only for active) */}
                  {alert.lifecycle === 'active' && (
                    <button
                      id={`btn-ack-${alert.id}`}
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={isPendingAck}
                      className="btn-apple text-[11px] h-8 px-3 bg-ds-amber-warning/10 text-ds-amber-warning border border-ds-amber-warning/25 hover:bg-ds-amber-warning/20 transition-all duration-200 disabled:opacity-50"
                    >
                      {isPendingAck ? '...' : 'Acknowledge'}
                    </button>
                  )}
                  {/* Resolve */}
                  <button
                    id={`btn-resolve-${alert.id}`}
                    onClick={() => resolveMutation.mutate(alert.id)}
                    disabled={isPendingRes}
                    className="btn-apple btn-apple-primary text-[11px] h-8 px-3 shadow-[var(--ds-raise-1)] disabled:opacity-50"
                  >
                    {isPendingRes ? '...' : 'Resolve'}
                  </button>
                  {/* Dismiss */}
                  <button
                    id={`btn-dismiss-${alert.id}`}
                    onClick={() => dismissMutation.mutate(alert.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ds-text-secondary hover:text-ds-red-danger hover:bg-ds-red-danger/10 transition-colors"
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
