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
  healthy: { label: 'Healthy', color: 'text-accent-400', bg: 'bg-accent-500/10 border-accent-500/20' },
  low: { label: 'Low Stock', color: 'text-warning-400', bg: 'bg-warning-500/10 border-warning-500/20' },
  critical: { label: 'Critical', color: 'text-danger-400', bg: 'bg-danger-500/10 border-danger-500/20' },
  overstock: { label: 'Overstock', color: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20' },
};

const getHealthColor = (score: number) => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 30) return '#f97316';
  return '#ef4444';
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
          <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Inventory Optimization</h1>
          <p className="text-sm text-surface-500 mt-1">Safety stock, reorder points & inventory health monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border",
                showFilters || statusFilter !== 'all' ? "bg-primary-500/10 text-primary-400 border-primary-500/30" : "bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 border-surface-700/50")}>
              <Filter className="w-3.5 h-3.5" /> Filter
              {statusFilter !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 glass-card p-3 z-50 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-surface-300">Filter by Status</span>
                    <button onClick={() => setShowFilters(false)} className="text-surface-500 hover:text-surface-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {['all', 'healthy', 'low', 'critical', 'overstock'].map(s => (
                    <button key={s} onClick={() => { setStatusFilter(s); setShowFilters(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition capitalize",
                        statusFilter === s ? "bg-primary-500/10 text-primary-400" : "text-surface-400 hover:bg-surface-800/60 hover:text-surface-200")}>
                      {s === 'all' ? 'All Statuses' : statusConfig[s]?.label || s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium gradient-primary text-white shadow-lg shadow-primary-500/20">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total SKUs" value={formatNumber(totalSKUs)} icon={Package} gradient="gradient-primary" delay={0} />
        <KPICard title="Healthy Stock" value={totalSKUs > 0 ? `${healthyStockPercent}%` : "No data"} change={totalSKUs > 0 ? (healthyStockPercent >= 50 ? 3.2 : -1.5) : undefined} icon={ShieldCheck} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Reorder Needed" value={String(reorderNeededCount)} icon={RotateCcw} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Critical Items" value={String(criticalItemsCount)} change={criticalItemsCount > 0 ? -2.0 : undefined} icon={AlertTriangle} gradient="gradient-danger" delay={0.15} />
      </div>

      {/* Health Score Chart */}
      <ChartCard title="Inventory Health Scores" subtitle={`Per-product health score (0-100)${statusFilter !== 'all' ? ` — ${statusConfig[statusFilter]?.label}` : ''}`} delay={0.2}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={healthChartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '12px', fontSize: '12px' }} />
            <Bar dataKey="score" name="Health Score" radius={[0, 6, 6, 0]} maxBarSize={20}>
              {healthChartData.map((entry, i) => (
                <Cell key={i} fill={getHealthColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Inventory Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-800/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-200">
            Inventory Items <span className="text-surface-500 font-normal">({filteredItems.length})</span>
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products, SKU, category..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-surface-800/50 border border-surface-700/50 text-surface-300 placeholder:text-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-800/50 bg-surface-900/50">
                {([['Product', 'name'], ['SKU', ''], ['Category', ''], ['Current Stock', 'current_stock'], ['Safety Stock', ''], ['Reorder Point', ''], ['Rec. Order Qty', ''], ['Lead Time', ''], ['Status', 'status'], ['Health', 'health_score']] as [string, string][]).map(([h, key]) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-surface-500 uppercase tracking-wider whitespace-nowrap">
                    <div className={cn("flex items-center gap-1", key && "cursor-pointer hover:text-surface-300 transition")}
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
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-surface-500">
                    No items found {searchTerm && `matching "${searchTerm}"`} {statusFilter !== 'all' && `with status "${statusConfig[statusFilter]?.label}"`}
                  </td>
                </tr>
              ) : filteredItems.map((item, i) => {
                const sc = statusConfig[item.status];
                return (
                  <motion.tr key={item.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
                    className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-surface-200 whitespace-nowrap">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-surface-400 font-mono">{item.sku}</td>
                    <td className="px-4 py-3 text-xs text-surface-400">{item.category}</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold tabular-nums', sc.color)}>{formatNumber(item.current_stock)}</td>
                    <td className="px-4 py-3 text-sm text-surface-300 tabular-nums">{formatNumber(item.safety_stock)}</td>
                    <td className="px-4 py-3 text-sm text-surface-300 tabular-nums">{formatNumber(item.reorder_point)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-surface-200 tabular-nums">
                      {item.recommended_qty > 0 ? formatNumber(item.recommended_qty) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-400">{item.lead_time}w</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded-md text-[10px] font-bold uppercase border', sc.bg, sc.color)}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-800/50 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.health_score}%`, background: getHealthColor(item.health_score) }} />
                        </div>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: getHealthColor(item.health_score) }}>{item.health_score}</span>
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
