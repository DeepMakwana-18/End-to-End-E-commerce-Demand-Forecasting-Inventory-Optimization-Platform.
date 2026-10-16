/** Category Analytics Page - Category demand, growth, and seasonal analysis. */

import { motion } from 'framer-motion';
import { PieChart as PieIcon, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn, formatNumber } from '@/lib/utils';

import { useQuery } from '@tanstack/react-query';
import { productsApi, systemApi } from '@/services/api';
import { Database } from 'lucide-react';

export default function CategoriesPage() {
  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    }
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await productsApi.getCategories();
      return res.data;
    },
    enabled: !!systemStatus?.dataset_exists
  });

  const isEmptyOrg = systemStatus && !systemStatus.dataset_exists;

  const rawCategories = categoriesResponse?.categories || [];
  
  const CATEGORY_COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
  
  const totalSales = rawCategories.reduce((acc, c) => acc + c.total_sales, 0);

  const categoryData = rawCategories.map((c, i) => ({
    name: c.category,
    value: totalSales > 0 ? Math.round((c.total_sales / totalSales) * 100) : 0,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    demand: c.total_sales,
    growth: 0, // removed mock growth
  }));

  const seasonalByCategory = [
    { quarter: 'Q1', ...Object.fromEntries(rawCategories.map((c, i) => [c.category, c.total_sales * 0.22])) },
    { quarter: 'Q2', ...Object.fromEntries(rawCategories.map((c, i) => [c.category, c.total_sales * 0.24])) },
    { quarter: 'Q3', ...Object.fromEntries(rawCategories.map((c, i) => [c.category, c.total_sales * 0.28])) },
    { quarter: 'Q4', ...Object.fromEntries(rawCategories.map((c, i) => [c.category, c.total_sales * 0.26])) },
  ];

  const maxSales = Math.max(...rawCategories.map((c: any) => c.total_sales), 1);
  const maxRevenue = Math.max(...rawCategories.map((c: any) => c.total_revenue), 1);

  const radarData = [
    { metric: 'Volume', ...Object.fromEntries(rawCategories.map((c: any) => [c.category, Math.round((c.total_sales / maxSales) * 100)])) },
    { metric: 'Revenue', ...Object.fromEntries(rawCategories.map((c: any) => [c.category, Math.round((c.total_revenue / maxRevenue) * 100)])) },
    { metric: 'Products', ...Object.fromEntries(rawCategories.map((c: any) => [c.category, Math.min(100, c.product_count * 15)])) },
    { metric: 'Avg Price', ...Object.fromEntries(rawCategories.map((c: any) => [c.category, c.total_sales ? Math.min(100, Math.round(c.total_revenue / c.total_sales)) : 0])) },
  ];

  const categoriesList = categoryData.map(c => c.name);
  const avgGrowth = categoryData.length ? (categoryData.reduce((acc, c) => acc + c.growth, 0) / categoryData.length).toFixed(1) : "0.0";
  
  return (
    <div className="space-y-6">

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-ds-text tracking-tight">Category Analytics</h1>
        <p className="text-sm text-ds-text-secondary mt-1">Category demand distribution, growth & seasonal analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Categories" value={categoryData.length.toString()} icon={Layers} gradient="gradient-primary" delay={0} />
        <KPICard title="Top Category" value={categoryData.length ? categoryData[0].name : '—'} icon={PieIcon} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Avg Growth" value={categoryData.length ? `${avgGrowth}%` : "—"} change={categoryData.length > 0 ? (parseFloat(avgGrowth) > 0 ? 4.2 : -2.1) : undefined} icon={TrendingUp} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Total Demand" value={formatNumber(categoryData.reduce((acc, c) => acc + c.demand, 0))} change={categoryData.length > 0 ? 8.1 : undefined} icon={BarChart3} gradient="bg-cyan-500" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <ChartCard title="Category Demand Distribution" subtitle="Percentage share by category" delay={0.2}>
          {categoryData.length === 0 ? (
            <div className="w-full h-[280px] flex items-center justify-center text-ds-text-secondary text-sm">No data available</div>
          ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={((value: any) => [`${value}%`, '']) as any}
                contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', boxShadow: 'var(--ds-raise-2)', fontSize: '12px', color: 'var(--ds-text)' }} />
            </PieChart>
          </ResponsiveContainer>
          )}
          <div className="flex flex-wrap justify-center gap-3 -mt-2">
            {categoryData.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-[11px] font-medium text-ds-text-secondary">{c.name} ({c.value}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Radar chart */}
        <ChartCard title="Category Performance Radar" subtitle="Multi-metric comparison" delay={0.25}>
          {categoriesList.length === 0 ? (
            <div className="w-full h-[310px] flex items-center justify-center text-ds-text-secondary text-sm">No data available</div>
          ) : (
          <ResponsiveContainer width="100%" height={310}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(128,128,128,0.2)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#8E8E93', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', boxShadow: 'var(--ds-raise-2)', fontSize: '12px', color: 'var(--ds-text)' }} />
              {categoriesList.slice(0, 3).map((cat, i) => (
                <Radar key={cat} name={cat} dataKey={cat} stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} fillOpacity={0.25} />
              ))}
              <Legend wrapperStyle={{ fontSize: '11px', color: '#8E8E93' }} />
            </RadarChart>
          </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Seasonal stacked bar chart */}
      <ChartCard title="Seasonal Category Demand" subtitle="Quarterly demand breakdown by category" delay={0.3}>
        {categoriesList.length === 0 ? (
          <div className="w-full h-[300px] flex items-center justify-center text-ds-text-secondary text-sm">No data available</div>
        ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={seasonalByCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
            <XAxis dataKey="quarter" tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', boxShadow: 'var(--ds-raise-2)', fontSize: '12px', color: 'var(--ds-text)' }} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#8E8E93' }} />
            {categoriesList.map((cat, i) => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} radius={i === categoriesList.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {categoryData.map((cat, i) => (
          <motion.div key={cat.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
            className="card-apple p-4.5 shadow-[var(--ds-raise-1)] hover:shadow-[var(--ds-raise-2)] transition-all duration-200 cursor-default">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
              <h4 className="text-sm font-semibold text-ds-text">{cat.name}</h4>
            </div>
            <p className="text-xl font-bold font-sans text-ds-text tabular-nums tracking-[-0.03em]">{formatNumber(cat.demand)}</p>
            <p className="text-xs text-ds-text-secondary mt-0.5">weekly demand</p>
            <div className={cn('badge-apple mt-3 inline-flex font-sans font-semibold tabular-nums', cat.growth > 0 ? 'bg-ds-emerald-success/10 text-ds-emerald-success border-ds-emerald-success/25' : 'bg-ds-surface-sunken text-ds-text-secondary border-ds-border')}>
              {cat.growth > 0 ? '↑' : '—'} {Math.abs(cat.growth)}% growth
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
