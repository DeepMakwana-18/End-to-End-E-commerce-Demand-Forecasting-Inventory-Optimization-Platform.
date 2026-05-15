/** Forecasting Page - Product-wise & category demand forecasts with charts. */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Calendar, Layers, ArrowUpRight, ArrowDownRight,
  Filter, Download, X, CheckCircle2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn, formatNumber } from '@/lib/utils';

const forecastData = Array.from({ length: 24 }, (_, i) => ({
  week: `W${i + 1}`,
  actual: i < 16 ? Math.round(800 + Math.random() * 600 + i * 25) : undefined,
  predicted: Math.round(850 + Math.random() * 500 + i * 30),
  lower: Math.round(700 + Math.random() * 400 + i * 20),
  upper: Math.round(1000 + Math.random() * 600 + i * 40),
}));

const categoryForecasts = [
  { category: 'Electronics', current: 4520, predicted: 5230, change: 15.7 },
  { category: 'Fashion', current: 3210, predicted: 3680, change: 14.6 },
  { category: 'Home & Garden', current: 2100, predicted: 1980, change: -5.7 },
  { category: 'Sports', current: 1560, predicted: 1820, change: 16.7 },
  { category: 'Books', current: 890, predicted: 950, change: 6.7 },
  { category: 'Toys', current: 1230, predicted: 1450, change: 17.9 },
];

const seasonalData = [
  { month: 'Jan', demand: 1200 }, { month: 'Feb', demand: 1350 },
  { month: 'Mar', demand: 1100 }, { month: 'Apr', demand: 1480 },
  { month: 'May', demand: 1650 }, { month: 'Jun', demand: 1420 },
  { month: 'Jul', demand: 1780 }, { month: 'Aug', demand: 1900 },
  { month: 'Sep', demand: 1650 }, { month: 'Oct', demand: 2100 },
  { month: 'Nov', demand: 2800 }, { month: 'Dec', demand: 3200 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-surface-900/95 !border-surface-700/80 shadow-2xl">
      <p className="text-xs font-medium text-surface-300 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color || entry.stroke }}>
          <span className="font-semibold">{entry.name}: </span>
          {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function ForecastPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (selectedCategory === 'all') return categoryForecasts;
    return categoryForecasts.filter(c => c.category === selectedCategory);
  }, [selectedCategory]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    const headers = ['Category', 'Current Demand', 'Predicted Demand', 'Change %'];
    const rows = filteredCategories.map(c => `${c.category},${c.current},${c.predicted},${c.change}`);
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Forecast report exported as CSV');
  };

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Demand Forecasting</h1>
          <p className="text-sm text-surface-500 mt-1">
            XGBoost-powered demand predictions with confidence intervals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border",
                showFilters ? "bg-primary-500/10 text-primary-400 border-primary-500/30" : "bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 border-surface-700/50")}>
              <Filter className="w-3.5 h-3.5" /> Filters
              {selectedCategory !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-56 glass-card p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-surface-300">Filter by Category</span>
                    <button onClick={() => setShowFilters(false)} className="text-surface-500 hover:text-surface-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {['all', ...categoryForecasts.map(c => c.category)].map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition",
                        selectedCategory === cat ? "bg-primary-500/10 text-primary-400" : "text-surface-400 hover:bg-surface-800/60 hover:text-surface-200")}>
                      {cat === 'all' ? 'All Categories' : cat}
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

      {/* Forecast KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Model Accuracy" value="94.7%" change={2.1} icon={TrendingUp} gradient="gradient-primary" delay={0} />
        <KPICard title="RMSE Score" value="142.3" change={-8.5} icon={Layers} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Forecast Horizon" value="8 Weeks" icon={Calendar} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Next Week Demand" value="2,450" change={12.3} icon={ArrowUpRight} gradient="bg-cyan-500" delay={0.15} />
      </div>

      {/* Main Forecast Chart with Confidence Intervals */}
      <ChartCard title="Demand Forecast with Confidence Intervals"
        subtitle="Actual demand vs XGBoost predictions (95% CI)" delay={0.2}>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" />
            <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
            <Area type="monotone" dataKey="upper" name="Upper CI" stroke="transparent" fill="url(#ciGrad)" />
            <Area type="monotone" dataKey="lower" name="Lower CI" stroke="transparent" fill="transparent" />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2.5}
              dot={{ fill: '#10b981', r: 3 }} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#6366f1" strokeWidth={2.5}
              strokeDasharray="5 5" dot={{ fill: '#6366f1', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Forecasts */}
        <ChartCard title="Category Forecast Summary" subtitle={selectedCategory === 'all' ? 'Predicted demand changes by category' : `Showing: ${selectedCategory}`} delay={0.25}>
          <div className="space-y-3">
            {filteredCategories.map((cat, i) => (
              <motion.div key={cat.category}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-surface-800/30 hover:bg-surface-800/50 transition">
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-200">{cat.category}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-surface-500">Current: {formatNumber(cat.current)}</span>
                    <span className="text-xs text-surface-500">→</span>
                    <span className="text-xs font-semibold text-surface-300">Predicted: {formatNumber(cat.predicted)}</span>
                  </div>
                </div>
                <div className={cn('flex items-center gap-1 text-xs font-bold',
                  cat.change > 0 ? 'text-accent-400' : 'text-danger-400')}>
                  {cat.change > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(cat.change)}%
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>

        {/* Seasonal Pattern */}
        <ChartCard title="Seasonal Demand Pattern" subtitle="Monthly demand seasonality analysis" delay={0.3}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={seasonalData}>
              <defs>
                <linearGradient id="seasonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="demand" name="Demand" stroke="#f59e0b" strokeWidth={2.5}
                fill="url(#seasonGrad)" dot={{ fill: '#f59e0b', r: 3 }}
                activeDot={{ r: 5, stroke: '#f59e0b', strokeWidth: 2, fill: '#1e1e22' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
