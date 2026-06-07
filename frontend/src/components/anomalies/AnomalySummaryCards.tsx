/** AnomalySummaryCards — 4-up KPI strip at the top of the Anomalies page. */

import { motion } from 'framer-motion';
import {
  Flame, AlertTriangle, Info, Activity,
  TrendingUp, TrendingDown, Package, BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalySummary } from '@/types/anomaly';

interface StatCardProps {
  label: string;
  value: number;
  icon: any;
  color: string;
  bg: string;
  border: string;
  delay?: number;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, color, bg, border, delay = 0, subtitle }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn('glass-card p-4 flex items-start gap-3 border', border)}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
        <Icon className={cn('w-4.5 h-4.5', color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-0.5">{label}</p>
        <p className={cn('text-2xl font-black font-mono tabular-nums', color)}>{value}</p>
        {subtitle && <p className="text-[10px] text-surface-600 mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

interface Props {
  summary: AnomalySummary | null;
  isLoading: boolean;
}

export function AnomalySummaryCards({ summary, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-4 h-24 skeleton" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <StatCard
        label="Critical"
        value={summary.critical_count}
        icon={Flame}
        color="text-danger-400"
        bg="bg-danger-500/10"
        border="border-danger-500/20"
        subtitle={`${summary.total_active} total active`}
        delay={0}
      />
      <StatCard
        label="Medium"
        value={summary.medium_count}
        icon={AlertTriangle}
        color="text-warning-400"
        bg="bg-warning-500/10"
        border="border-warning-500/20"
        delay={0.06}
      />
      <StatCard
        label="Low"
        value={summary.low_count}
        icon={Info}
        color="text-primary-400"
        bg="bg-primary-500/10"
        border="border-primary-500/20"
        delay={0.12}
      />
      <StatCard
        label="All Active"
        value={summary.total_active}
        icon={Activity}
        color="text-surface-200"
        bg="bg-surface-800/60"
        border="border-surface-700/40"
        subtitle={summary.latest_detected_at
          ? `Last: ${new Date(summary.latest_detected_at).toLocaleDateString()}`
          : 'No anomalies yet'}
        delay={0.18}
      />
    </div>
  );
}

// ── Type breakdown strip ──────────────────────────────────────────────

interface TypeBreakdownProps {
  summary: AnomalySummary | null;
  isLoading: boolean;
}

export function AnomalyTypeBreakdown({ summary, isLoading }: TypeBreakdownProps) {
  if (!summary || isLoading) return null;

  const items = [
    { label: 'Demand Spikes', value: summary.demand_spikes, icon: TrendingUp, color: 'text-accent-400', bg: 'bg-accent-500/10' },
    { label: 'Demand Drops', value: summary.demand_drops, icon: TrendingDown, color: 'text-danger-400', bg: 'bg-danger-500/10' },
    { label: 'Inventory Shocks', value: summary.inventory_shocks, icon: Package, color: 'text-warning-400', bg: 'bg-warning-500/10' },
    { label: 'Forecast Misses', value: summary.forecast_misses, icon: BarChart2, color: 'text-primary-400', bg: 'bg-primary-500/10' },
  ];

  const total = summary.total_active || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="glass-card p-4"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-3">
        By Type — Active Anomalies
      </p>
      <div className="flex flex-col gap-2.5">
        {items.map(({ label, value, icon: Icon, color, bg }) => {
          const pct = Math.round((value / total) * 100);
          return (
            <div key={label} className="flex items-center gap-3">
              <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-3 h-3', color)} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-surface-300 font-medium">{label}</span>
                  <span className={cn('text-xs font-bold font-mono', color)}>{value}</span>
                </div>
                <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className={cn('h-full rounded-full bg-gradient-to-r', {
                      'from-accent-600 to-accent-400': color === 'text-accent-400',
                      'from-danger-600 to-danger-400': color === 'text-danger-400',
                      'from-warning-600 to-warning-400': color === 'text-warning-400',
                      'from-primary-600 to-primary-400': color === 'text-primary-400',
                    })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
