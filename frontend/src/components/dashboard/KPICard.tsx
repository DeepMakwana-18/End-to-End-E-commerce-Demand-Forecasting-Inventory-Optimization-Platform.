/** Flat editorial KPI card aligned with Titan AI Design.md. */

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
  emphasized?: boolean;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  sub,
  icon: Icon,
  loading = false,
  className,
  invertChange = false,
  emphasized = false,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  // When invertChange is true (e.g. RMSE, defect rate), a negative change is favorable/good
  const isFavorable = invertChange ? isNegative : isPositive;
  const isUnfavorable = invertChange ? isPositive : isNegative;
  const displayValue = !value || value === 'No data' ? '—' : value;

  return (
    <div className={cn('titan-kpi-wrap', emphasized && 'titan-kpi-wrap--emphasized')}>
      <div
        className={cn(
          'titan-kpi-card rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-5 flex flex-col justify-between min-h-[138px]',
          className
        )}
      >
        <div className="flex items-start justify-between w-full gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em] mb-2 truncate">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-24 my-0.5 rounded-lg" />
            ) : (
              <p className="text-2xl sm:text-[28px] font-bold font-sans tabular-nums tracking-[-0.02em] text-[#0a0a0a] dark:text-[#fafaf9] leading-none">
                {displayValue}
              </p>
            )}

            {change !== undefined ? (
              <div className="flex items-center gap-1.5 mt-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums border',
                    isFavorable && 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60',
                    isUnfavorable && 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60',
                    isNeutral && 'bg-[#f1f1f3] text-[#3f3f46] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]'
                  )}
                >
                  {isPositive && <TrendingUp className="w-3 h-3" aria-hidden="true" />}
                  {isNegative && <TrendingDown className="w-3 h-3" aria-hidden="true" />}
                  {isNeutral && <Minus className="w-3 h-3" aria-hidden="true" />}
                  {isPositive && '+'}
                  {change?.toFixed(1)}%
                </span>
                <span className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium truncate">{changeLabel}</span>
              </div>
            ) : sub ? (
              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    emphasized ? 'bg-[#f59e0b]' : 'bg-[#a1a1aa] dark:bg-[#52525b]'
                  )}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] truncate">{sub}</span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a1a1aa] dark:bg-[#52525b] flex-shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium text-[#52525b] dark:text-[#a1a1aa]">Live telemetry</span>
              </div>
            )}
          </div>

          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[#f1f1f3] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9]"
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
