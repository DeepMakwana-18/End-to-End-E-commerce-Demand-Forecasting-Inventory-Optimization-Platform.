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
          'titan-kpi-card rounded-[12px] border border-ds-hairline bg-ds-surface p-4 flex flex-col justify-start',
          className
        )}
      >
        <div className="flex items-start justify-between w-full gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-ds-text-secondary leading-snug mb-1.5">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-24 my-0.5 rounded-lg" />
            ) : (
              <p className="text-[22px] sm:text-[26px] font-semibold font-sans tabular-nums tracking-[-0.02em] text-ds-text-primary leading-tight">
                {displayValue}
              </p>
            )}

            {change !== undefined ? (
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums border',
                    isFavorable && 'bg-ds-green-surface text-ds-green-text border-ds-green/25',
                    isUnfavorable && 'bg-ds-red-surface text-ds-red-text border-ds-red/25',
                    isNeutral && 'bg-ds-surface-sunken text-ds-text-secondary border-ds-hairline'
                  )}
                >
                  {isPositive && <TrendingUp className="w-3 h-3" aria-hidden="true" />}
                  {isNegative && <TrendingDown className="w-3 h-3" aria-hidden="true" />}
                  {isNeutral && <Minus className="w-3 h-3" aria-hidden="true" />}
                  {isPositive && '+'}
                  {change?.toFixed(1)}%
                </span>
                <span className="text-xs text-ds-text-secondary font-medium truncate">{changeLabel}</span>
              </div>
            ) : sub ? (
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    emphasized ? 'bg-ds-amber' : 'bg-ds-gray-400'
                  )}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-ds-text-secondary leading-snug">{sub}</span>
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              'w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 border',
              emphasized
                ? 'bg-ds-orange-surface border-ds-amber/30 text-ds-orange-text'
                : 'bg-ds-surface-sunken border-ds-hairline text-ds-text-primary'
            )}
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
