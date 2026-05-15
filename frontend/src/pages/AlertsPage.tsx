/** Alert Center Page - Inventory alerts with real-time notifications. */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, AlertOctagon, Info, CheckCircle2, Filter, XCircle, X } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { cn, getSeverityBg } from '@/lib/utils';

const initialAlerts = [
  { id: 1, product: 'Bluetooth Speaker', type: 'stockout', severity: 'critical' as const, message: 'Stockout imminent. Current stock: 3 units, Daily demand: 15 units. Estimated stockout in 0.2 days.', created: '1 hour ago', resolved: false },
  { id: 2, product: 'USB-C Hub', type: 'low_stock', severity: 'critical' as const, message: 'Critical stock level. Current: 12 units, Safety Stock: 50 units. Stock is 76% below safety threshold.', created: '3 hours ago', resolved: false },
  { id: 3, product: 'Wireless Headphones', type: 'reorder', severity: 'high' as const, message: 'Below reorder point. Current: 45 units, Reorder Point: 120 units. Recommended order: 200 units.', created: '5 hours ago', resolved: false },
  { id: 4, product: 'Laptop Stand', type: 'reorder', severity: 'medium' as const, message: 'Approaching reorder point. Current: 89 units, Reorder Point: 95 units. Monitor closely.', created: '8 hours ago', resolved: false },
  { id: 5, product: 'Smart Watch Pro', type: 'overstock', severity: 'low' as const, message: 'Overstock detected. Current: 580 units, Maximum capacity: 400 units. Consider running promotions.', created: '1 day ago', resolved: false },
  { id: 6, product: 'Monitor Arm', type: 'reorder', severity: 'medium' as const, message: 'Stock level near reorder point. Current: 78, ROP: 70. Order placed for 50 units.', created: '2 days ago', resolved: true },
  { id: 7, product: 'Mechanical Keyboard', type: 'low_stock', severity: 'low' as const, message: 'Seasonal demand spike expected in Q4. Consider pre-ordering to avoid shortages.', created: '3 days ago', resolved: true },
];

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'stockout': return AlertOctagon;
    case 'low_stock': return AlertTriangle;
    case 'overstock': return Info;
    default: return Bell;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'stockout': return 'Stockout Risk';
    case 'low_stock': return 'Low Stock';
    case 'reorder': return 'Reorder';
    case 'overstock': return 'Overstock';
    default: return type;
  }
};

const severityLevels = ['all', 'critical', 'high', 'medium', 'low'] as const;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleResolve = (id: number) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, resolved: true } : a));
    const alert = alerts.find(a => a.id === id);
    showToast(`✅ Action taken on alert: ${alert?.product}`);
  };

  const handleDismiss = (id: number) => {
    const alert = alerts.find(a => a.id === id);
    setAlerts(alerts.filter(a => a.id !== id));
    showToast(`🗑️ Alert dismissed: ${alert?.product}`);
  };

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'all') return alerts;
    return alerts.filter(a => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  const activeCount = alerts.filter(a => !a.resolved).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
  const resolvedTodayCount = alerts.filter(a => a.resolved).length;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl glass-card !bg-accent-500/10 !border-accent-500/30 text-accent-400 text-sm font-medium flex items-center gap-2 shadow-2xl">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Alert Center</h1>
          <p className="text-sm text-surface-500 mt-1">Real-time inventory alerts & notification management</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border",
              showFilters || severityFilter !== 'all' ? "bg-primary-500/10 text-primary-400 border-primary-500/30" : "bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 border-surface-700/50")}>
            <Filter className="w-3.5 h-3.5" /> Filter Alerts
            {severityFilter !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />}
          </button>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-48 glass-card p-3 z-50 space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-surface-300">Severity</span>
                  <button onClick={() => setShowFilters(false)} className="text-surface-500 hover:text-surface-300"><X className="w-3.5 h-3.5" /></button>
                </div>
                {severityLevels.map(level => (
                  <button key={level} onClick={() => { setSeverityFilter(level); setShowFilters(false); }}
                    className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition capitalize",
                      severityFilter === level ? "bg-primary-500/10 text-primary-400" : "text-surface-400 hover:bg-surface-800/60 hover:text-surface-200")}>
                    {level === 'all' ? 'All Severities' : level}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Alerts" value={String(activeCount)} icon={Bell} gradient="gradient-primary" delay={0} />
        <KPICard title="Critical" value={String(criticalCount)} icon={AlertOctagon} gradient="gradient-danger" delay={0.05} />
        <KPICard title="Resolved Today" value={String(resolvedTodayCount)} icon={CheckCircle2} gradient="gradient-accent" delay={0.1} />
        <KPICard title="Avg Response" value="2.4h" change={-15.3} icon={AlertTriangle} gradient="gradient-warning" delay={0.15} />
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card p-8 text-center">
            <Bell className="w-10 h-10 text-surface-600 mx-auto mb-3" />
            <p className="text-sm text-surface-400">No alerts found {severityFilter !== 'all' && `with severity "${severityFilter}"`}</p>
          </motion.div>
        ) : filteredAlerts.map((alert, i) => {
          const Icon = getAlertIcon(alert.type);
          return (
            <motion.div key={alert.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              className={cn('glass-card p-4 flex items-start gap-4 group hover:border-surface-600/50 transition-colors',
                alert.resolved && 'opacity-60')}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getSeverityBg(alert.severity))}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="text-sm font-semibold text-surface-200">{alert.product}</h4>
                  <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border', getSeverityBg(alert.severity))}>
                    {alert.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-800/60 text-surface-400 border border-surface-700/50">
                    {getTypeLabel(alert.type)}
                  </span>
                  {alert.resolved && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent-500/10 text-accent-400 border border-accent-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-400 leading-relaxed">{alert.message}</p>
                <p className="text-[11px] text-surface-600 mt-2">{alert.created}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!alert.resolved && (
                  <>
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold gradient-primary text-white shadow-lg shadow-primary-500/15 hover:shadow-xl transition-shadow">
                      Take Action
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-danger-400 hover:bg-danger-500/10 transition">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
