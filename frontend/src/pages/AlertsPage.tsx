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
      return 'bg-warning-500/10 text-warning-400 border-warning-500/20';
    case 'resolved':
      return 'bg-accent-500/10 text-accent-400 border-accent-500/20';
    default:
      return 'bg-surface-800/60 text-surface-400 border-surface-700/50';
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
          <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Alert Center</h1>
          <p className="text-sm text-surface-500 mt-1">
            Rule-driven inventory, anomaly &amp; model alerts — <span className="text-primary-400">{activeCount} active</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual scan */}
          <button
            id="btn-scan-inventory"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/30 hover:bg-primary-500/20 transition disabled:opacity-50"
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
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border',
                showFilters || severityFilter !== 'all'
                  ? 'bg-primary-500/10 text-primary-400 border-primary-500/30'
                  : 'bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 border-surface-700/50'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
              {severityFilter !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 glass-card p-3 z-50 space-y-1"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-surface-300">Severity</span>
                    <button onClick={() => setShowFilters(false)} className="text-surface-500 hover:text-surface-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {severityLevels.map(level => (
                    <button
                      key={level}
                      onClick={() => { setSeverityFilter(level); setShowFilters(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition capitalize',
                        severityFilter === level
                          ? 'bg-primary-500/10 text-primary-400'
                          : 'text-surface-400 hover:bg-surface-800/60 hover:text-surface-200'
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
          <div className="glass-card p-8 text-center">
            <RefreshCw className="w-6 h-6 text-primary-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-surface-400">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-accent-500 mx-auto mb-3" />
            <p className="text-sm text-surface-400">
              No active alerts{severityFilter !== 'all' && ` with severity "${severityFilter}"`}
            </p>
            <p className="text-xs text-surface-600 mt-1">All systems nominal</p>
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
                  'glass-card p-4 flex items-start gap-4 group hover:border-surface-600/50 transition-colors',
                  isAck && 'border-warning-500/20'
                )}
              >
                {/* Icon */}
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getSeverityBg(alert.severity))}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-sm font-semibold text-surface-200">
                      {alert.product_name || 'System Alert'}
                    </h4>
                    {/* Severity badge */}
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border', getSeverityBg(alert.severity))}>
                      {alert.severity}
                    </span>
                    {/* Type badge */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-800/60 text-surface-400 border border-surface-700/50">
                      {getTypeLabel(alert.alert_type)}
                    </span>
                    {/* Lifecycle badge */}
                    {alert.lifecycle !== 'active' && (
                      <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border', lifecycleBadge(alert.lifecycle))}>
                        {alert.lifecycle === 'acknowledged' ? <Eye className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {alert.lifecycle.charAt(0).toUpperCase() + alert.lifecycle.slice(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-surface-400 leading-relaxed">{alert.message}</p>

                  {/* Extra context from rule engine */}
                  {alert.extra_data && Object.keys(alert.extra_data).length > 0 && (
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      {alert.extra_data.current_stock !== undefined && (
                        <span className="text-[11px] text-surface-500">
                          Stock: <span className="text-surface-300">{String(alert.extra_data.current_stock)}</span>
                        </span>
                      )}
                      {alert.extra_data.reorder_point !== undefined && (
                        <span className="text-[11px] text-surface-500">
                          Reorder at: <span className="text-surface-300">{String(alert.extra_data.reorder_point)}</span>
                        </span>
                      )}
                      {alert.extra_data.accuracy !== undefined && (
                        <span className="text-[11px] text-surface-500">
                          Accuracy: <span className="text-danger-400">{(Number(alert.extra_data.accuracy) * 100).toFixed(1)}%</span>
                        </span>
                      )}
                      {alert.extra_data.z_score !== undefined && (
                        <span className="text-[11px] text-surface-500">
                          Z-score: <span className="text-warning-400">{Number(alert.extra_data.z_score).toFixed(2)}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-[11px] text-surface-600">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                    {alert.acknowledged_at && (
                      <p className="text-[11px] text-warning-600">
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
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-warning-500/10 text-warning-400 border border-warning-500/20 hover:bg-warning-500/20 transition disabled:opacity-50"
                    >
                      {isPendingAck ? '...' : 'Acknowledge'}
                    </button>
                  )}
                  {/* Resolve */}
                  <button
                    id={`btn-resolve-${alert.id}`}
                    onClick={() => resolveMutation.mutate(alert.id)}
                    disabled={isPendingRes}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold gradient-primary text-white shadow-lg shadow-primary-500/15 hover:shadow-xl transition disabled:opacity-50"
                  >
                    {isPendingRes ? '...' : 'Resolve'}
                  </button>
                  {/* Dismiss */}
                  <button
                    id={`btn-dismiss-${alert.id}`}
                    onClick={() => dismissMutation.mutate(alert.id)}
                    className="p-1.5 rounded-lg text-surface-500 hover:text-danger-400 hover:bg-danger-500/10 transition"
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
