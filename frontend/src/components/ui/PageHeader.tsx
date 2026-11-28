import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared compact page header matching the accepted Dashboard and Inventory baseline.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'pb-4 border-b border-ds-hairline flex flex-col sm:flex-row sm:items-end justify-between gap-3',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] sm:text-2xl font-semibold text-ds-text-primary tracking-[-0.02em] leading-[1.2]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ds-text-secondary mt-1">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-end flex-shrink-0 relative z-20">
          {actions}
        </div>
      )}
    </header>
  );
}
