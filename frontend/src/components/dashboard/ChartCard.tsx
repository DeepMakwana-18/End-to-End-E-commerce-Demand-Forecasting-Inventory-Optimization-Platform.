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
}

export function ChartCard({ title, subtitle, children, className, delay = 0, actions }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className={cn('glass-card p-5', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-surface-200">{title}</h3>
          {subtitle && (
            <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>
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
    <div className="glass-card p-5">
      <div className="skeleton h-4 w-32 mb-1" />
      <div className="skeleton h-3 w-48 mb-4" />
      <div className="skeleton h-64 w-full rounded-xl" />
    </div>
  );
}
