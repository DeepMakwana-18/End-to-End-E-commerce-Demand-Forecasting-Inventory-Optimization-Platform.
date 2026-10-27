/** Glassmorphism chart container card. */

import { motion } from 'framer-motion';
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
  delay = 0,
  actions,
  headerVariant = 'default',
}: ChartCardProps) {
  if (headerVariant === 'tinted') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay, ease: [0.28, 0.11, 0.32, 1] }}
        className={cn('rounded-2xl border border-slate-200/90 dark:border-ds-hairline bg-white dark:bg-ds-surface shadow-2xs hover:shadow-xs transition-all duration-200 overflow-hidden flex flex-col', className)}
      >
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200/80 dark:border-ds-hairline bg-slate-50/70 dark:bg-ds-surface-sunken/60 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
          {children}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.28, 0.11, 0.32, 1] }}
      className={cn('rounded-2xl border border-slate-200/90 dark:border-ds-hairline bg-white dark:bg-ds-surface shadow-2xs hover:shadow-xs transition-all duration-200 p-5 sm:p-6', className)}
    >
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </motion.div>
  );
}


/** Skeleton loader for chart cards */
export function ChartCardSkeleton() {
  return (
    <div className="card-apple p-5 sm:p-6">
      <div className="skeleton h-4 w-32 mb-2 bg-ds-surface-sunken" />
      <div className="skeleton h-3 w-48 mb-4 bg-ds-surface-sunken" />
      <div className="skeleton h-64 w-full rounded-2xl bg-ds-surface-sunken" />
    </div>
  );
}
