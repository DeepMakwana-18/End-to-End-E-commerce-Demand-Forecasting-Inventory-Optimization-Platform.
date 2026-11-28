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
  Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, X, CheckCircle2,
  Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi, systemApi } from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import type { InventoryItem } from '@/types';
import '@/styles/titan-dashboard.css';

const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  healthy: {
    label: 'HEALTHY',
    color: 'text-ds-green-text',
    badge: 'bg-ds-green-surface text-ds-green-text border-ds-green/25',
  },
  low: {
    label: 'LOW STOCK',
    color: 'text-ds-orange-text',
    badge: 'bg-ds-orange-surface text-ds-orange-text border-ds-amber/25',
  },
  critical: {
    label: 'CRITICAL',
    color: 'text-ds-red-text',
    badge: 'bg-ds-red-surface text-ds-red-text border-ds-red/25',
  },
  overstock: {
    label: 'OVERSTOCK',
    color: 'text-ds-blue-on-surface',
    badge: 'bg-ds-blue-surface text-ds-blue-on-surface border-ds-blue/25',
  },
};

const getHealthColor = (score: number) => {
  if (score >= 80) return 'var(--ds-green)';
  if (score >= 60) return 'var(--ds-amber)';
  return 'var(--ds-red)';
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

  const { data: inventoryData, isLoading, isError, refetch } = useQuery({
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
  const [showHealthChart, setShowHealthChart] = useState(false);
  const [showAllChartItems, setShowAllChartItems] = useState(false);
  const [showBaselineDetails, setShowBaselineDetails] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  // Close filter popover on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && showFilters) {
        setShowFilters(false);
        requestAnimationFrame(() => filterTriggerRef.current?.focus());
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFilters]);

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

  return (
    <div className="space-y-5 sm:space-y-6 pb-4">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-[12px] bg-ds-surface border border-ds-hairline text-ds-text-primary text-xs font-semibold flex items-center gap-2 shadow-ds-float-2"
          >
            <CheckCircle2 className="w-4 h-4 text-ds-green flex-shrink-0" aria-hidden="true" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. Compact Page Header ─────────────────────────────────── */}
      <PageHeader
        title="Inventory Optimization"
        description="Safety stock buffers, reorder thresholds & dynamic replenishment telemetry"
        actions={
          <>
            {/* Filter Popover */}
            <div className="relative" ref={filterRef}>
              <button
                ref={filterTriggerRef}
                id="inventory-filter-toggle"
                type="button"
                aria-expanded={showFilters}
                aria-haspopup="dialog"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2',
                  showFilters || statusFilter !== 'all'
                    ? 'bg-ds-sidebar-active text-ds-sidebar-active-text border-ds-sidebar-active-border'
                    : 'bg-ds-surface text-ds-text-primary border-ds-hairline hover:bg-ds-surface-sunken'
                )}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{statusFilter === 'all' ? 'Filter' : STATUS_CONFIG[statusFilter]?.label || statusFilter}</span>
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    role="dialog"
                    aria-label="Filter by stock status"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.14 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-[12px] p-2 z-50 space-y-1 shadow-ds-float-2 bg-ds-surface border border-ds-hairline"
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-ds-hairline">
                      <span className="text-xs font-semibold text-ds-text-primary">Filter by Stock Status</span>
                      <button
                        type="button"
                        aria-label="Close filter menu"
                        onClick={() => {
                          setShowFilters(false);
                          requestAnimationFrame(() => filterTriggerRef.current?.focus());
                        }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-sunken transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    {['all', 'healthy', 'low', 'critical', 'overstock'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setStatusFilter(s);
                          setShowFilters(false);
                          requestAnimationFrame(() => filterTriggerRef.current?.focus());
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-[8px] text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer',
                          statusFilter === s
                            ? 'bg-ds-sidebar-active text-ds-sidebar-active-text'
                            : 'text-ds-text-secondary hover:bg-ds-surface-sunken hover:text-ds-text-primary'
                        )}
                      >
                        <span>{s === 'all' ? 'All Statuses' : STATUS_CONFIG[s]?.label || s}</span>
                        {statusFilter === s && <CheckCircle2 className="w-3.5 h-3.5 text-ds-blue" aria-hidden="true" />}
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
              className="h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 bg-ds-blue hover:bg-ds-blue-strong text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </>
        }
      />

      {/* ── 2. Standardized Metric Cards ────────────────────────────── */}
      <section
        aria-label="Inventory Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {/* Total SKUs */}
        <div className="rounded-[12px] p-4 bg-ds-surface border border-ds-hairline flex flex-col justify-start">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ds-text-secondary leading-snug mb-1.5">
                Total SKUs
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 my-0.5 rounded-lg" />
              ) : (
                <p className="text-[22px] sm:text-[26px] font-semibold font-sans tabular-nums tracking-[-0.02em] leading-tight text-ds-text-primary">
                  {formatNumber(totalSKUs)}
                </p>
              )}
            </div>
            <div className="w-9 h-9 rounded-[10px] bg-ds-blue-surface text-ds-blue-on-surface border border-ds-blue/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-ds-text-secondary font-medium mt-2">
            Monitored in catalog
          </p>
        </div>

        {/* Healthy Stock */}
        <div className="rounded-[12px] p-4 bg-ds-surface border border-ds-hairline flex flex-col justify-start">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ds-text-secondary leading-snug mb-1.5">
                Healthy Stock
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 my-0.5 rounded-lg" />
              ) : (
                <p className="text-[22px] sm:text-[26px] font-semibold font-sans tabular-nums tracking-[-0.02em] leading-tight text-ds-green-text">
                  {`${healthyStockPercent}%`}
                </p>
              )}
            </div>
            <div className="w-9 h-9 rounded-[10px] bg-ds-green-surface text-ds-green-text border border-ds-green/25 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-ds-text-secondary font-medium mt-2">
            {healthyStockCount} of {totalSKUs} SKUs healthy
          </p>
        </div>

        {/* Reorder Needed */}
        <div className="rounded-[12px] p-4 bg-ds-surface border border-ds-hairline flex flex-col justify-start">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ds-text-secondary leading-snug mb-1.5">
                Reorder Needed
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 my-0.5 rounded-lg" />
              ) : (
                <p className="text-[22px] sm:text-[26px] font-semibold font-sans tabular-nums tracking-[-0.02em] leading-tight text-ds-orange-text">
                  {String(reorderNeededCount)}
                </p>
              )}
            </div>
            <div className="w-9 h-9 rounded-[10px] bg-ds-orange-surface text-ds-orange-text border border-ds-amber/25 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-ds-text-secondary font-medium mt-2">
            SKUs below reorder threshold
          </p>
        </div>

        {/* Critical Items */}
        <div className="rounded-[12px] p-4 bg-ds-surface border border-ds-hairline flex flex-col justify-start">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ds-text-secondary leading-snug mb-1.5">
                Critical Items
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 my-0.5 rounded-lg" />
              ) : (
                <p className="text-[22px] sm:text-[26px] font-semibold font-sans tabular-nums tracking-[-0.02em] leading-tight text-ds-red-text">
                  {String(criticalItemsCount)}
                </p>
              )}
            </div>
            <div className="w-9 h-9 rounded-[10px] bg-ds-red-surface text-ds-red-text border border-ds-red/25 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-ds-text-secondary font-medium mt-2">
            Immediate risk (CRITICAL status)
          </p>
        </div>
      </section>

      {/* ── 3. Concise Table-Level Baseline Notice (Expandable) ────────── */}
      <div className="rounded-[12px] border border-ds-hairline bg-ds-surface px-3.5 py-2.5 sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-ds-text-secondary min-w-0">
            <Info className="w-4 h-4 text-ds-blue mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="leading-relaxed">
              Some items may use catalog defaults when warehouse counts are unavailable. Their health scores may not reflect measured stock.
            </p>
          </div>
          <button
            type="button"
            aria-expanded={showBaselineDetails}
            aria-label={showBaselineDetails ? 'Hide baseline telemetry details' : 'Show baseline telemetry details'}
            onClick={() => setShowBaselineDetails((v) => !v)}
            className="text-xs font-semibold text-ds-blue-text hover:underline whitespace-nowrap flex-shrink-0 cursor-pointer py-0.5 focus-visible:outline-2 focus-visible:outline-ds-blue rounded"
          >
            {showBaselineDetails ? 'Hide details' : 'Details'}
          </button>
        </div>
        {showBaselineDetails && (
          <p className="mt-2 pt-2 border-t border-ds-hairline text-xs text-ds-text-secondary leading-relaxed pl-6">
            Baseline defaults when warehouse counts are absent: <span className="font-mono font-semibold text-ds-text-primary">Current Stock: 0</span>, <span className="font-mono font-semibold text-ds-text-primary">Safety Stock: 50</span>, <span className="font-mono font-semibold text-ds-text-primary">ROP: 100</span>, <span className="font-mono font-semibold text-ds-text-primary">Status: HEALTHY</span>, and <span className="font-mono font-semibold text-ds-text-primary">Rec. Qty: 150</span>.
          </p>
        )}
      </div>

      {isError && (
        <div role="alert" className="rounded-[12px] border border-ds-red/30 bg-ds-red-surface p-4 flex items-center justify-between gap-4">
          <div className="text-xs text-ds-red-text">
            <p className="font-semibold">Unable to load inventory data</p>
            <p className="mt-0.5">Check your connection and try refreshing.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="h-9 px-3.5 rounded-[10px] text-xs font-semibold bg-ds-surface text-ds-text-primary border border-ds-hairline hover:bg-ds-surface-sunken transition-colors cursor-pointer flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 4. Collapsible Risk-First Inventory Health Score Visual ────── */}
      <section
        aria-label="Inventory Health Scores"
        className="rounded-[12px] border border-ds-hairline bg-ds-surface overflow-hidden"
      >
        <div className={cn(
          'flex flex-wrap items-center justify-between gap-2.5',
          showHealthChart ? 'p-4 sm:px-5 border-b border-ds-hairline' : 'px-4 py-3 sm:px-5'
        )}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-ds-text-primary tracking-tight">
                Inventory Health Scores
              </h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-ds-surface-sunken text-ds-text-secondary border border-ds-hairline tabular-nums">
                {showAllChartItems ? `${healthChartData.length} items` : `Top ${Math.min(10, healthChartData.length)} of ${filteredItems.length}`}
              </span>
            </div>
            {showHealthChart && (
              <p className="text-xs text-ds-text-secondary mt-0.5 font-medium">
                Lowest health scores presented first to highlight stockout and reorder vulnerabilities
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {showHealthChart && (
              <div className="flex items-center gap-3 text-xs font-medium text-ds-text-secondary flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-ds-green" aria-hidden="true" />
                  <span>Healthy (&ge;80)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-ds-amber" aria-hidden="true" />
                  <span>Warning (60–79)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-ds-red" aria-hidden="true" />
                  <span>Critical (&lt;60)</span>
                </span>
              </div>
            )}
            <button
              type="button"
              aria-expanded={showHealthChart}
              aria-controls="inventory-health-chart-panel"
              onClick={() => setShowHealthChart((v) => !v)}
              className="h-8 px-3 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1.5 bg-ds-surface-sunken text-ds-text-primary border border-ds-hairline hover:border-ds-border-strong transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue"
            >
              <span>{showHealthChart ? 'Hide chart' : 'Show chart'}</span>
              {showHealthChart ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {showHealthChart && (
          <div id="inventory-health-chart-panel" className="p-4 sm:p-5">
          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-7 w-full rounded-md" />
              ))}
            </div>
          ) : healthChartData.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-11 h-11 rounded-[12px] bg-ds-surface-sunken border border-ds-hairline flex items-center justify-center text-ds-blue mb-3">
                <Package className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-ds-text-primary">No Inventory Items Found</p>
              <p className="text-xs text-ds-text-secondary mt-1 max-w-sm">
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
                    isAnimationActive={false}
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
        )}
      </section>

      {/* ── 5. Inventory Items Table Workspace ────────────────────────── */}
      <section
        aria-label="Inventory Table Workspace"
        className="rounded-[12px] border border-ds-hairline bg-ds-surface overflow-hidden"
      >
        {/* Search & Header */}
        <div className="p-4 sm:p-5 border-b border-ds-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-ds-surface">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ds-text-primary">
                Inventory Items
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium font-mono bg-ds-surface-sunken text-ds-text-secondary border border-ds-hairline tabular-nums">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-ds-text-secondary mt-0.5 font-medium">
              Reported stock levels, safety stock buffers, and recommended replenishment quantities.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ds-text-secondary pointer-events-none" aria-hidden="true" />
            <input
              id="inventory-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product, SKU, category..."
              aria-label="Search product, SKU, or category"
              className="w-full h-9 pl-8 pr-8 rounded-[10px] text-xs bg-ds-surface-sunken border border-ds-hairline text-ds-text-primary placeholder:text-ds-text-secondary hover:border-ds-border-strong focus:outline-none focus:bg-ds-surface focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear table search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-ds-text-secondary hover:text-ds-text-primary"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Table (md+) with Sticky Product Name & SKU */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ds-hairline bg-ds-surface-sunken">
                {TABLE_COLUMNS.map((col, idx) => {
                  const isSorted = Boolean(col.key) && sortKey === col.key;
                  const ariaSort = col.key
                    ? (isSorted ? (sortAsc ? 'ascending' : 'descending') : 'none')
                    : undefined;
                  return (
                    <th
                      key={col.label}
                      scope="col"
                      aria-sort={ariaSort}
                      className={cn(
                        'px-4 py-2.5 text-[12px] font-semibold text-ds-text-secondary whitespace-nowrap select-none',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        col.minWidth,
                        idx === 0 && 'sticky left-0 z-10 bg-ds-surface-sunken border-r border-ds-hairline'
                      )}
                    >
                      {col.key ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key as SortKey)}
                          className={cn(
                            'inline-flex items-center gap-1.5 font-semibold text-ds-text-secondary hover:text-ds-text-primary transition-colors cursor-pointer rounded px-1 -mx-1 py-0.5 focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-1',
                            col.align === 'right' && 'flex-row-reverse',
                            isSorted && 'text-ds-text-primary'
                          )}
                        >
                          <span>{col.label}</span>
                          {isSorted ? (
                            sortAsc ? (
                              <ArrowUp className="w-3.5 h-3.5 text-ds-blue" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-ds-blue" aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-50" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        <span>{col.label}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-hairline">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    {TABLE_COLUMNS.map((col, cIdx) => (
                      <td key={col.label} className={cn('px-4 py-3', cIdx === 0 && 'sticky left-0 z-10 bg-ds-surface border-r border-ds-hairline')}>
                        <Skeleton className="h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-ds-text-primary">
                      No inventory items found
                    </p>
                    <p className="text-xs text-ds-text-secondary mt-1">
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
                      className="group hover:bg-ds-surface-sunken transition-colors"
                    >
                      {/* Product Name & SKU (Sticky left column) */}
                      <td className="px-4 py-2.5 sticky left-0 z-10 bg-ds-surface group-hover:bg-ds-surface-sunken transition-colors border-r border-ds-hairline min-w-[210px] max-w-[280px]">
                        <p className="text-xs font-semibold text-ds-text-primary leading-snug break-words" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[11px] text-ds-text-secondary font-mono mt-0.5">
                          {item.sku}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-2.5 text-xs text-ds-text-secondary min-w-[120px] whitespace-nowrap">
                        {item.category}
                      </td>

                      {/* Current Stock */}
                      <td className="px-4 py-2.5 text-xs font-mono tabular-nums text-right min-w-[110px] whitespace-nowrap">
                        {item.current_stock === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold text-ds-red-text bg-ds-red-surface border border-ds-red/25">
                            0 units
                          </span>
                        ) : (
                          <span className="font-semibold text-ds-text-primary">
                            {formatNumber(item.current_stock)}
                          </span>
                        )}
                      </td>

                      {/* Safety Stock */}
                      <td className="px-4 py-2.5 text-xs text-ds-text-secondary font-mono tabular-nums text-right min-w-[105px] whitespace-nowrap">
                        {formatNumber(item.safety_stock)}
                      </td>

                      {/* Reorder Point */}
                      <td className="px-4 py-2.5 text-xs text-ds-text-secondary font-mono tabular-nums text-right min-w-[105px] whitespace-nowrap">
                        {formatNumber(item.reorder_point)}
                      </td>

                      {/* Rec. Order Qty */}
                      <td className="px-4 py-2.5 text-xs font-mono tabular-nums text-right min-w-[120px] whitespace-nowrap">
                        {item.recommended_qty > 0 ? (
                          <span className="text-ds-orange-text font-semibold bg-ds-orange-surface px-2 py-0.5 rounded-md border border-ds-amber/25">
                            +{formatNumber(item.recommended_qty)}
                          </span>
                        ) : (
                          <span className="text-ds-text-secondary">—</span>
                        )}
                      </td>

                      {/* Lead Time */}
                      <td className="px-4 py-2.5 text-xs text-ds-text-secondary font-mono tabular-nums text-right min-w-[95px] whitespace-nowrap">
                        {item.lead_time}w
                      </td>

                      {/* Stock Status */}
                      <td className="px-4 py-2.5 text-center min-w-[120px] whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', sc.badge)}>
                          {sc.label}
                        </span>
                      </td>

                      {/* Health Score */}
                      <td className="px-4 py-2.5 min-w-[125px] whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-2 bg-ds-surface-sunken rounded-full overflow-hidden border border-ds-hairline">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${item.health_score}%`, backgroundColor: getHealthColor(item.health_score) }}
                            />
                          </div>
                          <span className="text-xs font-semibold font-mono tabular-nums w-7 text-right" style={{ color: getHealthColor(item.health_score) }}>
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
        <div className="md:hidden divide-y divide-ds-hairline">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-ds-text-primary">No inventory items found</p>
              <p className="text-xs text-ds-text-secondary mt-1">Try clearing your search or status filter.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.healthy;
              return (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ds-text-primary leading-snug">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-ds-text-secondary font-mono mt-0.5">
                        {item.sku} · {item.category}
                      </p>
                    </div>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0', sc.badge)}>
                      {sc.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-[11px] font-medium text-ds-text-secondary">
                        Stock / ROP
                      </p>
                      <p className="font-mono tabular-nums font-semibold mt-0.5 text-ds-text-primary">
                        {formatNumber(item.current_stock)} / {formatNumber(item.reorder_point)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-ds-text-secondary">
                        Rec. Order
                      </p>
                      <p className="font-mono tabular-nums font-semibold mt-0.5 text-ds-orange-text">
                        {item.recommended_qty > 0 ? `+${formatNumber(item.recommended_qty)}` : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-ds-text-secondary">
                        Health Score
                      </p>
                      <p className="font-mono tabular-nums font-semibold mt-0.5" style={{ color: getHealthColor(item.health_score) }}>
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
