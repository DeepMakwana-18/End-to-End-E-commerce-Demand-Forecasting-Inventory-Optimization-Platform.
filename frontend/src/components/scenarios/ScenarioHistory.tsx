/** ScenarioHistory — list of saved scenarios with status badges and quick-run. */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Trash2, Clock, CheckCircle2, XCircle, Loader2,
  ChevronRight, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { Scenario } from '@/types/scenario';

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string }
> = {
  draft: {
    label: 'Draft',
    icon: Clock,
    color: 'text-surface-400',
    bg: 'bg-surface-800/60 border-surface-700/40',
  },
  running: {
    label: 'Running',
    icon: Loader2,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10 border-primary-500/20',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-accent-400',
    bg: 'bg-accent-500/8 border-accent-500/20',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-danger-400',
    bg: 'bg-danger-500/8 border-danger-500/20',
  },
  archived: {
    label: 'Archived',
    icon: Trash2,
    color: 'text-surface-600',
    bg: 'bg-surface-800/30 border-surface-700/20',
  },
};

const TYPE_LABELS: Record<string, string> = {
  demand_shock: 'Demand Shock',
  price_change: 'Price Change',
  supply_disruption: 'Supply',
  seasonal_shift: 'Seasonal',
  custom: 'Custom',
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
      <div className="glass-card p-4">
        <p className="text-xs text-surface-500 mb-3 font-semibold uppercase tracking-widest">
          Scenario History
        </p>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-surface-500 font-semibold uppercase tracking-widest">
          Scenario History
        </p>
        <span className="text-[10px] text-surface-600 font-mono">
          {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
        </span>
      </div>

      {scenarios.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-surface-600">No scenarios yet.</p>
          <p className="text-[10px] text-surface-700 mt-1">Create your first What-If scenario above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
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
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => onSelect(s)}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer',
                    'border transition-all duration-200',
                    isActive
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : 'border-surface-800/50 hover:bg-surface-800/40 hover:border-surface-700/60'
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
                    <p className={cn('text-xs font-semibold truncate', isActive ? 'text-primary-300' : 'text-surface-200')}>
                      {s.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-surface-600 bg-surface-800/60 px-1.5 py-0.5 rounded-md">
                        {TYPE_LABELS[s.scenario_type] ?? s.scenario_type}
                      </span>
                      <span className="text-[10px] text-surface-700">v{s.version}</span>
                      <span className="text-[10px] text-surface-700">·</span>
                      <span className="text-[10px] text-surface-600">{s.horizon_weeks}w</span>
                    </div>
                  </div>

                  {/* Delta badge */}
                  {delta !== null && s.status === 'completed' && (
                    <div className={cn(
                      'flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md',
                      delta > 0.5 ? 'text-accent-400 bg-accent-500/10' :
                      delta < -0.5 ? 'text-danger-400 bg-danger-500/10' :
                      'text-surface-400 bg-surface-800/60'
                    )}>
                      {delta > 0.5 ? <TrendingUp className="w-2.5 h-2.5" /> :
                       delta < -0.5 ? <TrendingDown className="w-2.5 h-2.5" /> :
                       <Minus className="w-2.5 h-2.5" />}
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
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
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary-500/15 hover:bg-primary-500/30 text-primary-400 transition-colors"
                        title="Run simulation"
                      >
                        <Play className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <button
                      id={`delete-scenario-${s.id}`}
                      onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-danger-500/15 text-surface-600 hover:text-danger-400 transition-colors"
                      title="Archive scenario"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-primary-400 flex-shrink-0" />
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
