/** Premium glassmorphism KPI card with micro-animations. */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  gradient: string;
  glowColor?: string;
  delay?: number;
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
}: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = !change || change === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="glass-card p-5 relative overflow-hidden group cursor-default"
    >
      {/* Gradient glow effect on hover */}
      <div
        className={cn(
          'absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl',
          gradient
        )}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
            {title}
          </p>
          <p className="text-2xl font-bold text-white tracking-tight">
            {value}
          </p>

          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              {isPositive && <TrendingUp className="w-3.5 h-3.5 text-accent-400" />}
              {isNegative && <TrendingDown className="w-3.5 h-3.5 text-danger-400" />}
              {isNeutral && <Minus className="w-3.5 h-3.5 text-surface-500" />}
              <span
                className={cn(
                  'text-xs font-semibold',
                  isPositive && 'text-accent-400',
                  isNegative && 'text-danger-400',
                  isNeutral && 'text-surface-500'
                )}
              >
                {isPositive && '+'}
                {change?.toFixed(1)}%
              </span>
              <span className="text-xs text-surface-500">{changeLabel}</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
            'shadow-lg',
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
