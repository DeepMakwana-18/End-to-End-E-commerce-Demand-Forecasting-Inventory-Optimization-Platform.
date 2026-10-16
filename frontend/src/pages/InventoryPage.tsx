/** Inventory Optimization Page - Stock levels, safety stock, reorder points. */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ShieldCheck, RotateCcw, AlertTriangle, Search,
  Filter, Download, ArrowUpDown, X, CheckCircle2, TrendingUp, TrendingDown,
  Activity,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi, systemApi } from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  healthy: {
    label: 'Healthy',
    color: 'text-emerald-700 dark:text-ds-emerald-success',
    bg: 'bg-emerald-50 dark:bg-ds-emerald-success/15 border-emerald-200/80 dark:border-ds-emerald-success/30',
  },
  low: {
    label: 'Low Stock',
    color: 'text-amber-700 dark:text-ds-amber-warning',
    bg: 'bg-amber-50 dark:bg-ds-amber-warning/15 border-amber-200/80 dark:border-ds-amber-warning/30',
  },
  critical: {
    label: 'Critical',
    color: 'text-rose-700 dark:text-ds-red-danger',
    bg: 'bg-rose-50 dark:bg-ds-red-danger/15 border-rose-200/80 dark:border-ds-red-danger/30',
  },
  overstock: {
    label: 'Overstock',
    color: 'text-blue-700 dark:text-ds-blue-action',
    bg: 'bg-blue-50 dark:bg-ds-blue-action/15 border-blue-200/80 dark:border-ds-blue-action/30',
  },
};

const getHealthColor = (score: number) => {
  if (score >= 80) return '#0D9488'; // Teal
  if (score >= 60) return '#D97706'; // Amber
  return '#E11D48'; // Red
};

type SortKey = 'name' | 'current_stock' | 'health_score' | 'status';

interface InventoryKpiProps {
  title: string;
  value: React.ReactNode;
  sub?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  cardBg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  delay?: number;
}

function InventoryKpiCard({
  title, value, sub, change, changeLabel = 'vs last period',
  icon: Icon, cardBg, border, iconBg, iconColor, valueColor, delay = 0,
}: InventoryKpiProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.28, 0.11, 0.32, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'rounded-2xl p-5 border relative overflow-hidden group cursor-default h-full flex flex-col justify-between min-h-[142px] shadow-2xs hover:shadow-xs transition-all duration-200 dark:bg-none dark:bg-ds-surface',
        cardBg,
        border
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

          {change !== undefined ? (
            <div className="flex items-center gap-1.5 mt-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums border shadow-2xs',
                  isPositive && 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-ds-green-surface dark:text-ds-green-text dark:border-ds-green/20',
                  isNegative && 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-ds-red-surface dark:text-ds-red-text dark:border-ds-red/20'
                )}
              >
                {isPositive ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-rose-600" />}
                {isPositive && '+'}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500 dark:text-ds-text-muted font-medium truncate">{changeLabel}</span>
            </div>
          ) : sub ? (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-ds-border-control" />
              <span className="text-xs font-medium text-slate-500 dark:text-ds-text-muted truncate">{sub}</span>
            </div>
          ) : null}
        </div>

        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}

export default function InventoryPage() {
  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    }
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await inventoryApi.getAll();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists
  });

  const inventoryItems = useMemo(() => inventoryData?.items || [], [inventoryData?.items]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('health_score');
  const [sortAsc, setSortAsc] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const totalSKUs = inventoryItems.length;
  const healthyStockCount = inventoryItems.filter(i => i.status === 'healthy').length;
  const healthyStockPercent = totalSKUs > 0 ? Math.round((healthyStockCount / totalSKUs) * 100) : 0;
  const reorderNeededCount = inventoryItems.filter(i => i.recommended_qty > 0).length;
  const criticalItemsCount = inventoryItems.filter(i => i.status === 'critical').length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredItems = useMemo(() => {
    let items = inventoryItems.filter(item =>
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || item.status === statusFilter)
    );
    items = [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return items;
  }, [inventoryItems, searchTerm, statusFilter, sortKey, sortAsc]);

  const healthChartData = useMemo(() => {
    return filteredItems.map(item => ({
      name: item.name.length > 14 ? item.name.substring(0, 14) + '…' : item.name,
      score: item.health_score,
      status: item.status,
    }));
  }, [filteredItems]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleExport = () => {
    const headers = ['Name', 'SKU', 'Category', 'Current Stock', 'Safety Stock', 'Reorder Point', 'Rec. Order Qty', 'Lead Time', 'Status', 'Health Score'];
    const rows = filteredItems.map(i => `"${i.name}","${i.sku}","${i.category}",${i.current_stock},${i.safety_stock},${i.reorder_point},${i.recommended_qty},${i.lead_time},"${i.status}",${i.health_score}`);
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Inventory report exported as CSV');
  };

  const sortIndicator = (key: SortKey) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-teal-50 dark:bg-accent-500/10 border border-teal-200 dark:border-accent-500/30 text-teal-800 dark:text-accent-400 text-sm font-medium flex items-center gap-2 shadow-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-accent-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header with Teal-Blue Visual Accent ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
        {/* Subtle teal-blue decorative accent glow */}
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-teal-500/10 via-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-600 to-blue-600 flex items-center justify-center text-white shadow-xs">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-teal-500 to-blue-600 inline-block" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-ds-text tracking-tight">
                Inventory Optimization
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-0.5 ml-3.5">
              Safety stock, reorder thresholds &amp; dynamic inventory health telemetry
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-2.5">
          {/* Filter Button & Popover */}
          <div className="relative">
            <button
              id="inventory-filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'btn-apple text-xs h-9 px-3.5 border transition-all shadow-2xs flex items-center gap-1.5',
                (showFilters || statusFilter !== 'all')
                  ? 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-ds-blue-action dark:text-white dark:border-transparent font-semibold'
                  : 'bg-white dark:bg-ds-surface border-slate-200/90 dark:border-ds-border text-slate-700 dark:text-ds-text hover:bg-slate-50 dark:hover:bg-ds-surface-sunken'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {statusFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-white" />
              )}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-52 p-2 z-50 space-y-1 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white/95 dark:bg-ds-surface/95 backdrop-blur-2xl shadow-xl"
                >
                  <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-ds-border">
                    <span className="text-xs font-bold text-slate-800 dark:text-ds-text">Filter by Stock Status</span>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-ds-surface-sunken"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {['all', 'healthy', 'low', 'critical', 'overstock'].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setShowFilters(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 capitalize flex items-center justify-between',
                        statusFilter === s
                          ? 'bg-teal-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-ds-text-secondary hover:bg-slate-100/80 dark:hover:bg-ds-surface-sunken hover:text-slate-900 dark:hover:text-ds-text'
                      )}
                    >
                      <span>{s === 'all' ? 'All Statuses' : statusConfig[s]?.label || s}</span>
                      {statusFilter === s && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export Button */}
          <button
            id="inventory-export-btn"
            onClick={handleExport}
            className="btn-apple text-xs h-9 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </motion.div>

      {/* ── KPI Cards: Soft Tinted Gradients ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InventoryKpiCard
          title="Total SKUs"
          value={formatNumber(totalSKUs)}
          sub="Monitored in catalog"
          icon={Package}
          cardBg="bg-gradient-to-b from-indigo-50/70 via-indigo-50/30 to-white dark:bg-ds-surface"
          border="border-indigo-200/80 dark:border-ds-border"
          iconBg="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
          iconColor="text-indigo-600 dark:text-indigo-400"
          valueColor="text-indigo-950 dark:text-ds-text-primary"
          delay={0}
        />
        <InventoryKpiCard
          title="Healthy Stock"
          value={totalSKUs > 0 ? `${healthyStockPercent}%` : '—'}
          change={totalSKUs > 0 ? (healthyStockPercent >= 50 ? 3.2 : -1.5) : undefined}
          changeLabel="vs target"
          icon={ShieldCheck}
          cardBg="bg-gradient-to-b from-teal-50/70 via-emerald-50/30 to-white dark:bg-ds-surface"
          border="border-teal-200/80 dark:border-ds-border"
          iconBg="bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400"
          iconColor="text-teal-600 dark:text-teal-400"
          valueColor="text-teal-950 dark:text-ds-text-primary"
          delay={0.05}
        />
        <InventoryKpiCard
          title="Reorder Needed"
          value={String(reorderNeededCount)}
          sub={reorderNeededCount > 0 ? 'Replenishment recommended' : 'Optimal buffer levels'}
          icon={RotateCcw}
          cardBg="bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white dark:bg-ds-surface"
          border="border-amber-200/80 dark:border-ds-border"
          iconBg="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
          iconColor="text-amber-600 dark:text-amber-400"
          valueColor="text-amber-950 dark:text-ds-text-primary"
          delay={0.1}
        />
        <InventoryKpiCard
          title="Critical Items"
          value={String(criticalItemsCount)}
          change={criticalItemsCount > 0 ? -2.0 : undefined}
          changeLabel="immediate risk"
          sub={criticalItemsCount === 0 ? 'Zero stockout risk' : undefined}
          icon={AlertTriangle}
          cardBg="bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white dark:bg-ds-surface"
          border="border-rose-200/80 dark:border-ds-border"
          iconBg="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
          iconColor="text-rose-600 dark:text-rose-400"
          valueColor="text-rose-950 dark:text-ds-text-primary"
          delay={0.15}
        />
      </div>

      {/* ── Inventory Health Scores Chart ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="rounded-2xl border border-slate-200/90 dark:border-ds-border overflow-hidden bg-white dark:bg-ds-surface shadow-2xs"
      >
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-ds-border bg-gradient-to-r from-teal-50/60 via-slate-50/40 to-white dark:bg-none dark:bg-ds-surface-sunken/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/40 flex items-center justify-center text-teal-700 dark:text-teal-400 shadow-2xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
                Inventory Health Scores
              </h3>
              <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5 font-medium">
                Per-product health score (0–100){statusFilter !== 'all' ? ` — filtered by ${statusConfig[statusFilter]?.label}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-ds-text-muted font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-600" />Healthy (&ge;80)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Warning (60–79)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Critical (&lt;60)</span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {healthChartData.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3 border border-teal-200/60 dark:border-teal-800/40 shadow-2xs">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-ds-text">No Inventory Health Scores Available</p>
              <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-1 max-w-sm">
                {searchTerm || statusFilter !== 'all'
                  ? 'No items match the current search or status filter criteria.'
                  : 'Connect a dataset and run inventory calculations to evaluate stock health scores.'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.min(320, Math.max(180, healthChartData.length * 28))}>
              <BarChart data={healthChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(13, 148, 136, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const color = getHealthColor(data.score);
                      return (
                        <div className="p-3 bg-white dark:bg-ds-surface rounded-xl border border-slate-200 dark:border-ds-border shadow-lg text-xs">
                          <p className="font-bold text-slate-900 dark:text-ds-text mb-1">{data.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-slate-500 dark:text-ds-text-secondary">Health Score:</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-ds-text" style={{ color }}>{data.score}/100</span>
                          </div>
                          <p className="text-[10px] text-slate-400 capitalize mt-1">Status: {data.status}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="score" name="Health Score" radius={[0, 6, 6, 0]} maxBarSize={16}>
                  {healthChartData.map((entry, i) => (
                    <Cell key={i} fill={getHealthColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ── Inventory Items Table ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-slate-200/90 dark:border-ds-border overflow-hidden bg-white dark:bg-ds-surface shadow-2xs"
      >
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-ds-border/60 flex items-center justify-between flex-wrap gap-3 bg-slate-50/40 dark:bg-ds-surface">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text flex items-center gap-2">
              <span>Inventory Items</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-ds-surface-sunken text-slate-600 dark:text-ds-text-secondary font-mono border border-slate-200/60 dark:border-transparent">
                {filteredItems.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5">
              Live stock levels, safety stock buffers &amp; automated replenishment quantities
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-ds-text-secondary" />
            <input
              id="inventory-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products, SKU, category..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-ds-surface-sunken border border-slate-200/90 dark:border-ds-border text-slate-900 dark:text-ds-text placeholder:text-slate-400 dark:placeholder:text-ds-text-secondary focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-950 transition-all shadow-2xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/90 dark:border-ds-border/60 bg-slate-50/90 dark:bg-ds-surface-sunken/60">
                {([['Product', 'name'], ['SKU', ''], ['Category', ''], ['Current Stock', 'current_stock'], ['Safety Stock', ''], ['Reorder Point', ''], ['Rec. Order Qty', ''], ['Lead Time', ''], ['Status', 'status'], ['Health', 'health_score']] as [string, string][]).map(([h, key]) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-ds-text-secondary uppercase tracking-wider whitespace-nowrap">
                    <div
                      className={cn('flex items-center gap-1.5 select-none', key && 'cursor-pointer hover:text-slate-900 dark:hover:text-ds-text transition-colors')}
                      onClick={() => key && handleSort(key as SortKey)}
                    >
                      <span>{h}</span>
                      {key && (
                        <span className="text-slate-400 dark:text-ds-text-muted">
                          {sortIndicator(key as SortKey) || <ArrowUpDown className="w-3 h-3 opacity-60" />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-ds-text-secondary">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-8 h-8 text-slate-300 dark:text-ds-text-muted mb-2" />
                      <p className="font-semibold text-slate-700 dark:text-ds-text">No inventory items found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchTerm && `No results matching "${searchTerm}"`}
                        {statusFilter !== 'all' && ` with status "${statusConfig[statusFilter]?.label}"`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.map((item, i) => {
                const sc = statusConfig[item.status] || statusConfig.healthy;
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 + Math.min(i * 0.02, 0.4) }}
                    className="border-b border-slate-200/60 dark:border-ds-border/30 hover:bg-teal-50/30 dark:hover:bg-ds-surface-sunken/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-ds-text whitespace-nowrap">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-ds-text-secondary font-mono">{item.sku}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-ds-text-secondary">{item.category}</td>
                    <td className={cn('px-4 py-3 text-sm font-bold font-sans tabular-nums', sc.color)}>{formatNumber(item.current_stock)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-ds-text-secondary font-sans tabular-nums">{formatNumber(item.safety_stock)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-ds-text-secondary font-sans tabular-nums">{formatNumber(item.reorder_point)}</td>
                    <td className="px-4 py-3 text-sm font-bold font-sans text-slate-900 dark:text-ds-text tabular-nums">
                      {item.recommended_qty > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400 font-bold">{formatNumber(item.recommended_qty)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-ds-text-secondary font-sans tabular-nums">{item.lead_time}w</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs', sc.bg, sc.color)}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-16 h-2 bg-slate-100 dark:bg-ds-surface-sunken rounded-full overflow-hidden border border-slate-200/50 dark:border-transparent">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.health_score}%`, backgroundColor: getHealthColor(item.health_score) }}
                          />
                        </div>
                        <span className="text-xs font-bold font-sans tabular-nums" style={{ color: getHealthColor(item.health_score) }}>
                          {item.health_score}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
