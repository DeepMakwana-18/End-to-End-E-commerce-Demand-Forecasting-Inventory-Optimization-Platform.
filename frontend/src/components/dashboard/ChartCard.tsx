/** Flat editorial chart container card aligned with Titan AI Design.md. */

import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  actions?: React.ReactNode;
  headerVariant?: 'default' | 'tinted';
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  actions,
  headerVariant = 'default',
}: ChartCardProps) {
  if (headerVariant === 'tinted') {
    return (
      <div
        className={cn(
          'rounded-[12px] border border-ds-hairline bg-ds-surface overflow-hidden flex flex-col',
          className
        )}
      >
        <div className="px-4 py-3.5 sm:px-5 border-b border-ds-hairline bg-ds-surface flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ds-text-primary tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-xs text-ds-text-secondary mt-0.5 font-medium">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-start">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-[12px] border border-ds-hairline bg-ds-surface p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ds-text-primary tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-ds-text-secondary mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/** Skeleton loader for chart cards */
export function ChartCardSkeleton() {
  return (
    <div className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-5 sm:p-6">
      <div className="skeleton h-4 w-32 mb-2 bg-[#f1f1f3] dark:bg-[#18181b]" />
      <div className="skeleton h-3 w-48 mb-4 bg-[#f1f1f3] dark:bg-[#18181b]" />
      <div className="skeleton h-64 w-full rounded-[12px] bg-[#f1f1f3] dark:bg-[#18181b]" />
    </div>
  );
}
