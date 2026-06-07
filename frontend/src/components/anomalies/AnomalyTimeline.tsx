/**
 * AnomalyTimeline — Section 8
 * Vertical event timeline showing anomaly history by date/type/severity
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

  const displayed = showAll ? sorted : sorted.slice(0, 12);

  if (isLoading) {
    return (
      <div className="glass-card p-4">
        <div className="h-4 w-32 skeleton mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 mb-3">
            <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 skeleton w-1/3" />
              <div className="h-2.5 skeleton w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (anomalies.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">
          Anomaly Event Timeline
        </p>
        <span className="text-[10px] text-surface-600 font-mono">{sorted.length} events</span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-surface-800/60" />

        <div className="space-y-0">
          {displayed.map((a, idx) => {
            const sevCfg = SEVERITY_CONFIG[a.severity];
            const SevIcon = sevCfg.icon;
            const dateStr = a.event_date ?? new Date(a.detected_at).toLocaleDateString();

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onSelect(a)}
                className={cn(
                  'relative flex gap-3 pl-2 pr-3 py-2.5 rounded-xl cursor-pointer group',
                  'hover:bg-surface-800/30 transition-colors duration-150',
                  a.is_resolved && 'opacity-50'
                )}
              >
                {/* Timeline node */}
                <div className={cn(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border',
                  sevCfg.bg, sevCfg.border
                )}>
                  <SevIcon className={cn('w-3.5 h-3.5', sevCfg.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start gap-2 flex-wrap">
                    <TypeBadge type={a.anomaly_type} />
                    <SeverityBadge severity={a.severity} />
                    {a.is_resolved && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-500/10 text-accent-500 border border-accent-500/20">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-surface-500 mt-1">
                    {dateStr}
                    {a.deviation_pct != null && (
                      <span className={cn('ml-2 font-semibold', a.deviation_pct > 0 ? 'text-accent-400' : 'text-danger-400')}>
                        {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct.toFixed(1)}%
                      </span>
                    )}
                  </p>
                  {a.explanation && (
                    <p className="text-[10px] text-surface-500 mt-0.5 truncate group-hover:text-surface-400 transition-colors">
                      {a.explanation}
                    </p>
                  )}
                </div>

                {/* Hover caret */}
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className="w-3 h-3 text-surface-500 -rotate-90" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Show More / Less */}
      {sorted.length > 12 && (
        <button
          id="timeline-show-more"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs text-surface-500 hover:text-surface-300 border border-surface-800/50 rounded-xl hover:border-surface-700/60 transition-all duration-200"
        >
          {showAll ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Show {sorted.length - 12} more events</>
          )}
        </button>
      )}
    </div>
  );
}
