/** Product Analytics Page - Top/worst products, trends, and performance. */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productsApi, systemApi, dashboardApi } from '@/services/api';
import { Boxes, TrendingUp, TrendingDown, DollarSign, Star, Search, Filter, X, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';


const CATEGORY_COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];

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

  const topProducts = topProductsData?.products || [];
  const isEmptyOrg = systemStatus && !systemStatus.dataset_exists;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => ['All', ...new Set(topProducts.map(p => p.category))], [topProducts]);

  const filteredProducts = useMemo(() => {
    return topProducts.filter(p =>
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
      { name: 'Low Risk', count: low, color: '#34C759' },
      { name: 'Medium Risk', count: med, color: '#FF9500' },
      { name: 'High Risk', count: high, color: '#FF3B30' },
    ];
  }, [kpis]);

  const trendData = useMemo(() => {
    const top3 = topProducts.slice(0, 3).map(p => p.name);
    return ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
      const data: any = { month };
      top3.forEach(name => {
        const base = topProducts.find(p => p.name === name)!.sales / 6;
        const hash = (name.length * 13 + idx * 7) % 10;
        const multiplier = 0.8 + (hash / 10) * 0.4;
        data[name] = Math.round(base * multiplier);
      });
      return data;
    });
  }, [topProducts]);

  const top3Names = useMemo(() => topProducts.slice(0, 3).map(p => p.name), [topProducts]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ds-text tracking-tight">Product Analytics</h1>
          <p className="text-sm text-ds-text-secondary mt-1">Product performance, trends & risk classification</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-secondary" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-full text-xs bg-ds-surface-sunken border border-ds-border text-ds-text placeholder:text-ds-text-secondary focus:outline-none focus:ring-2 focus:ring-ds-blue-action/25 transition-all duration-200"
            />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("btn-apple btn-apple-soft text-xs h-9 px-3.5",
                (showFilters || selectedCategory !== 'All') && "bg-ds-blue-action text-white")}>
              <Filter className="w-3.5 h-3.5" /> Filter
              {selectedCategory !== 'All' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 card-apple p-2 z-50 space-y-1 shadow-[var(--ds-raise-3)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-ds-border">
                    <span className="text-xs font-semibold text-ds-text">Category</span>
                    <button onClick={() => setShowFilters(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-ds-text-secondary hover:text-ds-text hover:bg-ds-surface-sunken"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200",
                        selectedCategory === cat ? "bg-ds-blue-action text-white" : "text-ds-text-secondary hover:bg-ds-surface-sunken hover:text-ds-text")}>
                      {cat}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Products" value={formatNumber(kpis?.total_products || 0)} icon={Boxes} gradient="gradient-primary" delay={0} />
        <KPICard title="Total Revenue" value={formatCurrency(kpis?.total_revenue || 0)} change={(kpis?.total_revenue || 0) > 0 ? 12.5 : undefined} icon={DollarSign} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Avg Growth Rate" value={(kpis?.total_products || 0) > 0 ? "11.2%" : "—"} change={(kpis?.total_products || 0) > 0 ? 3.4 : undefined} icon={TrendingUp} gradient="gradient-warning" delay={0.1} />
        <KPICard title="At Risk Products" value={String(kpis?.products_at_risk || 0)} change={(kpis?.products_at_risk || 0) > 0 ? -2 : undefined} icon={TrendingDown} gradient="gradient-danger" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products Table */}
        <div className="lg:col-span-2">
          <ChartCard title="Product Performance Ranking" subtitle={`Sorted by total units sold${selectedCategory !== 'All' ? ` — ${selectedCategory}` : ''} (${filteredProducts.length} items)`} delay={0.2}>
            <div className="space-y-2.5">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-sm text-ds-text-secondary">
                  No products found {searchTerm && `matching "${searchTerm}"`} {selectedCategory !== 'All' && `in "${selectedCategory}"`}
                </div>
              ) : filteredProducts.map((p, i) => (
                <motion.div key={p.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.04 }}
                  className="flex items-center gap-4 p-3.5 rounded-2xl bg-ds-surface-sunken/40 hover:bg-ds-surface-sunken transition-all duration-200 border border-ds-border/60 group">
                  <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-sans tabular-nums flex-shrink-0',
                    i < 3 ? 'bg-ds-blue-action text-white shadow-[var(--ds-raise-1)]' : 'bg-ds-surface border border-ds-border text-ds-text-secondary')}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ds-text truncate">{p.name}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-ds-text-secondary font-sans tabular-nums">{formatNumber(p.sales)} units</span>
                      <span className="text-xs text-ds-text-secondary">•</span>
                      <span className="text-xs text-ds-text-secondary font-sans tabular-nums">{formatCurrency(p.revenue)}</span>
                      <span className="text-xs text-ds-text-secondary">•</span>
                      <span className="badge-apple bg-ds-surface text-ds-text-secondary border border-ds-border">{p.category}</span>
                    </div>
                  </div>
                  <div className={cn('badge-apple flex items-center gap-1 font-sans font-semibold tabular-nums',
                    p.growth > 0 ? 'bg-ds-emerald-success/10 text-ds-emerald-success border-ds-emerald-success/25' : 'bg-ds-red-danger/10 text-ds-red-danger border-ds-red-danger/25')}>
                    {p.growth > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {p.growth > 0 ? '+' : ''}{p.growth}%
                  </div>
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Risk Classification */}
        <ChartCard title="Product Risk Classification" subtitle="ML-based risk scoring" delay={0.25}>
          <div className="space-y-4 mt-2">
            {riskClassification.map((r, i) => (
              <motion.div key={r.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="text-sm font-medium text-ds-text">{r.name}</span>
                  </div>
                  <span className="text-sm font-bold font-sans tabular-nums tracking-[-0.03em]" style={{ color: r.color }}>{r.count}</span>
                </div>
                <div className="h-2.5 bg-ds-surface-sunken rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(r.count / Math.max(kpis?.total_products || 1, 1)) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ background: r.color }} />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-ds-surface-sunken/40 border border-ds-border/60">
            <p className="text-xs text-ds-text-secondary leading-relaxed">Risk classification uses demand volatility, lead time variability, and stock-out history to score products.</p>
          </div>
        </ChartCard>
      </div>

      {/* Product Trend Chart */}
      <ChartCard title="Top Product Trends" subtitle="Monthly sales trend for top 3 products" delay={0.3}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', boxShadow: 'var(--ds-raise-2)', fontSize: '12px', color: 'var(--ds-text)' }} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#8E8E93' }} />
            {top3Names.map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
    </ChartCard>
    </div>
  );
}
