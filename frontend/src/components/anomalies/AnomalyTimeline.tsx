/**
 * AnomalyTimeline — Section 8
 * Vertical event timeline showing anomaly history by date/type/severity
 * Enhanced with multiline descriptions, clear node connector, and refined badges.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SeverityBadge, TypeBadge, SEVERITY_CONFIG } from './AnomalyBadges';
import type { Anomaly } from '@/types/anomaly';

interface Props {
  anomalies: Anomaly[];
  isLoading: boolean;
  onSelect: (a: Anomaly) => void;
}

export function AnomalyTimeline({ anomalies, isLoading, onSelect }: Props) {
  const [showAll, setShowAll] = useState(false);

  // Sort newest first by event_date or detected_at
  const sorted = [...anomalies].sort((a, b) => {
    const da = new Date(a.event_date ?? a.detected_at).getTime();
    const db = new Date(b.event_date ?? b.detected_at).getTime();
    return db - da;
  });

  const displayed = showAll ? sorted : sorted.slice(0, 10);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface p-4 sm:p-5 shadow-2xs">
        <div className="h-4 w-36 skeleton mb-4 rounded" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl skeleton flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton w-1/2 rounded" />
              <div className="h-3 skeleton w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (anomalies.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface p-4 sm:p-5 shadow-2xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-ds-border">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-ds-text-secondary">
            Anomaly Event Timeline
          </p>
          <p className="text-xs text-slate-400 dark:text-ds-text-muted mt-0.5">
            Chronological audit log
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-ds-text-muted font-mono font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-ds-surface-sunken border border-slate-200/60 dark:border-ds-border">
          {sorted.length} events
        </span>
      </div>

      <div className="relative flex-1">
        {/* Continuous vertical connector line */}
        <div className="absolute left-4.5 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-ds-border" />

        <div className="space-y-3">
          {displayed.map((a, idx) => {
            const sevCfg = SEVERITY_CONFIG[a.severity];
            const SevIcon = sevCfg.icon;
            const dateStr = a.event_date ?? (a.detected_at ? new Date(a.detected_at).toLocaleDateString() : '—');

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                onClick={() => onSelect(a)}
                className={cn(
                  'relative flex items-start gap-3.5 p-3 rounded-xl cursor-pointer group transition-all duration-150',
                  'border border-transparent hover:border-slate-200 dark:hover:border-ds-border hover:bg-slate-50/80 dark:hover:bg-ds-surface-sunken/60 hover:shadow-2xs',
                  a.is_resolved && 'opacity-65'
                )}
              >
                {/* Timeline node */}
                <div className={cn(
                  'relative z-10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-2xs mt-0.5',
                  sevCfg.bg, sevCfg.border
                )}>
                  <SevIcon className={cn('w-4 h-4', sevCfg.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <TypeBadge type={a.anomaly_type} />
                    <SeverityBadge severity={a.severity} />
                    {a.is_resolved && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Resolved
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-ds-text-muted">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {dateStr}
                    </span>
                    {a.deviation_pct != null && (
                      <span className={cn(
                        'font-bold font-mono px-1.5 py-0.2 rounded',
                        a.deviation_pct > 0
                          ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
                      )}>
                        {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {/* Multiline description (NOT truncated) */}
                  {a.explanation && (
                    <p className="text-xs text-slate-600 dark:text-ds-text-secondary mt-1.5 leading-relaxed line-clamp-3 group-hover:text-slate-900 dark:group-hover:text-ds-text-heading transition-colors">
                      {a.explanation}
                    </p>
                  )}
                </div>

                {/* Hover arrow */}
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Show More / Less */}
      {sorted.length > 10 && (
        <button
          id="timeline-show-more"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-ds-text-secondary hover:text-slate-900 dark:hover:text-ds-text-heading border border-slate-200/80 dark:border-ds-border rounded-xl hover:bg-slate-50 dark:hover:bg-ds-surface-sunken transition-all shadow-2xs"
        >
          {showAll ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Show fewer events</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Show {sorted.length - 10} more events</>
          )}
        </button>
      )}
    </div>
  );
}
