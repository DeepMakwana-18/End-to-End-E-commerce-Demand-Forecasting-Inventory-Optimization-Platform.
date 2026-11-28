/**
 * AnomalyTimeline — Compact chronological audit timeline
 * • Shows compact event summary: Event Date, Type, Severity, and Deviation %
 * • Synchronized activeId highlight with AnomalyTable & AnomalyInvestigationDrawer
 * • Explicit "Newest event first" chronological order
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SeverityBadge, TypeBadge, SEVERITY_CONFIG } from './AnomalyBadges';
import type { Anomaly } from '@/types/anomaly';

interface Props {
  anomalies: Anomaly[];
  isLoading: boolean;
  activeId?: number | null;
  onSelect: (a: Anomaly) => void;
}

export function AnomalyTimeline({ anomalies, isLoading, activeId, onSelect }: Props) {
  const [showAll, setShowAll] = useState(false);

  // Sort newest event first by event_date or detected_at (matches AnomalyTable)
  const sorted = [...anomalies].sort((a, b) => {
    const da = new Date(a.event_date ?? a.detected_at).getTime();
    const db = new Date(b.event_date ?? b.detected_at).getTime();
    return db - da;
  });

  const displayed = showAll ? sorted : sorted.slice(0, 10);

  if (isLoading) {
    return (
      <div className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-5">
        <div className="h-4 w-36 skeleton mb-4 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-[12px] skeleton bg-[#f1f1f3] dark:bg-[#18181b]" />
          ))}
        </div>
      </div>
    );
  }

  if (anomalies.length === 0) return null;

  return (
    <section
      aria-label="Anomaly Event Timeline"
      className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-5 sm:p-6"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e4e4e7] dark:border-[#27272a] flex-wrap gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Anomaly Event Timeline
          </p>
          <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
            Chronological log (newest event first) · Select an event to inspect full evidence
          </p>
        </div>
        <span className="text-xs text-[#0a0a0a] dark:text-[#fafaf9] font-mono font-semibold px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
          {sorted.length} event{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {displayed.map((a) => {
          const sevCfg = SEVERITY_CONFIG[a.severity];
          const SevIcon = sevCfg.icon;
          const dateStr = a.event_date ?? (a.detected_at ? new Date(a.detected_at).toLocaleDateString() : '—');
          const isInspected = activeId === a.id;

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a)}
              aria-pressed={isInspected}
              className={cn(
                'w-full text-left flex items-center justify-between gap-3 p-3 rounded-[12px] border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                isInspected
                  ? 'bg-[#fafaf9] dark:bg-[#18181b] border-[#0a0a0a] dark:border-[#fafaf9] ring-1 ring-[#0a0a0a] dark:ring-[#fafaf9]'
                  : 'bg-white dark:bg-[#111113] border-[#e4e4e7] dark:border-[#27272a] hover:bg-[#fafaf9] dark:hover:bg-[#18181b]',
                a.is_resolved && 'opacity-70'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  'w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 border',
                  sevCfg.bg, sevCfg.border
                )} aria-hidden="true">
                  <SevIcon className={cn('w-4 h-4', sevCfg.color)} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">
                      <Clock className="w-3 h-3 text-[#52525b] dark:text-[#a1a1aa]" aria-hidden="true" />
                      {dateStr}
                    </span>
                    <TypeBadge type={a.anomaly_type} />
                    <SeverityBadge severity={a.severity} />
                    {a.is_resolved && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] dark:bg-[#14532d]/40 dark:text-[#4ade80] font-semibold border border-[#bbf7d0] dark:border-[#166534]/60">
                        <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {a.deviation_pct != null && (
                  <span className={cn(
                    'text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded-md',
                    a.deviation_pct > 0
                      ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
                  )}>
                    {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct.toFixed(1)}%
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-[#52525b] dark:text-[#a1a1aa]" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>

      {sorted.length > 10 && (
        <button
          id="timeline-show-more"
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] rounded-[10px] hover:bg-[#fafaf9] dark:hover:bg-[#18181b] transition-colors cursor-pointer"
        >
          {showAll ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Show fewer events</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Show {sorted.length - 10} more events</>
          )}
        </button>
      )}
    </section>
  );
}
