/**
 * AnomalyFilterBar — Investigation toolbar
 * Spacious responsive layout so Search, Severity, Type, Show resolved, Count, and Refresh never clip.
 */

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
    <div className="p-3 sm:p-4 rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Left group: Search + Filters */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1 min-w-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b] dark:text-[#a1a1aa] pointer-events-none" aria-hidden="true" />
          <input
            id="anomaly-search"
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search explanations, types, or dates…"
            aria-label="Search anomalies"
            className={cn(
              'w-full pl-9 pr-8 py-2 bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[10px]',
              'text-xs sm:text-sm text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#52525b] dark:placeholder:text-[#a1a1aa]',
              'focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20 transition-colors duration-150'
            )}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Severity filter */}
        <select
          id="filter-severity"
          aria-label="Filter by severity"
          value={filters.severity}
          onChange={(e) => onChange({ ...filters, severity: e.target.value as AnomalySeverity | 'all' })}
          className={cn(
            'px-3 py-2 bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[10px]',
            'text-xs text-[#0a0a0a] dark:text-[#fafaf9] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20',
            'cursor-pointer font-semibold whitespace-nowrap'
          )}
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          id="filter-type"
          aria-label="Filter by anomaly type"
          value={filters.anomaly_type}
          onChange={(e) => onChange({ ...filters, anomaly_type: e.target.value as AnomalyType | 'all' })}
          className={cn(
            'px-3 py-2 bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[10px]',
            'text-xs text-[#0a0a0a] dark:text-[#fafaf9] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20',
            'cursor-pointer font-semibold whitespace-nowrap'
          )}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Right group: Toggle + Count + Clear + Refresh */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 flex-shrink-0">
        {/* Show resolved toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none" htmlFor="toggle-resolved">
          <button
            id="toggle-resolved"
            type="button"
            role="switch"
            aria-checked={filters.include_resolved}
            onClick={() => onChange({ ...filters, include_resolved: !filters.include_resolved })}
            className={cn(
              'relative w-9 h-5 rounded-full border transition-colors duration-150 cursor-pointer flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
              filters.include_resolved
                ? 'bg-[#1e3fc8] border-[#1e3fc8]'
                : 'bg-[#e4e4e7] dark:bg-[#27272a] border-[#d4d4d8] dark:border-[#3f3f46]'
            )}
          >
            <span
              className={cn(
                'block w-3.5 h-3.5 rounded-full transition-transform duration-150 bg-white shadow-xs',
                filters.include_resolved ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </button>
          <span className="text-xs text-[#0a0a0a] dark:text-[#fafaf9] whitespace-nowrap font-semibold">
            Show resolved
          </span>
        </label>

        {isDirty && (
          <button
            id="reset-filters"
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-[8px] text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-semibold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>
        )}

        <span className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-mono font-semibold px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] whitespace-nowrap tabular-nums">
          {total} result{total !== 1 ? 's' : ''}
        </span>

        <button
          id="refresh-anomalies"
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] hover:bg-[#fafaf9] dark:hover:bg-[#18181b] transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa]', isLoading && 'animate-spin')} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
