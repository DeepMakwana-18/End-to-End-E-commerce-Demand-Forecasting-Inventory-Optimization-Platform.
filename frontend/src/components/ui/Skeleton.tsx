/**
 * Skeleton — Animated loading placeholder components.
 *
 * Provides reusable skeletons for cards, tables, charts, and text.
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-ds-surface-sunken border border-ds-hairline/50 rounded-xl ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl bg-ds-surface border border-ds-hairline shadow-[var(--ds-raise-1)] space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl bg-ds-surface border border-ds-hairline shadow-[var(--ds-raise-1)] overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-ds-hairline bg-ds-surface-alt">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-ds-hairline last:border-0">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

const CHART_BAR_HEIGHTS = [45, 72, 58, 88, 64, 92, 52, 78, 84, 60, 74, 48];

export function SkeletonChart() {
  return (
    <div className="p-5 sm:p-6 rounded-[12px] bg-ds-surface border border-ds-hairline space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex items-end gap-2 h-48">
        {CHART_BAR_HEIGHTS.map((height, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${height}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonKPIRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
