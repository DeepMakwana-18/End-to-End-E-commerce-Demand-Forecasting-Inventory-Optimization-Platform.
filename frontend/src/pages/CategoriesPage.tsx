/**
 * Category Analytics Page — Titan AI
 *
 * Category demand share, top-3 volume leader comparison, quarterly distribution, and SKU breakdown.
 * Aligned with the Titan AI design system (ink, warm paper, blue actions, restrained orange accents).
 */

import { useState, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  PieChart as PieIcon, TrendingUp, BarChart3, Layers,
  Info, Package, X,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { productsApi, systemApi } from '@/services/api';
import { useAppStore } from '@/stores/appStore';
import { PageHeader } from '@/components/ui/PageHeader';
import '@/styles/titan-dashboard.css';

// Unified, high-contrast Titan-compatible category palette
const CATEGORY_PALETTE = [
  '#1e3fc8', // Titan Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Violet
  '#0891b2', // Cyan
  '#db2777', // Rose-Pink
  '#4f46e5', // Indigo
  '#0d9488', // Teal
];

interface CategoryItem {
  category: string;
  product_count: number;
  total_sales: number;
  total_revenue: number;
}

export default function CategoriesPage() {
  const prefersReducedMotion = useReducedMotion();
  const { theme } = useAppStore();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    },
  });

  const { data: categoriesResponse, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await productsApi.getCategories();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists,
  });

  const rawCategories: CategoryItem[] = useMemo(
    () => categoriesResponse?.categories || [],
    [categoriesResponse?.categories]
  );

  const totalSales = useMemo(
    () => rawCategories.reduce((acc, c) => acc + c.total_sales, 0),
    [rawCategories]
  );

  const categoriesWithSalesCount = useMemo(
    () => rawCategories.filter((c) => c.total_sales > 0).length,
    [rawCategories]
  );

  // Consistent color & safe-key map across donut, quarterly chart, comparison, and cards
  const categoryData = useMemo(() => {
    return rawCategories.map((c, i) => ({
      id: c.category,
      safeKey: `cat_${i}`,
      name: c.category,
      value: totalSales > 0 ? Math.round((c.total_sales / totalSales) * 100) : 0,
      color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
      demand: c.total_sales,
      revenue: c.total_revenue,
      productCount: c.product_count,
      avgPrice: c.total_sales > 0 ? c.total_revenue / c.total_sales : null,
    }));
  }, [rawCategories, totalSales]);

  // Top category ranked by actual demand volume
  const topCategory = useMemo(() => {
    if (!categoryData.length) return null;
    return [...categoryData].sort((a, b) => b.demand - a.demand)[0];
  }, [categoryData]);

  // Top 3 volume leaders for aligned comparison matrix
  const top3Leaders = useMemo(() => {
    return [...categoryData].sort((a, b) => b.demand - a.demand).slice(0, 3);
  }, [categoryData]);

  const maxLeaderDemand = useMemo(
    () => Math.max(...top3Leaders.map((c) => c.demand), 1),
    [top3Leaders]
  );
  const maxLeaderRevenue = useMemo(
    () => Math.max(...top3Leaders.map((c) => c.revenue), 1),
    [top3Leaders]
  );

  // Modeled quarterly demand breakdown (22% / 24% / 28% / 26% seasonal weights; no year field in API)
  const seasonalByCategory = useMemo(() => {
    const weights = [
      { quarter: 'Q1', weight: 0.22 },
      { quarter: 'Q2', weight: 0.24 },
      { quarter: 'Q3', weight: 0.28 },
      { quarter: 'Q4', weight: 0.26 },
    ];
    return weights.map(({ quarter, weight }) => {
      const row: Record<string, string | number> = { quarter };
      categoryData.forEach((c) => {
        row[c.safeKey] = Math.round(c.demand * weight);
      });
      return row;
    });
  }, [categoryData]);

  const toggleCategory = (name: string) => {
    setSelectedCategory((prev) => (prev === name ? null : name));
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-4">
      <PageHeader
        title="Category Analytics"
        description="Demand share, leader comparison & seasonal distribution across catalog segments"
        actions={
          selectedCategory ? (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 bg-ds-sidebar-active text-ds-sidebar-active-text border border-ds-sidebar-active-border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2"
            >
              <span>Focused: {selectedCategory}</span>
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : undefined
        }
      />

      {/* ── 2. Overall Demand & Leading Category KPIs ────────────────── */}
      <section
        aria-label="Category Key Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {/* Total Demand */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Total Demand
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#0a0a0a] dark:text-[#fafaf9]">
                {isLoading ? '—' : formatNumber(totalSales)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 text-[#1e3fc8] dark:text-[#60a5fa] border border-[#bfdbfe] dark:border-[#1e3fc8]/40 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            {totalSales.toLocaleString()} exact units across {categoriesWithSalesCount} selling segments
          </p>
        </div>

        {/* Top Category */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Top Category
              </p>
              <p className="text-xl sm:text-2xl font-semibold font-sans tracking-tight leading-tight text-ds-text-primary truncate" title={topCategory?.name}>
                {isLoading ? '—' : topCategory ? topCategory.name : '—'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-[10px] bg-ds-blue-surface text-ds-blue-on-surface border border-ds-blue/20 flex items-center justify-center flex-shrink-0">
              <PieIcon className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            {topCategory
              ? `~${topCategory.value}% rounded share (${formatNumber(topCategory.demand)} units)`
              : 'No category sales'}
          </p>
        </div>

        {/* Catalog Segments */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Catalog Segments
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#0a0a0a] dark:text-[#fafaf9]">
                {isLoading ? '—' : String(categoryData.length)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            {categoriesWithSalesCount} with sales · {categoryData.length - categoriesWithSalesCount} zero-sales segment
          </p>
        </div>

        {/* Average Growth */}
        <div className="rounded-[16px] p-5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-xs flex flex-col justify-between min-h-[136px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] mb-1.5 truncate">
                Average Growth
              </p>
              <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#52525b] dark:text-[#a1a1aa]">
                N/A
              </p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-[#fffbeb] dark:bg-amber-950/40 text-[#92400e] dark:text-amber-300 border border-[#fde68a] dark:border-amber-800/50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium mt-3">
            No prior-period comparison in source API
          </p>
        </div>
      </section>

      {/* ── 3. Category Share of Demand & Volume Leaders Matrix ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Demand Distribution Donut + Interactive Share List */}
        <section
          aria-label="Category Demand Distribution"
          className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                Category Share of Demand
              </h2>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
                Rounded percentage share of {totalSales.toLocaleString()} total units
              </p>
            </div>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-semibold text-[#1e3fc8] dark:text-[#60a5fa] hover:underline cursor-pointer"
              >
                Reset selection
              </button>
            )}
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between">
            {categoryData.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-dashed border-[#e4e4e7] dark:border-[#27272a]">
                <PieIcon className="w-6 h-6 text-[#1e3fc8] dark:text-[#60a5fa] mb-2" />
                <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Category Data Available</p>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 max-w-xs">
                  Upload sales and product telemetry to inspect category demand shares.
                </p>
              </div>
            ) : (
              <>
                <div className="relative w-full h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={102}
                        paddingAngle={2.5}
                        dataKey="demand"
                        stroke={isDark ? '#111113' : '#ffffff'}
                        strokeWidth={2}
                        isAnimationActive={!prefersReducedMotion}
                      >
                        {categoryData.map((entry) => {
                          const dimmed = selectedCategory !== null && selectedCategory !== entry.name;
                          return (
                            <Cell
                              key={entry.id}
                              fill={entry.color}
                              fillOpacity={dimmed ? 0.25 : 1}
                              className="cursor-pointer transition-opacity duration-150"
                              onClick={() => toggleCategory(entry.name)}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        allowEscapeViewBox={{ x: false, y: false }}
                        wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload as (typeof categoryData)[number];
                          return (
                            <div className="titan-chart-tooltip rounded-[12px] p-3.5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs min-w-[185px]">
                              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#e4e4e7] dark:border-[#27272a]">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9]">{data.name}</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-[#52525b] dark:text-[#a1a1aa]">Rounded Share:</span>
                                  <span className="font-bold font-mono tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">{data.value}%</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-[#52525b] dark:text-[#a1a1aa]">Demand:</span>
                                  <span className="font-bold font-mono tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">{formatNumber(data.demand)} units</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-[#52525b] dark:text-[#a1a1aa]">Revenue:</span>
                                  <span className="font-bold font-mono tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">{formatCurrency(data.revenue)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-[#52525b] dark:text-[#a1a1aa]">Catalog SKUs:</span>
                                  <span className="font-bold font-mono tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">{data.productCount}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Summary */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold font-sans tabular-nums tracking-tight text-[#0a0a0a] dark:text-[#fafaf9]">
                      {totalSales.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mt-0.5">
                      Total Units
                    </span>
                  </div>
                </div>

                {/* Keyboard-accessible Category Share List */}
                <div className="flex flex-wrap justify-center gap-2 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] mt-2">
                  {categoryData.map((c) => {
                    const isSelected = selectedCategory === c.name;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(c.name)}
                        aria-pressed={isSelected}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border text-xs transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                          isSelected
                            ? 'bg-[#eff6ff] dark:bg-[#1e3fc8]/20 border-[#1e3fc8] dark:border-[#60a5fa] text-[#0a0a0a] dark:text-[#fafaf9]'
                            : 'bg-[#fafaf9] dark:bg-[#18181b] border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9]'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} aria-hidden="true" />
                        <span className="font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">{c.name}</span>
                        <span className="font-mono text-[11px] tabular-nums">
                          {c.demand === 0 ? '0 units' : `${c.value}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Top 3 Volume Leaders — Aligned Comparison Matrix (replaces opaque 0-100 radar) */}
        <section
          aria-label="Top 3 Volume Leaders Comparison"
          className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                Top {top3Leaders.length} Volume Leaders Comparison
              </h2>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
                Exact Volume, Revenue, SKU count, and Avg Price (Revenue ÷ Volume)
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#52525b] dark:text-[#a1a1aa] bg-white dark:bg-[#111113] px-2.5 py-1 rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a]">
              Actual Values
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
            {top3Leaders.length === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-dashed border-[#e4e4e7] dark:border-[#27272a]">
                <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Leader Comparison Available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {top3Leaders.map((leader, rank) => {
                  const volPct = Math.round((leader.demand / maxLeaderDemand) * 100);
                  const revPct = Math.round((leader.revenue / maxLeaderRevenue) * 100);
                  const isSelected = selectedCategory === leader.name;
                  return (
                    <div
                      key={leader.id}
                      onClick={() => toggleCategory(leader.name)}
                      className={cn(
                        'p-3.5 rounded-[12px] border transition-colors duration-150 cursor-pointer',
                        isSelected
                          ? 'bg-[#eff6ff]/60 dark:bg-[#1e3fc8]/15 border-[#1e3fc8] dark:border-[#60a5fa]'
                          : 'bg-[#fafaf9] dark:bg-[#18181b] border-[#e4e4e7] dark:border-[#27272a] hover:border-[#0a0a0a]/40 dark:hover:border-[#fafaf9]/40'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: leader.color }} aria-hidden="true" />
                          <span className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate">
                            #{rank + 1} {leader.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#52525b] dark:text-[#a1a1aa] flex-shrink-0">
                          {leader.productCount} SKUs · Avg {leader.avgPrice !== null ? formatCurrency(leader.avgPrice) : 'N/A'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">Volume</span>
                            <span className="font-mono font-bold tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">
                              {formatNumber(leader.demand)} units ({volPct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#e4e4e7]/70 dark:bg-[#27272a] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${volPct}%`, backgroundColor: leader.color }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">Revenue</span>
                            <span className="font-mono font-bold tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">
                              {formatCurrency(leader.revenue)} ({revPct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#e4e4e7]/70 dark:bg-[#27272a] overflow-hidden">
                            <div className="h-full rounded-full opacity-80" style={{ width: `${revPct}%`, backgroundColor: leader.color }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3 rounded-[10px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#52525b] dark:text-[#a1a1aa] mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
                Bars show each leader’s actual volume and gross revenue scaled against the top category (100%). Click any category to highlight it across charts.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── 4. Quarterly Change by Category (Modeled Seasonal Weights) ── */}
      <section
        aria-label="Seasonal Category Demand"
        className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
              Seasonal Category Demand (Q1–Q4)
            </h2>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Modeled quarterly distribution (22% / 24% / 28% / 26% seasonal weights · Year unspecified in API)
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {categoryData.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-dashed border-[#e4e4e7] dark:border-[#27272a]">
              <BarChart3 className="w-6 h-6 text-[#d97706] mb-2" />
              <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Seasonal Patterns Found</p>
            </div>
          ) : (
            <div className="w-full h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonalByCategory} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                  <XAxis
                    dataKey="quarter"
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: 'var(--ds-hairline)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`)}
                  />
                  <Tooltip
                    allowEscapeViewBox={{ x: false, y: false }}
                    wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const quarterTotal = payload.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
                      return (
                        <div className="titan-chart-tooltip rounded-[12px] p-3.5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs min-w-[195px]">
                          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#e4e4e7] dark:border-[#27272a]">
                            <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9]">{label} Modeled Demand</span>
                            <span className="font-mono font-bold tabular-nums text-[#1e3fc8] dark:text-[#60a5fa]">
                              {formatNumber(quarterTotal)} units
                            </span>
                          </div>
                          <div className="space-y-1">
                            {payload.map((entry) => (
                              <div key={String(entry.dataKey)} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">{entry.name}</span>
                                </div>
                                <span className="font-mono font-bold tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">
                                  {formatNumber(Number(entry.value) || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {categoryData.map((c, i) => {
                    const dimmed = selectedCategory !== null && selectedCategory !== c.name;
                    return (
                      <Bar
                        key={c.id}
                        dataKey={c.safeKey}
                        name={c.name}
                        stackId="a"
                        fill={c.color}
                        fillOpacity={dimmed ? 0.25 : 1}
                        radius={i === categoryData.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        isAnimationActive={!prefersReducedMotion}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ── 5. Category-Level Details & SKU Performance Cards ────────── */}
      <section aria-label="Category Summary Cards">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
              Category Summary &amp; SKU Performance
            </h2>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              All segments reflect single-cycle baseline telemetry (no prior-period momentum available)
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#52525b] dark:text-[#a1a1aa]">
            {categoryData.length} Catalog Segments
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryData.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const isZeroSales = cat.demand === 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.name)}
                aria-pressed={isSelected}
                className={cn(
                  'w-full text-left p-5 rounded-[16px] border transition-colors duration-150 flex flex-col justify-between min-h-[164px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                  isSelected
                    ? 'bg-[#eff6ff]/60 dark:bg-[#1e3fc8]/15 border-[#1e3fc8] dark:border-[#60a5fa] ring-1 ring-[#1e3fc8] dark:ring-[#60a5fa]'
                    : 'bg-white dark:bg-[#111113] border-[#e4e4e7] dark:border-[#27272a] hover:border-[#0a0a0a]/40 dark:hover:border-[#fafaf9]/40'
                )}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} aria-hidden="true" />
                      <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate">
                        {cat.name}
                      </h3>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-[#fafaf9] dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a] flex-shrink-0">
                      {cat.value}% share
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 my-2">
                    <span className={cn(
                      'text-3xl font-extrabold font-sans tabular-nums tracking-tight',
                      isZeroSales ? 'text-[#52525b] dark:text-[#a1a1aa]' : 'text-[#0a0a0a] dark:text-[#fafaf9]'
                    )}>
                      {formatNumber(cat.demand)}
                    </span>
                    <span className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa]">
                      {isZeroSales ? 'Units (No recorded sales)' : 'Units Demand'}
                    </span>
                  </div>
                </div>

                <div className="w-full pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between gap-2 text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{cat.productCount} {cat.productCount === 1 ? 'SKU' : 'SKUs'} in catalog</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">
                    {formatCurrency(cat.revenue)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
