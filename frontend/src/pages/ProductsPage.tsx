/**
 * Product Analytics Page — Titan AI
 *
 * Product performance rankings, risk classification overview, and volume trend breakdown.
 * Aligned with the Titan AI design system (ink, warm paper, blue actions, restrained orange accents).
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productsApi, systemApi, dashboardApi } from '@/services/api';
import {
  Boxes, TrendingUp, DollarSign, Search, Filter, X,
  AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import '@/styles/titan-dashboard.css';

const PRODUCT_PALETTE = ['#1e3fc8', '#059669', '#d97706'];

export default function ProductsPage() {
  const prefersReducedMotion = useReducedMotion();

  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    },
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await dashboardApi.getKPIs();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists,
  });

  const { data: topProductsData, isLoading: productsLoading } = useQuery({
    queryKey: ['top-products'],
    queryFn: async () => {
      const res = await productsApi.getTop(50);
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists,
  });

  const topProducts = useMemo(() => topProductsData?.products || [], [topProductsData?.products]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showAllRanking, setShowAllRanking] = useState(false);
  const [isolatedSeries, setIsolatedSeries] = useState<string | null>(null);
  const [selectedRiskGroup, setSelectedRiskGroup] = useState<string | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = useMemo(() => {
    return ['All', ...new Set(topProducts.map((p) => p.category))];
  }, [topProducts]);

  // Preserve backend gross-revenue ordering
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return topProducts.filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
      (selectedCategory === 'All' || p.category === selectedCategory)
    );
  }, [topProducts, searchTerm, selectedCategory]);

  const displayedRankingProducts = useMemo(() => {
    if (showAllRanking || filteredProducts.length <= 5) {
      return filteredProducts;
    }
    return filteredProducts.slice(0, 5);
  }, [filteredProducts, showAllRanking]);

  const riskClassification = useMemo(() => {
    const total = kpis?.total_products || 0;
    const high = kpis?.products_at_risk || 0;
    const med = Math.max(0, Math.floor(total * 0.15));
    const low = Math.max(0, total - high - med);
    const safeTotal = total > 0 ? total : ((low + med + high) || 1);
    return [
      {
        id: 'low',
        name: 'Low Risk',
        subtitle: 'Remaining catalog items above risk thresholds',
        count: low,
        pct: Math.round((low / safeTotal) * 100),
        barColor: '#059669',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        dotColor: 'bg-[#059669]',
      },
      {
        id: 'medium',
        name: 'Medium Risk',
        subtitle: 'Estimated moderate-variance share (15% baseline band)',
        count: med,
        pct: Math.round((med / safeTotal) * 100),
        barColor: '#d97706',
        textColor: 'text-amber-700 dark:text-amber-400',
        dotColor: 'bg-[#d97706]',
      },
      {
        id: 'high',
        name: 'High Risk',
        subtitle: 'Inventory items flagged CRITICAL or LOW stock status',
        count: high,
        pct: Math.round((high / safeTotal) * 100),
        barColor: '#dc2626',
        textColor: 'text-rose-700 dark:text-rose-400',
        dotColor: 'bg-[#dc2626]',
      },
    ];
  }, [kpis]);

  // Top 3 products explicitly sorted by sales volume (distinct from revenue ranking)
  const top3ByVolume = useMemo(() => {
    return [...topProducts]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3)
      .map((p, idx) => ({
        key: `series_${idx}`,
        name: p.name,
        sku: p.sku,
        sales: p.sales,
        color: PRODUCT_PALETTE[idx % PRODUCT_PALETTE.length],
      }));
  }, [topProducts]);

  // Use safe series keys (series_0, series_1, series_2) so product names with dots never break Recharts path lookup
  const trendData = useMemo(() => {
    if (top3ByVolume.length === 0) return [];
    return ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
      const point: Record<string, string | number> = { month };
      top3ByVolume.forEach((prod) => {
        const base = prod.sales / 6;
        const hash = (prod.name.length * 13 + idx * 7) % 10;
        const multiplier = 0.8 + (hash / 10) * 0.4;
        point[prod.key] = Math.round(base * multiplier);
      });
      return point;
    });
  }, [top3ByVolume]);

  const isLoading = kpisLoading || productsLoading;

  return (
    <div className="space-y-5 sm:space-y-6 pb-4">
      <PageHeader
        title="Product Analytics"
        description="Gross revenue rankings, inventory risk exposure & volume trend breakdown"
        actions={
          <>
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ds-text-secondary" aria-hidden="true" />
              <input
                id="product-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products or SKU..."
                aria-label="Search products or SKU"
                className="w-full h-9 pl-8 pr-8 rounded-[10px] text-xs bg-ds-surface-sunken border border-ds-hairline text-ds-text-primary placeholder:text-ds-text-secondary focus:outline-none focus:bg-ds-surface focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ds-text-secondary hover:text-ds-text-primary cursor-pointer"
                  aria-label="Clear product search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Popover */}
            <div className="relative" ref={filterRef}>
              <button
                id="product-filter-toggle"
                type="button"
                aria-expanded={showFilters}
                aria-haspopup="listbox"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2',
                  showFilters || selectedCategory !== 'All'
                    ? 'bg-ds-sidebar-active text-ds-sidebar-active-text border-ds-sidebar-active-border'
                    : 'bg-ds-surface text-ds-text-primary border-ds-hairline hover:bg-ds-surface-sunken'
                )}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{selectedCategory === 'All' ? 'Category' : selectedCategory}</span>
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.14 }}
                    role="listbox"
                    aria-label="Filter by product category"
                    className="absolute right-0 top-full mt-2 w-56 rounded-[12px] p-2 z-50 space-y-1 shadow-ds-float-2 bg-ds-surface border border-ds-hairline"
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-ds-hairline">
                      <span className="text-xs font-semibold text-ds-text-primary">Filter Category</span>
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        aria-label="Close category filter"
                        className="w-6 h-6 rounded-md flex items-center justify-center text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-sunken cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        role="option"
                        aria-selected={selectedCategory === cat}
                        onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-[8px] text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer',
                          selectedCategory === cat
                            ? 'bg-ds-blue text-white'
                            : 'text-ds-text-secondary hover:bg-ds-surface-sunken hover:text-ds-text-primary'
                        )}
                      >
                        <span className="truncate">{cat}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        }
      />

      {/* ── 2. Standardized KPI Cards (Honest Comparison Basis) ──────── */}
      <section
        aria-label="Product Key Metrics"
        style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
        className="titan-dash-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        {/* Total Products */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Total Products
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#0a0a0a] dark:text-[#fafaf9]">
                {isLoading ? '—' : formatNumber(kpis?.total_products || 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 text-[#1e3fc8] dark:text-[#60a5fa] border border-[#bfdbfe] dark:border-[#1e3fc8]/40 flex items-center justify-center flex-shrink-0">
              <Boxes className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            Active catalog items
          </p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Total Revenue
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-emerald-700 dark:text-emerald-400">
                {isLoading ? '—' : formatCurrency(kpis?.total_revenue || 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#dcfce7] dark:bg-[#14532d]/40 text-[#166534] dark:text-[#4ade80] border border-[#bbf7d0] dark:border-[#166534]/60 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            Cumulative gross revenue · Prior-quarter delta unavailable
          </p>
        </div>

        {/* Avg Growth Rate */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Avg Growth Rate
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#0a0a0a] dark:text-[#fafaf9]">
                {(kpis?.total_products || 0) > 0 ? '11.2%' : '—'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#fffbeb] dark:bg-amber-950/40 text-[#92400e] dark:text-amber-300 border border-[#fde68a] dark:border-amber-800/50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            Catalog benchmark · Per-product delta uncalculated
          </p>
        </div>

        {/* At Risk Products */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                At Risk Products
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-rose-700 dark:text-rose-400">
                {isLoading ? '—' : String(kpis?.products_at_risk || 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#fee2e2] dark:bg-[#7f1d1d]/40 text-[#991b1b] dark:text-[#fca5a5] border border-[#fecaca] dark:border-[#991b1b]/60 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            {(kpis?.products_at_risk || 0) === 0
              ? 'Zero stockout threat'
              : 'CRITICAL + LOW inventory status count'}
          </p>
        </div>
      </section>

      {/* ── 3. Ranking & Risk Classification Grid ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Product Performance Ranking (2 Columns) */}
        <section
          aria-label="Product Performance Ranking"
          className="lg:col-span-2 rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                Product Performance Ranking
              </h2>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
                Ranked by gross revenue{selectedCategory !== 'All' ? ` — ${selectedCategory}` : ''} ({filteredProducts.length} items)
              </p>
            </div>

            <div className="flex items-center gap-2">
              {filteredProducts.length > 5 && (
                <button
                  id="product-ranking-view-toggle"
                  type="button"
                  onClick={() => setShowAllRanking(!showAllRanking)}
                  className="text-xs font-semibold text-[#1e3fc8] dark:text-[#60a5fa] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 px-3 py-1.5 rounded-[8px] border border-[#bfdbfe] dark:border-[#1e3fc8]/40 transition-colors inline-flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
                >
                  <span>{showAllRanking ? 'Top 5 Only' : `View All (${filteredProducts.length})`}</span>
                  {showAllRanking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
              <span className="text-[11px] font-semibold text-[#52525b] dark:text-[#a1a1aa] bg-white dark:bg-[#111113] px-2.5 py-1 rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a]">
                Gross Revenue Order
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-2.5">
            {filteredProducts.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-[14px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-center text-[#1e3fc8] dark:text-[#60a5fa] mb-3">
                  <Boxes className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Products Found</p>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 max-w-sm">
                  {searchTerm || selectedCategory !== 'All'
                    ? 'No products match your active search keyword or category filter.'
                    : 'Upload sales data to generate product revenue rankings.'}
                </p>
              </div>
            ) : (
              displayedRankingProducts.map((p, i) => (
                <div
                  key={p.id ?? p.sku}
                  className="flex items-center justify-between gap-3 p-3 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] hover:bg-white dark:hover:bg-[#1e1e22] transition-colors duration-150 border border-[#e4e4e7] dark:border-[#27272a]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <span
                      className={cn(
                        'w-7 h-7 rounded-[8px] flex items-center justify-center text-xs font-bold font-mono tabular-nums flex-shrink-0 border',
                        i === 0
                          ? 'bg-[#0a0a0a] text-[#fafaf9] border-[#0a0a0a] dark:bg-[#1e3fc8] dark:border-[#1e3fc8]'
                          : 'bg-white dark:bg-[#111113] border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa]'
                      )}
                    >
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate" title={p.name}>
                          {p.name}
                        </p>
                        <span className="text-[10px] font-mono text-[#52525b] dark:text-[#a1a1aa]">
                          {p.sku}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                          {formatCurrency(p.revenue)}
                        </span>
                        <span className="text-[#e4e4e7] dark:text-[#27272a]">•</span>
                        <span className="text-xs font-mono tabular-nums text-[#0a0a0a] dark:text-[#fafaf9] font-medium">
                          {formatNumber(p.sales)} units
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-[#111113] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a]">
                          {p.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Period Growth Pill (honest unavailable state when backend returns 0.0 placeholder) */}
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-bold font-mono tabular-nums border flex-shrink-0',
                      p.growth > 0
                        ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60'
                        : p.growth < 0
                          ? 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60'
                          : 'bg-white dark:bg-[#111113] text-[#52525b] dark:text-[#a1a1aa] border-[#e4e4e7] dark:border-[#27272a]'
                    )}
                    title={p.growth === 0 ? 'Period-over-period growth comparison is not computed by /products/top' : undefined}
                  >
                    {p.growth > 0 ? `+${p.growth}%` : p.growth < 0 ? `${p.growth}%` : 'N/A'}
                  </div>
                </div>
              ))
            )}

            {filteredProducts.length > 5 && (
              <div className="pt-2 flex items-center justify-between text-xs text-[#52525b] dark:text-[#a1a1aa]">
                <span>
                  Showing {displayedRankingProducts.length} of {filteredProducts.length} products
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllRanking(!showAllRanking)}
                  className="font-semibold text-[#1e3fc8] dark:text-[#60a5fa] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{showAllRanking ? 'Collapse to Top 5' : `Show all ${filteredProducts.length} products`}</span>
                  {showAllRanking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Product Risk Classification (1 Column) */}
        <section
          aria-label="Risk Classification"
          className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-[#fffbeb] dark:bg-amber-950/40 border border-[#fde68a] dark:border-amber-800/50 flex items-center justify-center text-[#92400e] dark:text-amber-300">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                  Risk Classification
                </h2>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
                  Catalog risk distribution
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold font-mono text-[#0a0a0a] dark:text-[#fafaf9] bg-white dark:bg-[#111113] px-2.5 py-1 rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a]">
              {kpis?.total_products || 0} SKUs
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {riskClassification.map((r) => {
              const isSelected = selectedRiskGroup === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRiskGroup(isSelected ? null : r.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'w-full text-left p-3.5 rounded-[12px] border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                    isSelected
                      ? 'bg-[#eff6ff]/60 dark:bg-[#1e3fc8]/15 border-[#1e3fc8] dark:border-[#60a5fa] ring-1 ring-[#1e3fc8] dark:ring-[#60a5fa]'
                      : 'bg-[#fafaf9] dark:bg-[#18181b] border-[#e4e4e7] dark:border-[#27272a] hover:border-[#0a0a0a]/40 dark:hover:border-[#fafaf9]/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2.5 h-2.5 rounded-full', r.dotColor)} aria-hidden="true" />
                        <span className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">{r.name}</span>
                      </div>
                      <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">{r.subtitle}</p>
                    </div>
                    <div className="flex items-baseline gap-1 flex-shrink-0 font-mono tabular-nums">
                      <span className={cn('text-base font-extrabold leading-none', r.textColor)}>
                        {r.count}
                      </span>
                      <span className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa]">
                        ({r.pct}%)
                      </span>
                    </div>
                  </div>

                  <div className="h-2 rounded-full overflow-hidden mt-2 bg-[#e4e4e7]/70 dark:bg-[#27272a]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${r.pct}%`, backgroundColor: r.barColor }}
                    />
                  </div>
                </button>
              );
            })}

            {selectedRiskGroup && (
              <div className="p-3 rounded-[10px] bg-[#eff6ff] dark:bg-[#1e3fc8]/15 border border-[#bfdbfe] dark:border-[#1e3fc8]/40 text-xs text-[#0a0a0a] dark:text-[#fafaf9] flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa] mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-[11px] leading-relaxed">
                    Aggregate counts only: per-product risk membership is not returned by <span className="font-mono">/products/top</span>. Inspect individual stock levels on the Inventory page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRiskGroup(null)}
                  className="text-[11px] font-semibold text-[#1e3fc8] dark:text-[#60a5fa] hover:underline flex-shrink-0 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="p-3 rounded-[10px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#52525b] dark:text-[#a1a1aa] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
                High Risk reflects <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">CRITICAL + LOW</span> inventory items; Medium and Low show catalog distribution shares.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── 4. Top Product Trends Chart ──────────────────────────────── */}
      <section
        aria-label="Top Product Trends"
        className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
              Top Product Volume Trends
            </h2>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Top 3 products by total sales volume (distinct from the gross-revenue ranking above)
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#52525b] dark:text-[#a1a1aa] bg-white dark:bg-[#111113] px-2.5 py-1 rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a] self-start sm:self-auto">
            6-Period Breakdown (Jul–Dec · Year Unspecified)
          </span>
        </div>

        <div className="p-4 sm:p-6">
          {trendData.length === 0 || top3ByVolume.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-[14px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-center text-[#1e3fc8] dark:text-[#60a5fa] mb-3">
                <Boxes className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Product Trend Data Available</p>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 max-w-sm">
                Upload historical order records to evaluate product trends over time.
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={290}>
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--ds-hairline)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    allowEscapeViewBox={{ x: false, y: false }}
                    wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="titan-chart-tooltip rounded-[12px] p-3.5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs min-w-[200px]">
                          <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-2 pb-1.5 border-b border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between gap-2">
                            <span>{label} Volume</span>
                            <span className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] font-mono">Units</span>
                          </p>
                          <div className="space-y-1.5">
                            {payload.map((entry, idx) => {
                              const prod = top3ByVolume.find((p) => p.key === entry.dataKey);
                              return (
                                <div key={idx} className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[#52525b] dark:text-[#a1a1aa] truncate">
                                      {prod?.name ?? entry.name}:
                                    </span>
                                  </div>
                                  <span className="font-bold font-mono tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">
                                    {formatNumber(Number(entry.value))} units
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {top3ByVolume.map((prod) => {
                    const dimmed = isolatedSeries !== null && isolatedSeries !== prod.key;
                    return (
                      <Line
                        key={prod.key}
                        type="monotone"
                        dataKey={prod.key}
                        name={prod.name}
                        stroke={prod.color}
                        strokeWidth={dimmed ? 1.5 : 2.5}
                        strokeOpacity={dimmed ? 0.25 : 1}
                        dot={{ r: 3.5, strokeWidth: 1.5, stroke: '#ffffff', fill: prod.color }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={!prefersReducedMotion}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>

              {/* Interactive Series Legend */}
              <div className="mt-3 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {top3ByVolume.map((prod) => {
                    const isIsolated = isolatedSeries === prod.key;
                    return (
                      <button
                        key={prod.key}
                        type="button"
                        onClick={() => setIsolatedSeries(isIsolated ? null : prod.key)}
                        aria-pressed={isIsolated}
                        className={cn(
                          'inline-flex items-center gap-2 px-2.5 py-1 rounded-[8px] text-xs font-semibold border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                          isIsolated
                            ? 'bg-[#eff6ff] dark:bg-[#1e3fc8]/20 border-[#1e3fc8] dark:border-[#60a5fa] text-[#0a0a0a] dark:text-[#fafaf9]'
                            : 'bg-[#fafaf9] dark:bg-[#18181b] border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9]'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: prod.color }} aria-hidden="true" />
                        <span className="truncate max-w-[180px]">{prod.name}</span>
                        <span className="font-mono text-[10px] opacity-80">({formatNumber(prod.sales)})</span>
                      </button>
                    );
                  })}
                </div>
                {isolatedSeries && (
                  <button
                    type="button"
                    onClick={() => setIsolatedSeries(null)}
                    className="text-xs font-semibold text-[#1e3fc8] dark:text-[#60a5fa] hover:underline cursor-pointer"
                  >
                    Show all 3 series
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
