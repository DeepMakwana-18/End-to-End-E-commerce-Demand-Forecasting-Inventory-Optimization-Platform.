/** Product Analytics Page - Top/worst products, trends, and performance. */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Boxes, TrendingUp, TrendingDown, DollarSign, Star, Search, Filter, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';


const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899'];

export default function ProductsPage() {
  const topProducts = useDataStore(s => s.topProducts);
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
    return [
      { name: 'Low Risk', count: Math.round(topProducts.length * 0.7), color: '#10b981' },
      { name: 'Medium Risk', count: Math.round(topProducts.length * 0.2), color: '#f59e0b' },
      { name: 'High Risk', count: Math.max(1, Math.round(topProducts.length * 0.1)), color: '#ef4444' },
    ];
  }, [topProducts]);

  const trendData = useMemo(() => {
    const top3 = topProducts.slice(0, 3).map(p => p.name);
    return ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => {
      const data: any = { month };
      top3.forEach(name => {
        const base = topProducts.find(p => p.name === name)!.sales / 6;
        data[name] = Math.round(base * (0.8 + Math.random() * 0.4));
      });
      return data;
    });
  }, [topProducts]);

  const top3Names = useMemo(() => topProducts.slice(0, 3).map(p => p.name), [topProducts]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Product Analytics</h1>
          <p className="text-sm text-surface-500 mt-1">Product performance, trends & risk classification</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-surface-800/50 border border-surface-700/50 text-surface-300 placeholder:text-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
            />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border",
                showFilters || selectedCategory !== 'All' ? "bg-primary-500/10 text-primary-400 border-primary-500/30" : "bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 border-surface-700/50")}>
              <Filter className="w-3.5 h-3.5" /> Filter
              {selectedCategory !== 'All' && <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 glass-card p-3 z-50 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-surface-300">Category</span>
                    <button onClick={() => setShowFilters(false)} className="text-surface-500 hover:text-surface-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition",
                        selectedCategory === cat ? "bg-primary-500/10 text-primary-400" : "text-surface-400 hover:bg-surface-800/60 hover:text-surface-200")}>
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
        <KPICard title="Total Products" value="847" icon={Boxes} gradient="gradient-primary" delay={0} />
        <KPICard title="Total Revenue" value={formatCurrency(2847563)} change={12.5} icon={DollarSign} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Avg Growth Rate" value="11.2%" change={3.4} icon={TrendingUp} gradient="gradient-warning" delay={0.1} />
        <KPICard title="At Risk Products" value="5" change={-2} icon={TrendingDown} gradient="gradient-danger" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products Table */}
        <div className="lg:col-span-2">
          <ChartCard title="Product Performance Ranking" subtitle={`Sorted by total units sold${selectedCategory !== 'All' ? ` — ${selectedCategory}` : ''} (${filteredProducts.length} items)`} delay={0.2}>
            <div className="space-y-2.5">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-sm text-surface-500">
                  No products found {searchTerm && `matching "${searchTerm}"`} {selectedCategory !== 'All' && `in "${selectedCategory}"`}
                </div>
              ) : filteredProducts.map((p, i) => (
                <motion.div key={p.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.04 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-surface-800/30 hover:bg-surface-800/50 transition group">
                  <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                    i < 3 ? 'gradient-primary text-white' : 'bg-surface-700/50 text-surface-400')}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-surface-200 truncate">{p.name}</p>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-warning-400 fill-warning-400" />
                        <span className="text-[10px] text-surface-400">{p.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-surface-500">{formatNumber(p.sales)} units</span>
                      <span className="text-xs text-surface-600">•</span>
                      <span className="text-xs text-surface-500">{formatCurrency(p.revenue)}</span>
                      <span className="text-xs text-surface-600">•</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-400">{p.category}</span>
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-1 text-xs font-bold', p.growth > 0 ? 'text-accent-400' : 'text-danger-400')}>
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
                    <span className="text-sm font-medium text-surface-300">{r.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: r.color }}>{r.count}</span>
                </div>
                <div className="h-2.5 bg-surface-800/50 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(r.count / 65) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ background: r.color }} />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 p-3 rounded-xl bg-surface-800/30 border border-surface-700/30">
            <p className="text-xs text-surface-500 leading-relaxed">Risk classification uses demand volatility, lead time variability, and stock-out history to score products.</p>
          </div>
        </ChartCard>
      </div>

      {/* Product Trend Chart */}
      <ChartCard title="Top Product Trends" subtitle="Monthly sales trend for top 3 products" delay={0.3}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" />
            <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '12px', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {top3Names.map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
