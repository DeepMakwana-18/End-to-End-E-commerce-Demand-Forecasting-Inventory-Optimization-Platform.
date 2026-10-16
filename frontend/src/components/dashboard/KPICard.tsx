/** Premium glassmorphism KPI card with micro-animations. */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  sub?: string;
  icon: React.ElementType;
  gradient?: string;
  glowColor?: string;
  delay?: number;
  loading?: boolean;
  className?: string;
  variant?: 'blue' | 'indigo' | 'teal' | 'emerald' | 'amber' | 'rose' | 'default';
}

const variantSurfaceMap: Record<string, string> = {
  blue: 'kpi-surface-blue',
  indigo: 'kpi-surface-indigo',
  teal: 'kpi-surface-teal',
  emerald: 'kpi-surface-teal',
  amber: 'kpi-surface-amber',
  rose: 'kpi-surface-rose',
  default: 'kpi-surface-gradient',
};

const variantIconMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/30', text: 'text-blue-700 dark:text-blue-300' },
  indigo: { bg: 'bg-indigo-100/80 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-500/30', text: 'text-indigo-700 dark:text-indigo-300' },
  teal: { bg: 'bg-teal-100/80 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 border-teal-200/60 dark:border-teal-500/30', text: 'text-teal-700 dark:text-teal-300' },
  emerald: { bg: 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300' },
  amber: { bg: 'bg-amber-100/80 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-300' },
  rose: { bg: 'bg-rose-100/80 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/30', text: 'text-rose-700 dark:text-rose-300' },
  default: { bg: 'bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/30', text: 'text-blue-700 dark:text-blue-300' },
};

export function KPICard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  sub,
  icon: Icon,
  gradient,
  glowColor,
  delay = 0,
  loading = false,
  className,
  variant,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;
  const displayValue = !value || value === 'No data' ? '—' : value;

  const detectedVariant = variant || (
    gradient?.includes('teal') || gradient?.includes('emerald') ? 'teal' :
    gradient?.includes('amber') || gradient?.includes('orange') ? 'amber' :
    gradient?.includes('red') || gradient?.includes('rose') ? 'rose' :
    gradient?.includes('indigo') ? 'indigo' :
    gradient?.includes('blue') ? 'blue' :
    'default'
  );

  const surfaceClass = variantSurfaceMap[detectedVariant] || 'kpi-surface-gradient';
  const iconStyle = variantIconMap[detectedVariant] || variantIconMap.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.28, 0.11, 0.32, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'card-apple card-apple-hover p-5 relative overflow-hidden group cursor-default h-full flex flex-col justify-between min-h-[142px] transition-all duration-200',
        surfaceClass,
        className
      )}
    >
      {/* Subtle glow effect on hover */}
      <div
        className={cn(
          'absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl pointer-events-none',
          gradient || 'bg-gradient-to-br from-blue-600 to-indigo-600'
        )}
      />

      <div className="flex items-start justify-between relative z-10 w-full gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-ds-text-muted uppercase tracking-wider mb-2 truncate">
            {title}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-24 my-0.5 rounded-lg" />
          ) : (
            <p className="text-2xl sm:text-[28px] font-bold font-sans tabular-nums tracking-tight text-slate-900 dark:text-ds-text-primary leading-none">
              {displayValue}
            </p>
          )}

          {change !== undefined ? (
            <div className="flex items-center gap-1.5 mt-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums border shadow-2xs',
                  isPositive && 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-ds-green-surface dark:text-ds-green-text dark:border-ds-green/20',
                  isNegative && 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-ds-red-surface dark:text-ds-red-text dark:border-ds-red/20',
                  isNeutral && 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-ds-surface-sunken dark:text-ds-text-muted dark:border-ds-border'
                )}
              >
                {isPositive && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                {isNegative && <TrendingDown className="w-3 h-3 text-rose-600" />}
                {isNeutral && <Minus className="w-3 h-3 text-slate-400" />}
                {isPositive && '+'}
                {change?.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500 dark:text-ds-text-muted font-medium truncate">{changeLabel}</span>
            </div>
          ) : sub ? (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-ds-border-control" />
              <span className="text-xs font-medium text-slate-500 dark:text-ds-text-muted truncate">{sub}</span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-ds-border-control" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-ds-text-muted">Live telemetry</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs border transition-transform duration-200 group-hover:scale-105',
            iconStyle.bg
          )}
        >
          <Icon className={cn('w-5 h-5', iconStyle.text)} />
        </div>
      </div>
    </motion.div>
  );
}
