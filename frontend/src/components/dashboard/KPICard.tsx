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
  invertChange?: boolean;
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
  blue: { bg: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] dark:bg-blue-950/60 dark:border-blue-500/30 dark:text-blue-300', text: 'text-[#1D4ED8] dark:text-blue-300' },
  indigo: { bg: 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4338CA] dark:bg-indigo-950/60 dark:border-indigo-500/30 dark:text-indigo-300', text: 'text-[#4338CA] dark:text-indigo-300' },
  teal: { bg: 'bg-[#F0FDFA] border-[#99F6E4] text-[#0F766E] dark:bg-teal-950/60 dark:border-teal-500/30 dark:text-teal-300', text: 'text-[#0F766E] dark:text-teal-300' },
  emerald: { bg: 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] dark:bg-emerald-950/60 dark:border-emerald-500/30 dark:text-emerald-300', text: 'text-[#065F46] dark:text-emerald-300' },
  amber: { bg: 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309] dark:bg-amber-950/60 dark:border-amber-500/30 dark:text-amber-300', text: 'text-[#B45309] dark:text-amber-300' },
  rose: { bg: 'bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C] dark:bg-rose-950/60 dark:border-rose-500/30 dark:text-rose-300', text: 'text-[#BE123C] dark:text-rose-300' },
  default: { bg: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] dark:bg-blue-950/60 dark:border-blue-500/30 dark:text-blue-300', text: 'text-[#1D4ED8] dark:text-blue-300' },
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
  invertChange = false,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  // When invertChange is true (e.g. RMSE, defect rate), a negative change is favorable/good
  const isFavorable = invertChange ? isNegative : isPositive;
  const isUnfavorable = invertChange ? isPositive : isNegative;
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
        'card-apple card-apple-hover p-5 relative overflow-hidden group cursor-default h-full flex flex-col justify-between min-h-[142px] transition-all duration-200 shadow-2xs hover:shadow-xs',
        surfaceClass,
        className
      )}
    >
      {/* Soft subtle highlight on hover */}
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-slate-200/25 dark:bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl pointer-events-none"
      />

      <div className="flex items-start justify-between relative z-10 w-full gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 truncate">
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
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums border shadow-2xs',
                  isFavorable && 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30',
                  isUnfavorable && 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30',
                  isNeutral && 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-ds-surface-sunken dark:text-ds-text-secondary dark:border-ds-border'
                )}
              >
                {isPositive && <TrendingUp className={cn('w-3 h-3', isFavorable ? 'text-[#059669] dark:text-emerald-400' : 'text-[#E11D48] dark:text-rose-400')} />}
                {isNegative && <TrendingDown className={cn('w-3 h-3', isFavorable ? 'text-[#059669] dark:text-emerald-400' : 'text-[#E11D48] dark:text-rose-400')} />}
                {isNeutral && <Minus className="w-3 h-3 text-slate-400 dark:text-slate-500" />}
                {isPositive && '+'}
                {change?.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{changeLabel}</span>
            </div>
          ) : sub ? (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{sub}</span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Live telemetry</span>
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
