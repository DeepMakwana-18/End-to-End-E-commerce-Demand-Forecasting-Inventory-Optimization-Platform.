/** ScenarioHistory — responsive grid of saved scenarios with timestamps, outcomes, and accessible actions. */

import {
  Play, Trash2, Clock, CheckCircle2, XCircle, Loader2,
  TrendingUp, TrendingDown, Minus, History, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Scenario } from '@/types/scenario';

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; badge: string }
> = {
  draft: {
    label: 'Draft',
    icon: Clock,
    color: 'text-[#52525b] dark:text-[#a1a1aa]',
    badge: 'bg-[#f1f1f3] text-[#3f3f46] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]',
  },
  running: {
    label: 'Running',
    icon: Loader2,
    color: 'text-[#1e3fc8] dark:text-[#60a5fa]',
    badge: 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-[#166534] dark:text-[#4ade80]',
    badge: 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-[#991b1b] dark:text-[#fca5a5]',
    badge: 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60',
  },
  archived: {
    label: 'Archived',
    icon: Trash2,
    color: 'text-[#52525b] dark:text-[#a1a1aa]',
    badge: 'bg-[#f1f1f3] text-[#3f3f46] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]',
  },
};

const TYPE_LABELS: Record<string, string> = {
  demand_shock: 'Demand Shock',
  price_change: 'Price Change',
  supply_disruption: 'Supply Disruption',
  seasonal_shift: 'Seasonal Shift',
  custom: 'Custom Set',
};

function formatRunTimestamp(iso?: string | null): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAssumptionSummary(params?: Record<string, number> | null): string {
  if (!params) return 'Default assumptions';
  const parts: string[] = [];
  const mkt = params.marketing_spend_pct ?? 0;
  const price = params.price_change_pct ?? 0;
  const lead = params.lead_time_days ?? 14;
  const safety = params.safety_stock_multiplier ?? 1.0;

  if (Math.abs(mkt) >= 0.5) parts.push(`Mkt ${mkt > 0 ? '+' : ''}${mkt.toFixed(0)}%`);
  if (Math.abs(price) >= 0.5) parts.push(`Price ${price > 0 ? '+' : ''}${price.toFixed(0)}%`);
  if (Math.abs(lead - 14) >= 0.5) parts.push(`Lead ${lead.toFixed(0)}d`);
  if (Math.abs(safety - 1.0) >= 0.01) parts.push(`Safety ${safety.toFixed(2)}×`);

  return parts.length > 0 ? parts.join(' · ') : 'Baseline defaults (0% / 14d / 1.0×)';
}

interface Props {
  scenarios: Scenario[];
  activeId: number | null;
  isLoading: boolean;
  isRunning?: boolean;
  onSelect: (s: Scenario) => void;
  onRun: (id: number) => void;
  onDelete: (id: number) => void;
}

export function ScenarioHistory({
  scenarios, activeId, isLoading, isRunning = false, onSelect, onRun, onDelete,
}: Props) {
  if (isLoading) {
    return (
      <div className="p-5 sm:p-6 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px]">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#e4e4e7] dark:border-[#27272a]">
          <div className="w-8 h-8 rounded-[10px] bg-[#f1f1f3] dark:bg-[#18181b]" />
          <div className="h-5 w-36 bg-[#f1f1f3] dark:bg-[#18181b] rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Scenario History"
      className="p-5 sm:p-6 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px]"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#e4e4e7] dark:border-[#27272a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-[#0a0a0a] dark:bg-[#fafaf9] text-[#fafaf9] dark:text-[#0a0a0a] flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                Scenario History
              </h2>
              <span className="text-xs font-bold text-[#52525b] dark:text-[#a1a1aa] font-mono px-2.5 py-0.5 rounded-full bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'saved'}
              </span>
            </div>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5">
              Inspect past completed simulations, rerun saved configurations, or archive entries
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      {scenarios.length === 0 ? (
        <div className="text-center py-10 px-4 flex flex-col items-center justify-center rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-dashed border-[#e4e4e7] dark:border-[#27272a]">
          <div className="w-11 h-11 rounded-[12px] bg-white dark:bg-[#111113] text-[#1e3fc8] dark:text-[#60a5fa] flex items-center justify-center mb-3 border border-[#e4e4e7] dark:border-[#27272a]">
            <History className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">No Saved Scenarios Yet</p>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 max-w-sm leading-relaxed">
            Configure assumptions in the Scenario Builder above and run a simulation to preserve outcomes here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scenarios.map((s) => {
            const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.draft;
            const StatusIcon = cfg.icon;
            const result = s.latest_result;
            const delta = result?.demand_delta_pct ?? null;
            const isActive = s.id === activeId;
            const isCompleted = s.status === 'completed' && Boolean(result);
            const isFailed = s.status === 'failed';
            const runTimestamp = formatRunTimestamp(s.last_run_at ?? s.created_at);

            return (
              <div
                key={s.id}
                className={cn(
                  'flex flex-col justify-between p-4 rounded-[14px] border transition-colors duration-150',
                  isActive
                    ? 'bg-[#eff6ff]/60 dark:bg-[#1e3fc8]/15 border-[#1e3fc8] dark:border-[#60a5fa] ring-1 ring-[#1e3fc8] dark:ring-[#60a5fa]'
                    : 'bg-white dark:bg-[#111113] border-[#e4e4e7] dark:border-[#27272a] hover:border-[#0a0a0a]/40 dark:hover:border-[#fafaf9]/40'
                )}
              >
                <div>
                  {/* Top Row: Status + Delta */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border', cfg.badge)}>
                      <StatusIcon className={cn('w-3 h-3', cfg.color, s.status === 'running' && 'animate-spin')} aria-hidden="true" />
                      <span>{cfg.label}</span>
                    </div>

                    {delta !== null && isCompleted && (
                      <div className={cn(
                        'flex items-center gap-1 text-[11px] font-bold font-sans tabular-nums px-2 py-0.5 rounded-md border',
                        delta > 0.5
                          ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60'
                          : delta < -0.5
                            ? 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60'
                            : 'bg-[#f1f1f3] text-[#3f3f46] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]'
                      )}>
                        {delta > 0.5 ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> :
                         delta < -0.5 ? <TrendingDown className="w-3 h-3" aria-hidden="true" /> :
                         <Minus className="w-3 h-3" aria-hidden="true" />}
                        <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Scenario Name + ID */}
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <h3
                      className="text-sm font-bold line-clamp-2 leading-snug tracking-tight text-[#0a0a0a] dark:text-[#fafaf9]"
                      title={s.name}
                    >
                      {s.name}
                    </h3>
                    <span className="text-[10px] font-mono font-semibold text-[#52525b] dark:text-[#a1a1aa] flex-shrink-0">
                      #{s.id}
                    </span>
                  </div>

                  {/* Archetype, Horizon, and Timestamp */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-2">
                    <span className="font-semibold text-[#0a0a0a] dark:text-[#fafaf9] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] px-2 py-0.5 rounded-md">
                      {TYPE_LABELS[s.scenario_type] ?? s.scenario_type}
                    </span>
                    <span className="text-[#52525b] dark:text-[#a1a1aa] font-mono">v{s.version}</span>
                    <span className="text-[#52525b] dark:text-[#a1a1aa]">·</span>
                    <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">{s.horizon_weeks}w</span>
                  </div>

                  {runTimestamp && (
                    <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium mb-1.5">
                      {s.last_run_at ? 'Last run: ' : 'Created: '}
                      <span className="text-[#0a0a0a] dark:text-[#fafaf9]">{runTimestamp}</span>
                    </p>
                  )}

                  <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-mono mb-2 truncate" title={formatAssumptionSummary(s.parameters)}>
                    {formatAssumptionSummary(s.parameters)}
                  </p>

                  {isCompleted && result?.stockout_risk_pct !== null && result?.stockout_risk_pct !== undefined && (
                    <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mb-3">
                      Stockout risk: <span className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">{result.stockout_risk_pct.toFixed(1)}%</span> of weeks
                    </p>
                  )}

                  {isFailed && (
                    <p className="text-[11px] text-[#991b1b] dark:text-[#fca5a5] font-medium mb-3">
                      Run failed — click Retry to execute again.
                    </p>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] mt-auto">
                  {isCompleted ? (
                    <button
                      type="button"
                      onClick={() => onSelect(s)}
                      aria-label={isActive ? `Currently inspecting ${s.name}` : `Inspect ${s.name}`}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                        isActive
                          ? 'bg-[#1e3fc8] text-white'
                          : 'text-[#1e3fc8] dark:text-[#60a5fa] hover:bg-[#eff6ff] dark:hover:bg-[#1e3fc8]/20'
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isActive ? 'Inspecting' : 'Inspect'}</span>
                    </button>
                  ) : isFailed ? (
                    <button
                      type="button"
                      onClick={() => onSelect(s)}
                      aria-label={`View error for ${s.name}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-[8px] text-xs font-semibold text-[#991b1b] dark:text-[#fca5a5] hover:bg-[#fee2e2]/60 dark:hover:bg-[#7f1d1d]/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
                    >
                      <span>View status</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                      {s.status === 'running' ? 'In progress' : 'Not run yet'}
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    {s.status !== 'running' && (
                      <button
                        type="button"
                        id={`run-scenario-${s.id}`}
                        disabled={isRunning}
                        onClick={() => onRun(s.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[#fafaf9] hover:bg-[#1e3fc8] text-[#0a0a0a] hover:text-white dark:bg-[#18181b] dark:hover:bg-[#1e3fc8] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
                        aria-label={`${isFailed ? 'Retry' : 'Run again'} ${s.name}`}
                      >
                        <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                        <span>{isFailed ? 'Retry' : 'Rerun'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      id={`delete-scenario-${s.id}`}
                      onClick={() => onDelete(s.id)}
                      className="p-1.5 rounded-[8px] bg-[#fafaf9] hover:bg-[#fee2e2] text-[#52525b] hover:text-[#991b1b] dark:bg-[#18181b] dark:hover:bg-[#7f1d1d]/40 dark:text-[#a1a1aa] dark:hover:text-[#fca5a5] border border-[#e4e4e7] dark:border-[#27272a] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
                      title={`Delete ${s.name}`}
                      aria-label={`Delete scenario ${s.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
