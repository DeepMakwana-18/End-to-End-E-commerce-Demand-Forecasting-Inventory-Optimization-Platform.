/** Inventory Optimization Page - Stock levels, safety stock, reorder points. */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ShieldCheck, RotateCcw, AlertTriangle, Search,
  Filter, Download, ArrowUpDown, X, CheckCircle2,
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn, formatNumber } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi, systemApi } from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

type StatusType = 'healthy' | 'low' | 'critical' | 'overstock';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  healthy: { label: 'Healthy', color: 'text-ds-emerald-success', bg: 'bg-ds-emerald-success/10 border-ds-emerald-success/25' },
  low: { label: 'Low Stock', color: 'text-ds-amber-warning', bg: 'bg-ds-amber-warning/10 border-ds-amber-warning/25' },
  critical: { label: 'Critical', color: 'text-ds-red-danger', bg: 'bg-ds-red-danger/10 border-ds-red-danger/25' },
  overstock: { label: 'Overstock', color: 'text-ds-blue-action', bg: 'bg-ds-blue-action/10 border-ds-blue-action/25' },
};

const getHealthColor = (score: number) => {
  if (score >= 80) return '#34C759'; // Apple Green
  if (score >= 60) return '#FF9500'; // Apple Amber
  if (score >= 30) return '#FF9500';
  return '#FF3B30'; // Apple Red
};

type SortKey = 'name' | 'current_stock' | 'health_score' | 'status';

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
      const res = await inventoryApi.getAll(); // Assuming no pagination needed or handled by backend limit
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists
  });

  const inventoryItems = inventoryData?.items || [];
  const isEmptyOrg = systemStatus && !systemStatus.dataset_exists;
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
  }, [searchTerm, statusFilter, sortKey, sortAsc]);

  const healthChartData = filteredItems.map(item => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + '…' : item.name,
    score: item.health_score,
    status: item.status,
  }));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleExport = () => {
    const headers = ['Name', 'SKU', 'Category', 'Current Stock', 'Safety Stock', 'Reorder Point', 'Rec. Order Qty', 'Lead Time', 'Status', 'Health Score'];
    const rows = filteredItems.map(i => `${i.name},${i.sku},${i.category},${i.current_stock},${i.safety_stock},${i.reorder_point},${i.recommended_qty},${i.lead_time},${i.status},${i.health_score}`);
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Inventory data exported as CSV');
  };

  const sortIndicator = (key: SortKey) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

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

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ds-text tracking-tight">Inventory Optimization</h1>
          <p className="text-sm text-ds-text-secondary mt-1">Safety stock, reorder points & inventory health monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("btn-apple btn-apple-soft text-xs h-9 px-3.5",
                (showFilters || statusFilter !== 'all') && "bg-ds-blue-action text-white")}>
              <Filter className="w-3.5 h-3.5" /> Filter
              {statusFilter !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 card-apple p-2 z-50 space-y-1 shadow-[var(--ds-raise-3)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-ds-border">
                    <span className="text-xs font-semibold text-ds-text">Filter by Status</span>
                    <button onClick={() => setShowFilters(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-ds-text-secondary hover:text-ds-text hover:bg-ds-surface-sunken"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {['all', 'healthy', 'low', 'critical', 'overstock'].map(s => (
                    <button key={s} onClick={() => { setStatusFilter(s); setShowFilters(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 capitalize",
                        statusFilter === s ? "bg-ds-blue-action text-white" : "text-ds-text-secondary hover:bg-ds-surface-sunken hover:text-ds-text")}>
                      {s === 'all' ? 'All Statuses' : statusConfig[s]?.label || s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={handleExport}
            className="btn-apple btn-apple-primary text-xs h-9 px-3.5 shadow-[var(--ds-raise-1)]">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total SKUs" value={formatNumber(totalSKUs)} icon={Package} gradient="gradient-primary" delay={0} />
        <KPICard title="Healthy Stock" value={totalSKUs > 0 ? `${healthyStockPercent}%` : "—"} change={totalSKUs > 0 ? (healthyStockPercent >= 50 ? 3.2 : -1.5) : undefined} icon={ShieldCheck} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Reorder Needed" value={String(reorderNeededCount)} icon={RotateCcw} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Critical Items" value={String(criticalItemsCount)} change={criticalItemsCount > 0 ? -2.0 : undefined} icon={AlertTriangle} gradient="gradient-danger" delay={0.15} />
      </div>

      {/* Health Score Chart */}
      <ChartCard title="Inventory Health Scores" subtitle={`Per-product health score (0-100)${statusFilter !== 'all' ? ` — ${statusConfig[statusFilter]?.label}` : ''}`} delay={0.2}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={healthChartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', boxShadow: 'var(--ds-raise-2)', fontSize: '12px', color: 'var(--ds-text)' }} />
            <Bar dataKey="score" name="Health Score" radius={[0, 8, 8, 0]} maxBarSize={20}>
              {healthChartData.map((entry, i) => (
                <Cell key={i} fill={getHealthColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Inventory Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="card-apple overflow-hidden shadow-[var(--ds-raise-1)]">
        <div className="p-4 border-b border-ds-border/60 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ds-text">
            Inventory Items <span className="text-ds-text-secondary font-normal font-mono">({filteredItems.length})</span>
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-secondary" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products, SKU, category..."
              className="w-full pl-9 pr-4 py-2 rounded-full text-xs bg-ds-surface-sunken border border-ds-border text-ds-text placeholder:text-ds-text-secondary focus:outline-none focus:ring-2 focus:ring-ds-blue-action/25 transition-all duration-200"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ds-border/60 bg-ds-surface-sunken/40">
                {([['Product', 'name'], ['SKU', ''], ['Category', ''], ['Current Stock', 'current_stock'], ['Safety Stock', ''], ['Reorder Point', ''], ['Rec. Order Qty', ''], ['Lead Time', ''], ['Status', 'status'], ['Health', 'health_score']] as [string, string][]).map(([h, key]) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-ds-text-secondary uppercase tracking-wider whitespace-nowrap">
                    <div className={cn("flex items-center gap-1", key && "cursor-pointer hover:text-ds-text transition-colors")}
                      onClick={() => key && handleSort(key as SortKey)}>
                      {h}{key && sortIndicator(key as SortKey)} {key && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-ds-text-secondary">
                    No items found {searchTerm && `matching "${searchTerm}"`} {statusFilter !== 'all' && `with status "${statusConfig[statusFilter]?.label}"`}
                  </td>
                </tr>
              ) : filteredItems.map((item, i) => {
                const sc = statusConfig[item.status];
                return (
                  <motion.tr key={item.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
                    className="border-b border-ds-border/30 hover:bg-ds-surface-sunken/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-ds-text whitespace-nowrap">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-ds-text-secondary font-mono">{item.sku}</td>
                    <td className="px-4 py-3 text-xs text-ds-text-secondary">{item.category}</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold font-sans tabular-nums', sc.color)}>{formatNumber(item.current_stock)}</td>
                    <td className="px-4 py-3 text-sm text-ds-text-secondary font-sans tabular-nums">{formatNumber(item.safety_stock)}</td>
                    <td className="px-4 py-3 text-sm text-ds-text-secondary font-sans tabular-nums">{formatNumber(item.reorder_point)}</td>
                    <td className="px-4 py-3 text-sm font-semibold font-sans text-ds-text tabular-nums">
                      {item.recommended_qty > 0 ? formatNumber(item.recommended_qty) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-ds-text-secondary font-sans tabular-nums">{item.lead_time}w</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge-apple border font-bold uppercase', sc.bg, sc.color)}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-ds-surface-sunken rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.health_score}%`, background: getHealthColor(item.health_score) }} />
                        </div>
                        <span className="text-xs font-semibold font-sans tabular-nums" style={{ color: getHealthColor(item.health_score) }}>{item.health_score}</span>
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
