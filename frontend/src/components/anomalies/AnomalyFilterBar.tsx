/** AnomalyFilters — filter bar for the anomaly table. */

import { motion } from 'framer-motion';
import { Search, X, Filter, RefreshCw } from 'lucide-react';
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
    <div className="glass-card p-3 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
        <input
          id="anomaly-search"
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search explanations…"
          className={cn(
            'w-full pl-8 pr-3 py-2 bg-surface-900/60 border border-surface-700/60 rounded-xl',
            'text-sm text-surface-100 placeholder-surface-500',
            'focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20',
            'transition-all duration-200'
          )}
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Severity filter */}
      <select
        id="filter-severity"
        value={filters.severity}
        onChange={(e) => onChange({ ...filters, severity: e.target.value as any })}
        className={cn(
          'px-3 py-2 bg-surface-900/60 border border-surface-700/60 rounded-xl',
          'text-sm text-surface-100 focus:outline-none focus:border-primary-500/60',
          'transition-all duration-200 cursor-pointer'
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
          'px-3 py-2 bg-surface-900/60 border border-surface-700/60 rounded-xl',
          'text-sm text-surface-100 focus:outline-none focus:border-primary-500/60',
          'transition-all duration-200 cursor-pointer'
        )}
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Show resolved toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none group" htmlFor="toggle-resolved">
        <div
          id="toggle-resolved"
          role="switch"
          aria-checked={filters.include_resolved}
          onClick={() => onChange({ ...filters, include_resolved: !filters.include_resolved })}
          className={cn(
            'relative w-9 h-5 rounded-full border transition-all duration-200 cursor-pointer',
            filters.include_resolved
              ? 'bg-primary-500/30 border-primary-500/50'
              : 'bg-surface-800 border-surface-700/60'
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow',
              filters.include_resolved
                ? 'left-4 bg-primary-400'
                : 'left-0.5 bg-surface-500'
            )}
          />
        </div>
        <span className="text-xs text-surface-400 group-hover:text-surface-200 transition-colors">
          Show resolved
        </span>
      </label>

      {/* Count */}
      <span className="text-xs text-surface-600 font-mono ml-auto">
        {total} result{total !== 1 ? 's' : ''}
      </span>

      {/* Reset */}
      {isDirty && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          id="reset-filters"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-surface-400 hover:text-danger-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </motion.button>
      )}

      {/* Refresh */}
      <button
        id="refresh-anomalies"
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-surface-700/60 text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-all duration-200"
      >
        <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        Refresh
      </button>
    </div>
  );
}
