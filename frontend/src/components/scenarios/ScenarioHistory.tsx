/** ScenarioHistory — full-width responsive grid of saved scenarios with rich metadata, status badges, and quick actions. */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Trash2, Clock, CheckCircle2, XCircle, Loader2,
  TrendingUp, TrendingDown, Minus, History, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Scenario } from '@/types/scenario';

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; badge: string }
> = {
  draft: {
    label: 'Draft',
    icon: Clock,
    color: 'text-slate-500 dark:text-ds-text-muted',
    bg: 'bg-slate-100 dark:bg-ds-surface-sunken border-slate-200 dark:border-ds-border',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-ds-surface-sunken dark:text-ds-text-muted dark:border-ds-hairline',
  },
  running: {
    label: 'Running',
    icon: Loader2,
    color: 'text-blue-600 dark:text-ds-blue-text',
    bg: 'bg-blue-50 dark:bg-ds-blue-surface border-blue-200 dark:border-ds-blue/20',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-ds-blue-surface dark:text-ds-blue-text dark:border-ds-blue/20',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-ds-green-text',
    bg: 'bg-emerald-50 dark:bg-ds-green-surface border-emerald-200 dark:border-ds-green/20',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-ds-green-surface dark:text-ds-green-text dark:border-ds-green/20',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-rose-600 dark:text-ds-red-text',
    bg: 'bg-rose-50 dark:bg-ds-red-surface border-rose-200 dark:border-ds-red/20',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-ds-red-surface dark:text-ds-red-text dark:border-ds-red/20',
  },
  archived: {
    label: 'Archived',
    icon: Trash2,
    color: 'text-slate-500 dark:text-ds-text-muted',
    bg: 'bg-slate-100 dark:bg-ds-surface-sunken border-slate-200 dark:border-ds-border',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-ds-surface-sunken dark:text-ds-text-muted dark:border-ds-hairline',
  },
};

const TYPE_LABELS: Record<string, string> = {
  demand_shock: 'Demand Shock',
  price_change: 'Price Change',
  supply_disruption: 'Supply Disruption',
  seasonal_shift: 'Seasonal Shift',
  custom: 'Custom Set',
};

interface Props {
  scenarios: Scenario[];
  activeId: number | null;
  isLoading: boolean;
  onSelect: (s: Scenario) => void;
  onRun: (id: number) => void;
  onDelete: (id: number) => void;
}

export function ScenarioHistory({
  scenarios, activeId, isLoading, onSelect, onRun, onDelete
}: Props) {
  if (isLoading) {
    return (
      <div className="card-apple p-5 sm:p-6 bg-white dark:bg-surface-900 border border-slate-200/90 dark:border-ds-border rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-ds-hairline">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-ds-surface-sunken animate-pulse" />
            <div className="h-5 w-36 bg-slate-200 dark:bg-ds-surface-sunken rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-slate-100 dark:bg-ds-surface-sunken animate-pulse border border-slate-200/60 dark:border-ds-hairline" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-apple p-5 sm:p-6 bg-white dark:bg-surface-900 border border-slate-200/90 dark:border-ds-border rounded-2xl shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-ds-hairline">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <History className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-ds-text-heading">
                Scenario History
              </h2>
              <span className="text-xs font-bold text-slate-600 dark:text-ds-text-secondary font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-ds-surface-sunken border border-slate-200 dark:border-ds-hairline">
                {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'saved scenarios'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-0.5">
              Select any past scenario to inspect projected demand trajectory and recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      {scenarios.length === 0 ? (
        <div className="text-center py-12 px-4 flex flex-col items-center justify-center rounded-xl bg-slate-50/50 dark:bg-ds-surface-sunken/20 border border-dashed border-slate-200 dark:border-ds-hairline">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-ds-blue-surface text-blue-600 dark:text-ds-blue flex items-center justify-center mb-3 shadow-2xs border border-blue-200/60 dark:border-ds-blue/20">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-ds-text-heading">No Saved Scenarios Yet</p>
          <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-1 max-w-sm leading-relaxed">
            Configure assumptions in the Scenario Builder above and run a simulation to preserve outcomes and comparisons here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence initial={false}>
            {scenarios.map((s, idx) => {
              const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.draft;
              const StatusIcon = cfg.icon;
              const result = s.latest_result;
              const delta = result?.demand_delta_pct ?? null;
              const isActive = s.id === activeId;

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onSelect(s)}
                  className={cn(
                    'group relative flex flex-col justify-between p-4 rounded-xl cursor-pointer',
                    'border transition-all duration-150 shadow-2xs',
                    isActive
                      ? 'bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-surface-800 border-blue-500 dark:border-blue-500/70 shadow-xs ring-2 ring-blue-500/25'
                      : 'bg-white dark:bg-surface-800/60 border-slate-200/90 dark:border-ds-hairline hover:bg-slate-50 dark:hover:bg-ds-surface-sunken hover:border-slate-300 dark:hover:border-ds-border hover:shadow-xs'
                  )}
                >
                  {/* Top Row: Status + Delta/Metric */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border', cfg.badge)}>
                        <StatusIcon className={cn('w-3 h-3', cfg.color, s.status === 'running' && 'animate-spin')} />
                        <span>{cfg.label}</span>
                      </div>

                      {/* Delta Badge */}
                      {delta !== null && s.status === 'completed' && (
                        <div className={cn(
                          'flex items-center gap-1 text-[11px] font-bold font-sans tabular-nums px-2 py-0.5 rounded-md border shadow-2xs',
                          delta > 0.5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-ds-green-surface dark:text-ds-green-text dark:border-ds-green/20' :
                          delta < -0.5 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-ds-red-surface dark:text-ds-red-text dark:border-ds-red/20' :
                          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-ds-surface-sunken dark:text-ds-text-muted dark:border-ds-border'
                        )}>
                          {delta > 0.5 ? <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-ds-green" /> :
                           delta < -0.5 ? <TrendingDown className="w-3 h-3 text-rose-600 dark:text-ds-red" /> :
                           <Minus className="w-3 h-3 text-slate-400" />}
                          <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Scenario Name (Full name, readable, no truncation) */}
                    <h3
                      className={cn(
                        'text-sm font-bold line-clamp-2 leading-snug tracking-tight mb-2',
                        isActive ? 'text-blue-700 dark:text-ds-blue-text' : 'text-slate-900 dark:text-ds-text-heading'
                      )}
                      title={s.name}
                    >
                      {s.name}
                    </h3>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-3">
                      <span className="font-semibold text-slate-600 dark:text-ds-text-secondary bg-slate-100 dark:bg-ds-surface-sunken border border-slate-200/80 dark:border-ds-hairline px-2 py-0.5 rounded-md">
                        {TYPE_LABELS[s.scenario_type] ?? s.scenario_type}
                      </span>
                      <span className="text-slate-400 dark:text-ds-text-muted font-mono font-medium">v{s.version}</span>
                      <span className="text-slate-300 dark:text-ds-text-muted">·</span>
                      <span className="text-slate-500 dark:text-ds-text-secondary font-medium">{s.horizon_weeks}w horizon</span>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-ds-hairline mt-auto">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-ds-blue group-hover:underline">
                      <Eye className="w-3 h-3" />
                      <span>{isActive ? 'Loaded' : 'Inspect'}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {s.status !== 'running' && (
                        <button
                          type="button"
                          id={`run-scenario-${s.id}`}
                          onClick={(e) => { e.stopPropagation(); onRun(s.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-ds-blue-surface dark:hover:bg-ds-blue dark:text-ds-blue-text dark:hover:text-white border border-blue-200/80 dark:border-ds-blue/20 transition-all shadow-2xs"
                          title="Run simulation"
                          aria-label={`Run simulation for ${s.name}`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      )}
                      <button
                        type="button"
                        id={`delete-scenario-${s.id}`}
                        onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-ds-surface-sunken dark:hover:bg-ds-red-surface dark:text-ds-text-muted dark:hover:text-ds-red-text border border-slate-200 dark:border-ds-hairline hover:border-rose-200 dark:hover:border-rose-500/20 transition-all shadow-2xs"
                        title="Archive scenario"
                        aria-label={`Archive scenario ${s.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
