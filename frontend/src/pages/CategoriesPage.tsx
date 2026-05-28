/** Category Analytics Page - Category demand, growth, and seasonal analysis. */

import { motion } from 'framer-motion';
import { PieChart as PieIcon, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn, formatNumber } from '@/lib/utils';

import { useDataStore } from '@/stores/dataStore';

export default function CategoriesPage() {
  const { categoryData, seasonalByCategory, radarData } = useDataStore();

  const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899'];
  const categoriesList = categoryData.map(c => c.name);
  const avgGrowth = categoryData.length ? (categoryData.reduce((acc, c) => acc + c.growth, 0) / categoryData.length).toFixed(1) : "0.0";
  
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Category Analytics</h1>
        <p className="text-sm text-surface-500 mt-1">Category demand distribution, growth & seasonal analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Categories" value={categoryData.length.toString()} icon={Layers} gradient="gradient-primary" delay={0} />
        <KPICard title="Top Category" value={categoryData.length ? categoryData[0].name : '-'} icon={PieIcon} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Avg Growth" value={`${avgGrowth}%`} change={parseFloat(avgGrowth) > 0 ? 4.2 : -2.1} icon={TrendingUp} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Total Demand" value={formatNumber(categoryData.reduce((acc, c) => acc + c.demand, 0))} change={8.1} icon={BarChart3} gradient="bg-cyan-500" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <ChartCard title="Category Demand Distribution" subtitle="Percentage share by category" delay={0.2}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={((value: any) => [`${value}%`, '']) as any}
                contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '12px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 -mt-2">
            {categoryData.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-[11px] text-surface-400">{c.name} ({c.value}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Radar chart */}
        <ChartCard title="Category Performance Radar" subtitle="Multi-metric comparison" delay={0.25}>
          <ResponsiveContainer width="100%" height={310}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(63,63,70,0.5)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '12px' }} />
              {categoriesList.slice(0, 3).map((cat, i) => (
                <Radar key={cat} name={cat} dataKey={cat} stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} fillOpacity={0.3} />
              ))}
              <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Seasonal stacked bar chart */}
      <ChartCard title="Seasonal Category Demand" subtitle="Quarterly demand breakdown by category" delay={0.3}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={seasonalByCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" />
            <XAxis dataKey="quarter" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
            {categoriesList.map((cat, i) => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} radius={i === categoriesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {categoryData.map((cat, i) => (
          <motion.div key={cat.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
            className="glass-card p-4 group hover:scale-[1.02] transition-transform cursor-default">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
              <h4 className="text-sm font-semibold text-surface-200">{cat.name}</h4>
            </div>
            <p className="text-xl font-bold text-surface-50">{formatNumber(cat.demand)}</p>
            <p className="text-xs text-surface-500 mt-0.5">weekly demand</p>
            <div className={cn('mt-2 text-xs font-bold', cat.growth > 0 ? 'text-accent-400' : 'text-danger-400')}>
              {cat.growth > 0 ? '↑' : '↓'} {Math.abs(cat.growth)}% growth
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
