/**
 * Inventory Optimization Page — Titan AI
 *
 * Safety stock buffers, reorder thresholds & dynamic inventory health telemetry.
 * Aligned with the Titan AI design system (ink, warm paper, blue actions, restrained orange accents).
 *
 * Features:
 *   • Compact editorial page header (INVENTORY INTELLIGENCE) with Filter & Export CSV
 *   • 4 Standardized KPI cards with explicit source definitions
 *   • Upstream initialization transparency note
 *   • Risk-first compact Health Score visual with progressive disclosure
 *   • Accessible table with sticky Product identity on desktop & stacked mobile cards
 *   • Full search, column sorting, status filtering, and keyboard navigation
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Package, ShieldCheck, RotateCcw, AlertTriangle, Search,
  Filter, Download, ArrowUpDown, X, CheckCircle2,
  Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi, systemApi } from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { InventoryItem } from '@/types';
import '@/styles/titan-dashboard.css';

const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  healthy: {
    label: 'HEALTHY',
    color: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60',
  },
  low: {
    label: 'LOW STOCK',
    color: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  },
  critical: {
    label: 'CRITICAL',
    color: 'text-rose-700 dark:text-rose-400',
    badge: 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60',
  },
  overstock: {
    label: 'OVERSTOCK',
    color: 'text-[#1e3fc8] dark:text-[#60a5fa]',
    badge: 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40',
  },
};

const getHealthColor = (score: number) => {
  if (score >= 80) return '#059669'; // Emerald
  if (score >= 60) return '#d97706'; // Amber
  return '#dc2626'; // Rose
};

type SortKey = 'name' | 'current_stock' | 'health_score' | 'status' | 'reorder_point' | 'recommended_qty';

interface TableCol {
  label: string;
  key: SortKey | '';
  align: 'left' | 'right' | 'center';
  minWidth: string;
  className?: string;
}

const TABLE_COLUMNS: TableCol[] = [
  { label: 'Product & SKU', key: 'name', align: 'left', minWidth: 'min-w-[210px]' },
  { label: 'Category', key: '', align: 'left', minWidth: 'min-w-[120px]' },
  { label: 'Current Stock', key: 'current_stock', align: 'right', minWidth: 'min-w-[110px]' },
  { label: 'Safety Stock', key: '', align: 'right', minWidth: 'min-w-[105px]' },
  { label: 'Reorder Point', key: 'reorder_point', align: 'right', minWidth: 'min-w-[105px]' },
  { label: 'Rec. Order Qty', key: 'recommended_qty', align: 'right', minWidth: 'min-w-[120px]' },
  { label: 'Lead Time', key: '', align: 'right', minWidth: 'min-w-[95px]' },
  { label: 'Stock Status', key: 'status', align: 'center', minWidth: 'min-w-[120px]' },
  { label: 'Health Score', key: 'health_score', align: 'right', minWidth: 'min-w-[125px]' },
];

export default function InventoryPage() {
  const prefersReducedMotion = useReducedMotion();

  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    },
  });

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await inventoryApi.getAll();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists,
  });

  const inventoryItems: InventoryItem[] = useMemo(() => inventoryData?.items || [], [inventoryData?.items]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('health_score');
  const [sortAsc, setSortAsc] = useState(true); // Default ascending: lowest health / highest risk first
  const [showAllChartItems, setShowAllChartItems] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // KPI Calculations
  const totalSKUs = inventoryItems.length;
  const healthyStockCount = inventoryItems.filter((i) => i.status === 'healthy').length;
  const healthyStockPercent = totalSKUs > 0 ? Math.round((healthyStockCount / totalSKUs) * 100) : 0;
  const reorderNeededCount = inventoryItems.filter((i) => i.recommended_qty > 0).length;
  const criticalItemsCount = inventoryItems.filter((i) => i.status === 'critical').length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredItems = useMemo(() => {
    let items = inventoryItems.filter((item) =>
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || item.status === statusFilter)
    );
    items = [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? ((aVal as number) ?? 0) - ((bVal as number) ?? 0) : ((bVal as number) ?? 0) - ((aVal as number) ?? 0);
    });
    return items;
  }, [inventoryItems, searchTerm, statusFilter, sortKey, sortAsc]);

  // Risk-prioritized chart data (sorted by health score ascending)
  const healthChartData = useMemo(() => {
    const sortedByRisk = [...filteredItems].sort((a, b) => a.health_score - b.health_score);
    const visibleList = showAllChartItems ? sortedByRisk : sortedByRisk.slice(0, 10);
    return visibleList.map((item) => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '…' : item.name,
      fullName: item.name,
      sku: item.sku,
      category: item.category,
      current_stock: item.current_stock,
      safety_stock: item.safety_stock,
      reorder_point: item.reorder_point,
      recommended_qty: item.recommended_qty,
      score: item.health_score,
      status: item.status,
    }));
  }, [filteredItems, showAllChartItems]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'health_score'); // Health score defaults to ascending (risk-first)
    }
  };

  const handleExport = () => {
    const headers = [
      'Product Name', 'SKU', 'Category', 'Current Stock', 'Safety Stock',
      'Reorder Point', 'Recommended Order Qty', 'Lead Time (Weeks)', 'Status', 'Health Score',
    ];
    const rows = filteredItems.map((i) =>
      `"${i.name}","${i.sku}","${i.category}",${i.current_stock},${i.safety_stock},${i.reorder_point},${i.recommended_qty},${i.lead_time},"${i.status}",${i.health_score}`
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_optimization_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Inventory report exported as CSV');
  };

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '');

  return (
    <div className="space-y-6 pb-24">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.16 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-[12px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] text-xs font-semibold flex items-center gap-2 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] flex-shrink-0" aria-hidden="true" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. Compact Titan Editorial Page Header ───────────────────── */}
      <header
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
        className="titan-dash-reveal pb-6 border-b border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.13em] text-[#52525b] dark:text-[#a1a1aa]">
            <span className="inline-block w-6 h-[1.5px] bg-[#f59e0b]" aria-hidden="true" />
            <span>INVENTORY INTELLIGENCE</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-[32px] font-extrabold text-[#0a0a0a] dark:text-[#fafaf9] tracking-[-0.02em] leading-[1.15]">
            Inventory Optimization
          </h1>
          <p className="text-sm text-[#52525b] dark:text-[#a1a1aa] mt-1.5 font-medium">
            Safety stock buffers, reorder thresholds &amp; dynamic replenishment telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-end flex-shrink-0 relative z-20">
          {/* Filter Popover */}
          <div className="relative" ref={filterRef}>
            <button
              id="inventory-filter-toggle"
              type="button"
              aria-expanded={showFilters}
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                showFilters || statusFilter !== 'all'
                  ? 'bg-[#0a0a0a] text-[#fafaf9] border-[#0a0a0a] dark:bg-[#fafaf9] dark:text-[#0a0a0a] dark:border-[#fafaf9]'
                  : 'bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] border-[#e4e4e7] dark:border-[#27272a] hover:bg-[#fafaf9] dark:hover:bg-[#18181b]'
              )}
            >
              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{statusFilter === 'all' ? 'Filter' : STATUS_CONFIG[statusFilter]?.label || statusFilter}</span>
              {statusFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" aria-hidden="true" />
              )}
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-[14px] p-2 z-50 space-y-1 shadow-lg bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a]"
                >
                  <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-[#e4e4e7] dark:border-[#27272a]">
                    <span className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Filter by Stock Status</span>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] hover:bg-[#f1f1f3] dark:hover:bg-[#18181b] transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {['all', 'healthy', 'low', 'critical', 'overstock'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setStatusFilter(s); setShowFilters(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-[10px] text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer',
                        statusFilter === s
                          ? 'bg-[#0a0a0a] text-[#fafaf9] dark:bg-[#fafaf9] dark:text-[#0a0a0a]'
                          : 'text-[#52525b] dark:text-[#a1a1aa] hover:bg-[#f1f1f3] dark:hover:bg-[#18181b] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9]'
                      )}
                    >
                      <span>{s === 'all' ? 'All Statuses' : STATUS_CONFIG[s]?.label || s}</span>
                      {statusFilter === s && <CheckCircle2 className="w-3 h-3 text-white dark:text-[#0a0a0a]" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export CSV Button */}
          <button
            id="inventory-export-btn"
            type="button"
            onClick={handleExport}
            className="h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 bg-[#1e3fc8] hover:bg-[#1935a8] text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1e3fc8]"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* ── 2. Standardized KPI Cards ─────────────────────────────────── */}
      <section
        aria-label="Inventory Metrics"
        style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
        className="titan-dash-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        {/* Total SKUs */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Total SKUs
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#0a0a0a] dark:text-[#fafaf9]">
                {isLoading ? '—' : formatNumber(totalSKUs)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 text-[#1e3fc8] dark:text-[#60a5fa] border border-[#bfdbfe] dark:border-[#1e3fc8]/40 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            Monitored in catalog
          </p>
        </div>

        {/* Healthy Stock */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Healthy Stock
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-emerald-700 dark:text-emerald-400">
                {isLoading ? '—' : `${healthyStockPercent}%`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#dcfce7] dark:bg-[#14532d]/40 text-[#166534] dark:text-[#4ade80] border border-[#bbf7d0] dark:border-[#166534]/60 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            {healthyStockCount} of {totalSKUs} SKUs with HEALTHY status
          </p>
        </div>

        {/* Reorder Needed */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Reorder Needed
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-amber-700 dark:text-amber-400">
                {isLoading ? '—' : String(reorderNeededCount)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#fffbeb] dark:bg-amber-950/40 text-[#92400e] dark:text-amber-300 border border-[#fde68a] dark:border-amber-800/50 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            SKUs below reorder threshold (stock &lt; ROP)
          </p>
        </div>

        {/* Critical Items */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Critical Items
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-rose-700 dark:text-rose-400">
                {isLoading ? '—' : String(criticalItemsCount)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#fee2e2] dark:bg-[#7f1d1d]/40 text-[#991b1b] dark:text-[#fca5a5] border border-[#fecaca] dark:border-[#991b1b]/60 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            Immediate risk (CRITICAL status)
          </p>
        </div>
      </section>

      {/* ── 3. Data Integrity & Definition Notice ──────────────────────── */}
      <div className="rounded-[12px] border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] p-3.5 sm:p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa] mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="text-xs leading-relaxed text-[#52525b] dark:text-[#a1a1aa]">
          <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
            Upstream Inventory Telemetry Notice
          </p>
          <p className="mt-0.5">
            SKUs without warehouse count records carry initial catalog baseline values (<span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">Current Stock: 0</span>, <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">Safety Stock: 50</span>, <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">ROP: 100</span>, <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">Status: HEALTHY</span>).
            Threshold calculations compute dynamic replenishment (<span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">Rec. Qty: 150</span>) while preserving the returned status and health score definitions.
          </p>
        </div>
      </div>

      {/* ── 4. Risk-First Inventory Health Score Visual ────────────────── */}
      <section
        aria-label="Inventory Health Scores"
        style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
        className="titan-dash-reveal rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                Inventory Health Scores
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fafaf9] text-[#52525b] border border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]">
                Risk-sorted ({showAllChartItems ? healthChartData.length : `Top ${Math.min(10, healthChartData.length)} of ${filteredItems.length}`})
              </span>
            </div>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Lowest health scores presented first to highlight stockout and reorder vulnerabilities
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" aria-hidden="true" />
              <span>Healthy (&ge;80)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" aria-hidden="true" />
              <span>Warning (60–79)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" aria-hidden="true" />
              <span>Critical (&lt;60)</span>
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {healthChartData.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-[14px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-center text-[#1e3fc8] dark:text-[#60a5fa] mb-3">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Inventory Items Found</p>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 max-w-sm">
                {searchTerm || statusFilter !== 'all'
                  ? 'No items match the active search or status criteria. Try clearing filters.'
                  : 'Connect a sales dataset to populate inventory health calculations.'}
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(240, healthChartData.length * 30)}>
                <BarChart
                  data={healthChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 30, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--ds-hairline)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--ds-hairline)' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    interval={0}
                    tick={{ fill: 'var(--ds-text-primary, #0a0a0a)', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: 'var(--ds-hairline)' }}
                    tickLine={false}
                  />
                  <Tooltip
                    allowEscapeViewBox={{ x: false, y: false }}
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      const color = getHealthColor(item.score);
                      const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.healthy;
                      return (
                        <div className="titan-chart-tooltip rounded-[12px] p-3.5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs z-50 min-w-[230px]">
                          <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] text-xs leading-snug">
                            {item.fullName}
                          </p>
                          <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-mono mt-0.5 mb-2 pb-1.5 border-b border-[#e4e4e7] dark:border-[#27272a]">
                            {item.sku} · {item.category}
                          </p>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">Health Score:</span>
                              <span className="font-bold font-mono text-sm tabular-nums" style={{ color }}>
                                {item.score} / 100
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">Stock Status:</span>
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', sc.badge)}>
                                {sc.label}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-[#e4e4e7] dark:border-[#27272a]">
                              <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">Current Stock:</span>
                              <span className="font-bold font-mono text-[#0a0a0a] dark:text-[#fafaf9] tabular-nums">
                                {formatNumber(item.current_stock)} units
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">Reorder Point:</span>
                              <span className="font-mono text-[#52525b] dark:text-[#a1a1aa] tabular-nums">
                                {formatNumber(item.reorder_point)}
                              </span>
                            </div>
                            {item.recommended_qty > 0 && (
                              <div className="flex items-center justify-between pt-1 text-amber-700 dark:text-amber-400 font-medium">
                                <span>Rec. Order Qty:</span>
                                <span className="font-bold font-mono tabular-nums">
                                  +{formatNumber(item.recommended_qty)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="score"
                    name="Health Score"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                    isAnimationActive={!prefersReducedMotion}
                  >
                    {healthChartData.map((entry, i) => (
                      <Cell key={i} fill={getHealthColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {filteredItems.length > 10 && (
                <div className="mt-3 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllChartItems((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3fc8] dark:text-[#60a5fa] hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] rounded-md px-2 py-1"
                  >
                    {showAllChartItems ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Show top 10 riskiest items</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Show all {filteredItems.length} items in chart</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── 5. Inventory Items Table Workspace ────────────────────────── */}
      <section
        aria-label="Inventory Table Workspace"
        style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
        className="titan-dash-reveal rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
      >
        {/* Search & Header */}
        <div className="p-4 sm:p-5 border-b border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafaf9] dark:bg-[#18181b]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                Inventory Items
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-white dark:bg-[#111113] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a]">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Live stock levels, safety stock buffers &amp; automated replenishment quantities
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b] dark:text-[#a1a1aa]" aria-hidden="true" />
            <input
              id="inventory-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product, SKU, category..."
              className="w-full pl-8 pr-4 py-1.5 rounded-[10px] text-xs bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#52525b] dark:placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20 transition-colors"
            />
          </div>
        </div>

        {/* Desktop Table (md+) with Sticky Product Name & SKU */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b]">
                {TABLE_COLUMNS.map((col, idx) => (
                  <th
                    key={col.label}
                    className={cn(
                      'px-4 py-3 text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] whitespace-nowrap select-none',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.minWidth,
                      // Sticky product column
                      idx === 0 && 'sticky left-0 z-10 bg-[#fafaf9] dark:bg-[#18181b] border-r border-[#e4e4e7] dark:border-[#27272a]'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1.5 select-none',
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start',
                        col.key && 'cursor-pointer hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] transition-colors'
                      )}
                      onClick={() => col.key && handleSort(col.key as SortKey)}
                    >
                      <span>{col.label}</span>
                      {col.key && (
                        <span className="text-[#52525b] dark:text-[#a1a1aa]">
                          {sortIndicator(col.key as SortKey) || <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">
                      No inventory items found
                    </p>
                    <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1">
                      {searchTerm && `No results matching "${searchTerm}". `}
                      {statusFilter !== 'all' && `Status filter "${STATUS_CONFIG[statusFilter]?.label || statusFilter}" active.`}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.healthy;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#fafaf9] dark:hover:bg-[#18181b]/70 transition-colors"
                    >
                      {/* Product Name & SKU (Sticky left column) */}
                      <td className="px-4 py-3 sticky left-0 z-10 bg-white dark:bg-[#111113] group-hover:bg-[#fafaf9] dark:group-hover:bg-[#18181b] border-r border-[#e4e4e7] dark:border-[#27272a] min-w-[210px]">
                        <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] font-mono mt-0.5">
                          {item.sku}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-xs text-[#52525b] dark:text-[#a1a1aa] min-w-[120px] whitespace-nowrap">
                        {item.category}
                      </td>

                      {/* Current Stock */}
                      <td className="px-4 py-3 text-xs font-mono tabular-nums text-right min-w-[110px] whitespace-nowrap">
                        {item.current_stock === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                            0 units
                          </span>
                        ) : (
                          <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                            {formatNumber(item.current_stock)}
                          </span>
                        )}
                      </td>

                      {/* Safety Stock */}
                      <td className="px-4 py-3 text-xs text-[#52525b] dark:text-[#a1a1aa] font-mono tabular-nums text-right min-w-[105px] whitespace-nowrap">
                        {formatNumber(item.safety_stock)}
                      </td>

                      {/* Reorder Point */}
                      <td className="px-4 py-3 text-xs text-[#52525b] dark:text-[#a1a1aa] font-mono tabular-nums text-right min-w-[105px] whitespace-nowrap">
                        {formatNumber(item.reorder_point)}
                      </td>

                      {/* Rec. Order Qty */}
                      <td className="px-4 py-3 text-xs font-mono tabular-nums text-right min-w-[120px] whitespace-nowrap">
                        {item.recommended_qty > 0 ? (
                          <span className="text-amber-700 dark:text-amber-300 font-bold bg-[#fffbeb] dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-[#fde68a] dark:border-amber-800/50">
                            +{formatNumber(item.recommended_qty)}
                          </span>
                        ) : (
                          <span className="text-[#52525b] dark:text-[#a1a1aa]">—</span>
                        )}
                      </td>

                      {/* Lead Time */}
                      <td className="px-4 py-3 text-xs text-[#52525b] dark:text-[#a1a1aa] font-mono tabular-nums text-right min-w-[95px] whitespace-nowrap">
                        {item.lead_time}w
                      </td>

                      {/* Stock Status */}
                      <td className="px-4 py-3 text-center min-w-[120px] whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', sc.badge)}>
                          {sc.label}
                        </span>
                      </td>

                      {/* Health Score */}
                      <td className="px-4 py-3 min-w-[125px] whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-2 bg-[#f1f1f3] dark:bg-[#18181b] rounded-full overflow-hidden border border-[#e4e4e7] dark:border-[#27272a]">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${item.health_score}%`, backgroundColor: getHealthColor(item.health_score) }}
                            />
                          </div>
                          <span className="text-xs font-bold font-mono tabular-nums w-7 text-right" style={{ color: getHealthColor(item.health_score) }}>
                            {item.health_score}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Tablet & Mobile Stacked Record View (< md) — zero horizontal scroll */}
        <div className="md:hidden divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">No inventory items found</p>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1">Try clearing your search or status filter.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.healthy;
              return (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] font-mono mt-0.5">
                        {item.sku} · {item.category}
                      </p>
                    </div>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0', sc.badge)}>
                      {sc.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                        Stock / ROP
                      </p>
                      <p className="font-mono tabular-nums font-semibold mt-0.5 text-[#0a0a0a] dark:text-[#fafaf9]">
                        {formatNumber(item.current_stock)} / {formatNumber(item.reorder_point)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                        Rec. Order
                      </p>
                      <p className="font-mono tabular-nums font-bold mt-0.5 text-amber-700 dark:text-amber-400">
                        {item.recommended_qty > 0 ? `+${formatNumber(item.recommended_qty)}` : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                        Health Score
                      </p>
                      <p className="font-mono tabular-nums font-bold mt-0.5" style={{ color: getHealthColor(item.health_score) }}>
                        {item.health_score} / 100
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
