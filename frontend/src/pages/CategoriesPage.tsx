/** Category Analytics Page - Category demand, growth, and seasonal analysis. */

import { motion } from 'framer-motion';
import { PieChart as PieIcon, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn, formatNumber } from '@/lib/utils';

const categoryData = [
  { name: 'Electronics', value: 35, demand: 5230, growth: 15.7, color: '#6366f1' },
  { name: 'Fashion', value: 25, demand: 3680, growth: 14.6, color: '#10b981' },
  { name: 'Home & Garden', value: 18, demand: 1980, growth: -5.7, color: '#f59e0b' },
  { name: 'Sports', value: 12, demand: 1820, growth: 16.7, color: '#06b6d4' },
  { name: 'Books', value: 10, demand: 950, growth: 6.7, color: '#8b5cf6' },
];

const seasonalByCategory = [
  { quarter: 'Q1', Electronics: 4200, Fashion: 3100, 'Home & Garden': 1800, Sports: 1200, Books: 800 },
  { quarter: 'Q2', Electronics: 4800, Fashion: 3500, 'Home & Garden': 2200, Sports: 1600, Books: 750 },
  { quarter: 'Q3', Electronics: 5100, Fashion: 2800, 'Home & Garden': 1900, Sports: 2100, Books: 900 },
  { quarter: 'Q4', Electronics: 6500, Fashion: 4200, 'Home & Garden': 2500, Sports: 1500, Books: 1200 },
];

const radarData = [
  { metric: 'Demand', Electronics: 95, Fashion: 78, Sports: 62 },
  { metric: 'Growth', Electronics: 82, Fashion: 75, Sports: 88 },
  { metric: 'Margin', Electronics: 70, Fashion: 85, Sports: 65 },
  { metric: 'Velocity', Electronics: 88, Fashion: 72, Sports: 58 },
  { metric: 'Forecast', Electronics: 92, Fashion: 80, Sports: 70 },
  { metric: 'Health', Electronics: 78, Fashion: 82, Sports: 75 },
];

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Category Analytics</h1>
        <p className="text-sm text-surface-500 mt-1">Category demand distribution, growth & seasonal analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Categories" value="5" icon={Layers} gradient="gradient-primary" delay={0} />
        <KPICard title="Top Category" value="Electronics" icon={PieIcon} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Avg Growth" value="9.6%" change={4.2} icon={TrendingUp} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Total Demand" value={formatNumber(13660)} change={8.1} icon={BarChart3} gradient="bg-cyan-500" delay={0.15} />
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
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(63,63,70,0.4)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
              <Radar name="Electronics" dataKey="Electronics" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Fashion" dataKey="Fashion" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
              <Radar name="Sports" dataKey="Sports" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '12px', fontSize: '12px' }} />
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
            <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '12px', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="Electronics" stackId="a" fill="#6366f1" radius={[0,0,0,0]} />
            <Bar dataKey="Fashion" stackId="a" fill="#10b981" />
            <Bar dataKey="Home & Garden" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Sports" stackId="a" fill="#06b6d4" />
            <Bar dataKey="Books" stackId="a" fill="#8b5cf6" radius={[6,6,0,0]} />
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
            <p className="text-xl font-bold text-white">{formatNumber(cat.demand)}</p>
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
