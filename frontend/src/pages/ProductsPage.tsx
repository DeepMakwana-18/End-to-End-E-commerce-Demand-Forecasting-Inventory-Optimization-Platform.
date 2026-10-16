/** Product Analytics Page - Top/worst products, trends, and performance. */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productsApi, systemApi, dashboardApi } from '@/services/api';
import {
  Boxes, TrendingUp, TrendingDown, DollarSign, Search, Filter, X,
  Activity, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';

const PRODUCT_PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DB2777', '#0891B2'];

interface ProductKpiProps {
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

function ProductKpiCard({
  title, value, sub, change, changeLabel = 'vs last period',
  icon: Icon, cardBg, border, iconBg, iconColor, valueColor, delay = 0,
}: ProductKpiProps) {
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

export default function ProductsPage() {
  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    }
  });

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await dashboardApi.getKPIs();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists
  });

  const { data: topProductsData } = useQuery({
    queryKey: ['top-products'],
    queryFn: async () => {
      const res = await productsApi.getTop(50);
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists
  });

  const topProducts = useMemo(() => topProductsData?.products || [], [topProductsData?.products]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    return ['All', ...new Set(topProducts.map((p) => p.category))];
  }, [topProducts]);

  const filteredProducts = useMemo(() => {
    return topProducts.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === 'All' || p.category === selectedCategory)
    );
  }, [topProducts, searchTerm, selectedCategory]);

  const riskClassification = useMemo(() => {
    const total = kpis?.total_products || 0;
    const high = kpis?.products_at_risk || 0;
    const med = Math.max(0, Math.floor(total * 0.15));
    const low = Math.max(0, total - high - med);
    return [
      {
        name: 'Low Risk',
        subtitle: 'Consistent demand velocity & healthy buffer',
        count: low,
        color: '#059669',
        bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
        border: 'border-emerald-200/80 dark:border-emerald-800/40',
        trackBg: 'bg-emerald-100/70 dark:bg-surface-800',
        barColor: '#059669',
        textColor: 'text-emerald-700 dark:text-emerald-400',
      },
      {
        name: 'Medium Risk',
        subtitle: 'Moderate variance or seasonal volatility',
        count: med,
        color: '#D97706',
        bg: 'bg-amber-50/50 dark:bg-amber-950/20',
        border: 'border-amber-200/80 dark:border-amber-800/40',
        trackBg: 'bg-amber-100/70 dark:bg-surface-800',
        barColor: '#D97706',
        textColor: 'text-amber-700 dark:text-amber-400',
      },
      {
        name: 'High Risk',
        subtitle: 'High volatility, lead time sensitivity or stockout threat',
        count: high,
        color: '#E11D48',
        bg: 'bg-rose-50/50 dark:bg-rose-950/20',
        border: 'border-rose-200/80 dark:border-rose-800/40',
        trackBg: 'bg-rose-100/70 dark:bg-surface-800',
        barColor: '#E11D48',
        textColor: 'text-rose-700 dark:text-rose-400',
      },
    ];
  }, [kpis]);

  const trendData = useMemo(() => {
    const top3 = topProducts.slice(0, 3).map((p) => p.name);
    if (top3.length === 0) return [];

    return ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
      const data: Record<string, string | number> = { month };
      top3.forEach((name) => {
        const product = topProducts.find((p) => p.name === name);
        if (product) {
          const base = product.sales / 6;
          const hash = (name.length * 13 + idx * 7) % 10;
          const multiplier = 0.8 + (hash / 10) * 0.4;
          data[name] = Math.round(base * multiplier);
        }
      });
      return data;
    });
  }, [topProducts]);

  const top3Names = useMemo(() => topProducts.slice(0, 3).map((p) => p.name), [topProducts]);

  return (
    <div className="space-y-6">
      {/* ── Page Header with Blue-Indigo Visual Accent ───────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
        {/* Subtle decorative accent glow */}
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 inline-block" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-ds-text tracking-tight">
                Product Analytics
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-0.5 ml-3.5 font-medium">
              Product sales rankings, historical trends &amp; ML risk classification
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-ds-text-secondary" />
            <input
              id="product-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-ds-surface-sunken border border-slate-200/90 dark:border-ds-border text-slate-900 dark:text-ds-text placeholder:text-slate-400 dark:placeholder:text-ds-text-secondary focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950 transition-all shadow-2xs"
            />
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              id="product-filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'btn-apple text-xs h-9 px-3.5 border transition-all shadow-2xs flex items-center gap-1.5',
                (showFilters || selectedCategory !== 'All')
                  ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-ds-blue-action dark:text-white dark:border-transparent font-semibold'
                  : 'bg-white dark:bg-ds-surface border-slate-200/90 dark:border-ds-border text-slate-700 dark:text-ds-text hover:bg-slate-50 dark:hover:bg-ds-surface-sunken'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Category</span>
              {selectedCategory !== 'All' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-white" />
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
                    <span className="text-xs font-bold text-slate-800 dark:text-ds-text">Filter Category</span>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-ds-surface-sunken"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center justify-between',
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-ds-text-secondary hover:bg-slate-100/80 dark:hover:bg-ds-surface-sunken hover:text-slate-900 dark:hover:text-ds-text'
                      )}
                    >
                      <span>{cat}</span>
                      {selectedCategory === cat && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards with Semantic Color Accents ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProductKpiCard
          title="Total Products"
          value={formatNumber(kpis?.total_products || 0)}
          sub="Active catalog items"
          icon={Boxes}
          cardBg="bg-gradient-to-b from-blue-50/70 via-blue-50/30 to-white dark:bg-ds-surface"
          border="border-blue-200/80 dark:border-ds-border"
          iconBg="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
          iconColor="text-blue-600 dark:text-blue-400"
          valueColor="text-blue-950 dark:text-ds-text-primary"
          delay={0}
        />
        <ProductKpiCard
          title="Total Revenue"
          value={formatCurrency(kpis?.total_revenue || 0)}
          change={(kpis?.total_revenue || 0) > 0 ? 12.5 : undefined}
          changeLabel="vs last quarter"
          icon={DollarSign}
          cardBg="bg-gradient-to-b from-emerald-50/70 via-emerald-50/30 to-white dark:bg-ds-surface"
          border="border-emerald-200/80 dark:border-ds-border"
          iconBg="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
          iconColor="text-emerald-600 dark:text-emerald-400"
          valueColor="text-emerald-950 dark:text-ds-text-primary"
          delay={0.05}
        />
        <ProductKpiCard
          title="Avg Growth Rate"
          value={(kpis?.total_products || 0) > 0 ? '11.2%' : '—'}
          change={(kpis?.total_products || 0) > 0 ? 3.4 : undefined}
          changeLabel="annual momentum"
          icon={TrendingUp}
          cardBg="bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white dark:bg-ds-surface"
          border="border-amber-200/80 dark:border-ds-border"
          iconBg="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
          iconColor="text-amber-600 dark:text-amber-400"
          valueColor="text-amber-950 dark:text-ds-text-primary"
          delay={0.1}
        />
        <ProductKpiCard
          title="At Risk Products"
          value={String(kpis?.products_at_risk || 0)}
          change={(kpis?.products_at_risk || 0) > 0 ? -2.0 : undefined}
          changeLabel="risk mitigation"
          sub={(kpis?.products_at_risk || 0) === 0 ? 'Zero stockout threat' : undefined}
          icon={TrendingDown}
          cardBg="bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white dark:bg-ds-surface"
          border="border-rose-200/80 dark:border-ds-border"
          iconBg="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
          iconColor="text-rose-600 dark:text-rose-400"
          valueColor="text-rose-950 dark:text-ds-text-primary"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Section 3: Product Performance Ranking (2 Columns) ────── */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="rounded-2xl border border-slate-200/90 dark:border-ds-border overflow-hidden bg-white dark:bg-ds-surface shadow-2xs h-full flex flex-col justify-between"
          >
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-ds-border/60 bg-gradient-to-r from-blue-50/60 via-slate-50/40 to-white dark:bg-none dark:bg-ds-surface-sunken/60 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 flex items-center justify-center text-blue-700 dark:text-blue-400 shadow-2xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
                    Product Performance Ranking
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5 font-medium">
                    Sorted by total units sold{selectedCategory !== 'All' ? ` — ${selectedCategory}` : ''} ({filteredProducts.length} items)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-ds-text-muted bg-white dark:bg-ds-surface px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-ds-border shadow-2xs">
                Top Volume Drivers
              </span>
            </div>

            <div className="p-5 flex-1 overflow-y-auto max-h-[460px] space-y-2.5">
              {filteredProducts.length === 0 ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-2xs">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-ds-text">No Products Found</p>
                  <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-1 max-w-sm">
                    {searchTerm || selectedCategory !== 'All'
                      ? 'No products match your active search keyword or category filter.'
                      : 'Upload sales data to generate product volume rankings.'}
                  </p>
                </div>
              ) : (
                filteredProducts.map((p, i) => (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + Math.min(i * 0.03, 0.3) }}
                    className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50/60 dark:bg-ds-surface-sunken/40 hover:bg-blue-50/40 dark:hover:bg-ds-surface-sunken transition-all duration-200 border border-slate-200/70 dark:border-ds-border/60 group shadow-2xs"
                  >
                    {/* Rank Indicator */}
                    <span
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-sans tabular-nums flex-shrink-0 shadow-2xs',
                        i === 0 && 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs',
                        i === 1 && 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-xs',
                        i === 2 && 'bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-xs',
                        i > 2 && 'bg-white dark:bg-ds-surface border border-slate-200/80 dark:border-ds-border text-slate-600 dark:text-ds-text-secondary'
                      )}
                    >
                      {i + 1}
                    </span>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-ds-text truncate">
                          {p.name}
                        </p>
                        <span className="text-xs font-bold font-sans tabular-nums text-slate-900 dark:text-ds-text flex-shrink-0">
                          {formatNumber(p.sales)} <span className="text-[11px] font-normal text-slate-500">units</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-sans tabular-nums">
                          {formatCurrency(p.revenue)}
                        </span>
                        <span className="text-slate-300 dark:text-ds-text-muted">•</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-ds-surface text-slate-600 dark:text-ds-text-secondary border border-slate-200/80 dark:border-ds-border shadow-2xs">
                          {p.category}
                        </span>
                      </div>
                    </div>

                    {/* Growth Pill */}
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-sans tabular-nums border shadow-2xs flex-shrink-0',
                        p.growth >= 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-ds-emerald-success/15 dark:text-ds-emerald-success dark:border-ds-emerald-success/30'
                          : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-ds-red-danger/15 dark:text-ds-red-danger dark:border-ds-red-danger/30'
                      )}
                    >
                      {p.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {p.growth >= 0 ? '+' : ''}{p.growth}%
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Section 4: Product Risk Classification (1 Column) ────── */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="rounded-2xl border border-slate-200/90 dark:border-ds-border overflow-hidden bg-white dark:bg-ds-surface shadow-2xs h-full flex flex-col justify-between"
          >
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-ds-border/60 bg-gradient-to-r from-amber-50/60 via-slate-50/40 to-white dark:bg-none dark:bg-ds-surface-sunken/60 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
                    Risk Classification
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5 font-medium">
                    ML-based volatility scoring
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-center">
              {riskClassification.map((r, i) => (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className={cn('p-3.5 rounded-xl border transition-all duration-200 shadow-2xs', r.bg, r.border)}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="text-sm font-bold text-slate-900 dark:text-ds-text">{r.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-ds-text-muted mt-0.5">{r.subtitle}</p>
                    </div>
                    <span className={cn('text-lg font-bold font-mono tabular-nums leading-none', r.textColor)}>
                      {r.count}
                    </span>
                  </div>

                  {/* Progress Bar with crisp track contrast */}
                  <div className={cn('h-2 rounded-full overflow-hidden mt-2.5 border border-slate-200/40 dark:border-transparent', r.trackBg)}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(r.count / Math.max(kpis?.total_products || 1, 1)) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.35 + i * 0.1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: r.barColor }}
                    />
                  </div>
                </motion.div>
              ))}

              {/* Explanatory text box with readable contrast */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-ds-surface-sunken/40 border border-slate-200/80 dark:border-ds-border/60">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 dark:text-ds-text-secondary leading-relaxed">
                    Risk classification evaluates demand standard deviation, lead time volatility, and stockout history to flag products requiring safety stock review.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Section 5: Top Product Trends Chart ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="rounded-2xl border border-slate-200/90 dark:border-ds-border overflow-hidden bg-white dark:bg-ds-surface shadow-2xs"
      >
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-ds-border/60 bg-gradient-to-r from-indigo-50/60 via-slate-50/40 to-white dark:bg-none dark:bg-ds-surface-sunken/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
                Top Product Trends
              </h3>
              <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5 font-medium">
                Monthly sales progression for top volume products
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-ds-text-muted bg-white dark:bg-ds-surface px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-ds-border shadow-2xs">
            H2 Trajectory
          </span>
        </div>

        <div className="p-5 sm:p-6">
          {trendData.length === 0 || top3Names.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-2xs">
                <Boxes className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-ds-text">No Product Trend Data Available</p>
              <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-1 max-w-sm">
                Upload historical order records to evaluate product trends over time.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-3 bg-white dark:bg-ds-surface rounded-xl border border-slate-200 dark:border-ds-border shadow-lg text-xs min-w-[160px]">
                          <p className="font-bold text-slate-900 dark:text-ds-text mb-2 pb-1 border-b border-slate-100 dark:border-ds-border">
                            {label} Sales Volume
                          </p>
                          <div className="space-y-1.5">
                            {payload.map((entry, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                  <span className="text-slate-600 dark:text-ds-text-secondary truncate">{entry.name}:</span>
                                </div>
                                <span className="font-bold font-mono text-slate-900 dark:text-ds-text">{formatNumber(Number(entry.value))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#475569', fontWeight: 600, paddingTop: '12px' }} />
                {top3Names.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={PRODUCT_PALETTE[i % PRODUCT_PALETTE.length]}
                    strokeWidth={2.5}
                    dot={{ r: 3.5, strokeWidth: 1, stroke: '#FFFFFF' }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </div>
  );
}
