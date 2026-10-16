/** ScenarioHistory — list of saved scenarios with status badges and quick-run. */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Trash2, Clock, CheckCircle2, XCircle, Loader2,
  ChevronRight, TrendingUp, TrendingDown, Minus, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Scenario } from '@/types/scenario';

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  draft: {
    label: 'Draft',
    icon: Clock,
    color: 'text-ds-text-muted',
    bg: 'bg-ds-surface-sunken border-ds-border',
  },
  running: {
    label: 'Running',
    icon: Loader2,
    color: 'text-ds-blue-text',
    bg: 'bg-ds-blue-surface border-ds-blue/20',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-ds-green-text',
    bg: 'bg-ds-green-surface border-ds-green/20',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-ds-red-text',
    bg: 'bg-ds-red-surface border-ds-red/20',
  },
  archived: {
    label: 'Archived',
    icon: Trash2,
    color: 'text-ds-text-muted',
    bg: 'bg-ds-surface-sunken border-ds-border',
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
      <div className="card-apple p-4 bg-white dark:bg-surface-900 border border-ds-border shadow-xs">
        <p className="text-[11px] text-ds-text-muted mb-3 font-bold uppercase tracking-wider">
          Scenario History
        </p>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 skeleton rounded-xl bg-ds-surface-sunken" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-apple p-4 flex flex-col h-full bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9]/60 dark:from-surface-900 dark:to-surface-950 border border-ds-border shadow-xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ds-hairline">
        <p className="text-[11px] text-ds-text-primary font-bold uppercase tracking-wider">
          Scenario History
        </p>
        <span className="text-[10px] text-ds-text-muted font-mono font-medium px-2 py-0.5 rounded-full bg-ds-surface-sunken border border-ds-hairline">
          {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'}
        </span>
      </div>

      {scenarios.length === 0 ? (
        <div className="text-center py-10 px-2 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-ds-blue-surface text-ds-blue flex items-center justify-center mb-3 shadow-2xs border border-ds-blue/20">
            <History className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-ds-text-primary">No Saved Scenarios</p>
          <p className="text-[11px] text-ds-text-muted mt-1 max-w-[200px] leading-relaxed">
            Configure parameters in the builder and run a simulation to record outcomes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-0.5">
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
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onSelect(s)}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer',
                    'border transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/30 border-blue-400 dark:border-blue-500/50 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-white dark:bg-surface-800/60 border-ds-hairline hover:bg-ds-surface-sunken hover:border-ds-border hover:shadow-2xs'
                  )}
                >
                  {/* Status indicator */}
                  <div className={cn('flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center', cfg.bg)}>
                    <StatusIcon
                      className={cn('w-3 h-3', cfg.color, s.status === 'running' && 'animate-spin')}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-bold truncate', isActive ? 'text-ds-blue-text' : 'text-ds-text-primary')}>
                      {s.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-ds-text-secondary bg-ds-surface-sunken border border-ds-hairline px-1.5 py-0.5 rounded-md">
                        {TYPE_LABELS[s.scenario_type] ?? s.scenario_type}
                      </span>
                      <span className="text-[10px] text-ds-text-muted font-mono">v{s.version}</span>
                      <span className="text-[10px] text-ds-text-muted">·</span>
                      <span className="text-[10px] text-ds-text-muted font-medium">{s.horizon_weeks}w</span>
                    </div>
                  </div>

                  {/* Delta badge */}
                  {delta !== null && s.status === 'completed' && (
                    <div className={cn(
                      'flex items-center gap-0.5 text-[10px] font-bold font-sans tabular-nums px-2 py-0.5 rounded-md border',
                      delta > 0.5 ? 'bg-ds-green-surface text-ds-green-text border-ds-green/20' :
                      delta < -0.5 ? 'bg-ds-red-surface text-ds-red-text border-ds-red/20' :
                      'bg-ds-surface-sunken text-ds-text-muted border-ds-border'
                    )}>
                      {delta > 0.5 ? <TrendingUp className="w-2.5 h-2.5 text-ds-green" /> :
                       delta < -0.5 ? <TrendingDown className="w-2.5 h-2.5 text-ds-red" /> :
                       <Minus className="w-2.5 h-2.5 text-ds-text-muted" />}
                      <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
                    </div>
                  )}

                  {/* Action buttons (visible on hover or active) */}
                  <div className={cn(
                    'flex items-center gap-1 transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}>
                    {s.status !== 'running' && (
                      <button
                        id={`run-scenario-${s.id}`}
                        onClick={(e) => { e.stopPropagation(); onRun(s.id); }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-ds-blue-surface hover:bg-ds-blue text-ds-blue-text hover:text-white border border-ds-blue/20 transition-all shadow-2xs"
                        title="Run simulation"
                      >
                        <Play className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <button
                      id={`delete-scenario-${s.id}`}
                      onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-ds-surface-sunken hover:bg-ds-red-surface text-ds-text-muted hover:text-ds-red-text border border-ds-hairline hover:border-ds-red/20 transition-all shadow-2xs"
                      title="Archive scenario"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-ds-blue flex-shrink-0" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
