/**
 * AnomalyFilterBar — Investigation toolbar
 * Redesigned for seamless desktop alignment without awkward wrapping:
 *  - Left: Search field + Severity filter + Type filter
 *  - Right: Show resolved toggle + Result count + Clear action + Refresh action
 */

import { motion } from 'framer-motion';
import { Search, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalyFilters, AnomalyType, AnomalySeverity } from '@/types/anomaly';

const SEVERITY_OPTIONS: { value: AnomalySeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TYPE_OPTIONS: { value: AnomalyType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'demand_spike', label: 'Demand Spike' },
  { value: 'demand_drop', label: 'Demand Drop' },
  { value: 'inventory_shock', label: 'Inventory Shock' },
  { value: 'forecast_miss', label: 'Forecast Miss' },
];

interface Props {
  filters: AnomalyFilters;
  onChange: (f: AnomalyFilters) => void;
  isLoading: boolean;
  onRefresh: () => void;
  total: number;
}

export function AnomalyFilterBar({ filters, onChange, isLoading, onRefresh, total }: Props) {
  const isDirty =
    filters.severity !== 'all' ||
    filters.anomaly_type !== 'all' ||
    filters.include_resolved ||
    filters.search !== '';

  const handleReset = () =>
    onChange({ severity: 'all', anomaly_type: 'all', include_resolved: false, search: '' });

  return (
    <div className="p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5">
      {/* Left group: Search + Filters */}
      <div className="flex items-center gap-2 flex-1 min-w-[280px]">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-ds-text-muted pointer-events-none" />
          <input
            id="anomaly-search"
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search explanations or dates…"
            className={cn(
              'w-full pl-8.5 pr-7 py-1.5 sm:py-2 bg-slate-50 dark:bg-ds-surface-sunken border border-slate-200/90 dark:border-ds-border rounded-xl',
              'text-xs sm:text-sm text-slate-900 dark:text-ds-text-heading placeholder:text-slate-400 dark:placeholder:text-ds-text-muted',
              'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
              'transition-all duration-200 shadow-2xs'
            )}
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-ds-text-secondary"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Severity filter */}
        <select
          id="filter-severity"
          value={filters.severity}
          onChange={(e) => onChange({ ...filters, severity: e.target.value as any })}
          className={cn(
            'px-2.5 py-1.5 sm:py-2 bg-slate-50 dark:bg-ds-surface-sunken border border-slate-200/90 dark:border-ds-border rounded-xl',
            'text-xs text-slate-800 dark:text-ds-text-secondary focus:outline-none focus:border-indigo-500',
            'transition-all duration-200 cursor-pointer shadow-2xs font-medium whitespace-nowrap'
          )}
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          id="filter-type"
          value={filters.anomaly_type}
          onChange={(e) => onChange({ ...filters, anomaly_type: e.target.value as any })}
          className={cn(
            'px-2.5 py-1.5 sm:py-2 bg-slate-50 dark:bg-ds-surface-sunken border border-slate-200/90 dark:border-ds-border rounded-xl',
            'text-xs text-slate-800 dark:text-ds-text-secondary focus:outline-none focus:border-indigo-500',
            'transition-all duration-200 cursor-pointer shadow-2xs font-medium whitespace-nowrap'
          )}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Right group: Toggle + Count + Clear + Refresh */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Show resolved toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none group" htmlFor="toggle-resolved">
          <div
            id="toggle-resolved"
            role="switch"
            aria-checked={filters.include_resolved}
            onClick={() => onChange({ ...filters, include_resolved: !filters.include_resolved })}
            className={cn(
              'relative w-9 h-5 rounded-full border transition-all duration-200 cursor-pointer flex-shrink-0',
              filters.include_resolved
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-slate-200 dark:bg-ds-surface-sunken border-slate-300 dark:border-ds-border'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200 shadow-xs bg-white',
                filters.include_resolved
                  ? 'left-4.5'
                  : 'left-0.5'
              )}
            />
          </div>
          <span className="text-xs text-slate-600 dark:text-ds-text-secondary group-hover:text-slate-900 dark:group-hover:text-ds-text-heading transition-colors whitespace-nowrap font-medium">
            Show resolved
          </span>
        </label>

        {/* Clear filter button */}
        {isDirty && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            id="reset-filters"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-medium"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </motion.button>
        )}

        {/* Result count */}
        <span className="text-xs text-slate-500 dark:text-ds-text-muted font-mono font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-ds-surface-sunken border border-slate-200/60 dark:border-ds-border whitespace-nowrap">
          {total} result{total !== 1 ? 's' : ''}
        </span>

        {/* Refresh button */}
        <button
          id="refresh-anomalies"
          onClick={onRefresh}
          disabled={isLoading}
          className="btn-apple btn-apple-soft text-xs h-9 px-3.5 flex items-center gap-1.5 shadow-2xs border border-slate-200 dark:border-ds-border rounded-xl whitespace-nowrap"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
