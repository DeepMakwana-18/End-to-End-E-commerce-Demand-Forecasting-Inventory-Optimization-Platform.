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
  icon: React.ElementType;
  gradient: string;
  glowColor?: string;
  delay?: number;
  loading?: boolean;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon: Icon,
  gradient,
  glowColor,
  delay = 0,
  loading = false,
  className,
}: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = !change || change === 0;
  const displayValue = !value || value === 'No data' ? '—' : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.28, 0.11, 0.32, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'card-apple card-apple-hover kpi-surface-gradient p-5 relative overflow-hidden group cursor-default h-full flex flex-col justify-between min-h-[136px]',
        className
      )}
    >
      {/* Subtle glow effect on hover */}
      <div
        className={cn(
          'absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl pointer-events-none',
          gradient
        )}
      />

      <div className="flex items-start justify-between relative z-10 w-full gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-ds-text-muted uppercase tracking-wider mb-2 truncate">
            {title}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-24 my-0.5 rounded-lg" />
          ) : (
            <p className="text-2xl sm:text-[26px] font-bold font-sans tabular-nums tracking-tight text-ds-text-primary leading-none">
              {displayValue}
            </p>
          )}

          {change !== undefined ? (
            <div className="flex items-center gap-1.5 mt-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums border',
                  isPositive && 'bg-ds-green-surface text-ds-green-text border-ds-green/20',
                  isNegative && 'bg-ds-red-surface text-ds-red-text border-ds-red/20',
                  isNeutral && 'bg-ds-surface-sunken text-ds-text-muted border-ds-border'
                )}
              >
                {isPositive && <TrendingUp className="w-3 h-3 text-ds-green" />}
                {isNegative && <TrendingDown className="w-3 h-3 text-ds-red" />}
                {isNeutral && <Minus className="w-3 h-3 text-ds-text-muted" />}
                {isPositive && '+'}
                {change?.toFixed(1)}%
              </span>
              <span className="text-xs text-ds-text-muted font-medium truncate">{changeLabel}</span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ds-border-control" />
              <span className="text-[11px] font-medium text-ds-text-muted">Live telemetry</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105',
            gradient
          )}
          style={glowColor ? { boxShadow: `0 4px 14px ${glowColor}` } : undefined}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}
