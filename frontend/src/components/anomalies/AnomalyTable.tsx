/**
 * AnomalyTable — Primary investigation data table (desktop) + stacked cards (tablet/mobile)
 * • Full visibility of Type, Severity, Expected vs Actual, Deviation %, Event Date, Status, and Inspect
 * • Synchronized activeId highlight with timeline & drawer
 * • Consistent newest-event-first ordering with AnomalyTimeline
 */

import {
  CheckSquare, Square, CheckCircle2, ChevronRight,
  ChevronLeft, Minus,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { SeverityBadge, TypeBadge } from './AnomalyBadges';
import type { Anomaly } from '@/types/anomaly';

interface Props {
  anomalies: Anomaly[];
  isLoading: boolean;
  selectedIds: Set<number>;
  activeId?: number | null;
  onSelectToggle: (id: number) => void;
  onSelectAll: () => void;
  onResolve: (ids: number[]) => void;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (p: number) => void;
  onRowClick?: (a: Anomaly) => void;
}

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th className={cn(
    'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa] bg-[#fafaf9] dark:bg-[#18181b] border-b border-[#e4e4e7] dark:border-[#27272a] select-none whitespace-nowrap',
    className
  )}>
    {children}
  </th>
);

export function AnomalyTable({
  anomalies, isLoading, selectedIds, activeId, onSelectToggle,
  onSelectAll, onResolve, page, totalPages, total, perPage, onPageChange,
  onRowClick,
}: Props) {
  const allSelected = anomalies.length > 0 && anomalies.every((a) => selectedIds.has(a.id));
  const someSelected = selectedIds.size > 0;
  const activeSelected = anomalies
    .filter((a) => selectedIds.has(a.id) && !a.is_resolved)
    .map((a) => a.id);

  if (isLoading) {
    return (
      <div className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden p-4 space-y-2.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 skeleton rounded-[10px] bg-[#f1f1f3] dark:bg-[#18181b]" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden">
      {/* Bulk action bar */}
      {someSelected && (
        <div className="px-5 py-3 bg-[#eff6ff] dark:bg-[#1e3fc8]/20 border-b border-[#bfdbfe] dark:border-[#1e3fc8]/40 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-bold text-[#1e3fc8] dark:text-[#93c5fd]">
            {selectedIds.size} anomaly record{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          {activeSelected.length > 0 && (
            <button
              id="bulk-resolve-btn"
              type="button"
              onClick={() => onResolve(activeSelected)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[#16a34a] hover:bg-[#15803d] text-white transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Resolve {activeSelected.length} active</span>
            </button>
          )}
        </div>
      )}

      {/* Desktop Table (md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <TH className="w-11 text-center">
                <button
                  id="select-all-btn"
                  type="button"
                  onClick={onSelectAll}
                  className="text-[#52525b] hover:text-[#1e3fc8] dark:text-[#a1a1aa] dark:hover:text-[#60a5fa] transition-colors inline-flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] rounded"
                  aria-label="Select all anomalies"
                >
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" />
                    : someSelected
                      ? <Minus className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" />
                      : <Square className="w-4 h-4" />}
                </button>
              </TH>
              <TH>Type</TH>
              <TH>Severity</TH>
              <TH>Deviation</TH>
              <TH>Expected</TH>
              <TH>Actual</TH>
              <TH className="whitespace-nowrap">Event Date</TH>
              <TH>Status</TH>
              <TH className="text-right">Action</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
            {anomalies.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center">
                  <p className="text-sm font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">No anomalies matching criteria</p>
                  <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1">Try clearing filters or run an anomaly scan</p>
                </td>
              </tr>
            ) : (
              anomalies.map((a) => {
                const isSelected = selectedIds.has(a.id);
                const isInspected = activeId === a.id;
                const deviationAbs = a.deviation_pct != null ? Math.abs(a.deviation_pct) : null;
                const isPositive = (a.deviation_pct ?? 0) > 0;
                const dateLabel = a.event_date ?? (a.detected_at ? new Date(a.detected_at).toLocaleDateString() : '—');

                return (
                  <tr
                    key={a.id}
                    onClick={() => onRowClick?.(a)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick?.(a);
                      }
                    }}
                    aria-selected={isInspected}
                    className={cn(
                      'group cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:bg-[#eff6ff] dark:focus-visible:bg-[#1e3fc8]/20',
                      isInspected
                        ? 'bg-[#fafaf9] dark:bg-[#18181b] ring-1 ring-inset ring-[#0a0a0a] dark:ring-[#fafaf9]'
                        : isSelected
                          ? 'bg-[#eff6ff]/60 dark:bg-[#1e3fc8]/15'
                          : 'hover:bg-[#fafaf9] dark:hover:bg-[#18181b]/70',
                      a.is_resolved && 'opacity-70'
                    )}
                  >
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onSelectToggle(a.id)}
                        className="text-[#52525b] hover:text-[#1e3fc8] dark:text-[#a1a1aa] dark:hover:text-[#60a5fa] transition-colors inline-flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] rounded"
                        aria-label={`Select anomaly ${a.anomaly_type} on ${dateLabel}`}
                      >
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <TypeBadge type={a.anomaly_type} />
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <SeverityBadge severity={a.severity} />
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {deviationAbs != null ? (
                        <span className={cn(
                          'text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded-md',
                          isPositive
                            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
                        )}>
                          {isPositive ? '+' : '-'}{deviationAbs.toFixed(1)}%
                        </span>
                      ) : <span className="text-[#52525b] dark:text-[#a1a1aa]">—</span>}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-[#52525b] dark:text-[#a1a1aa] font-mono tabular-nums">
                        {a.expected_value != null ? formatNumber(a.expected_value) : '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-[#0a0a0a] dark:text-[#fafaf9] font-mono tabular-nums font-bold">
                        {a.actual_value != null ? formatNumber(a.actual_value) : '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono font-medium text-[#0a0a0a] dark:text-[#fafaf9]">
                        {dateLabel}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.is_resolved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-[#dcfce7] text-[#166534] font-semibold border border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          <span>Resolved</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-[#fee2e2] text-[#991b1b] font-semibold border border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" aria-hidden="true" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-semibold',
                        isInspected
                          ? 'text-[#0a0a0a] dark:text-[#fafaf9]'
                          : 'text-[#1e3fc8] dark:text-[#60a5fa] group-hover:underline'
                      )}>
                        <span>{isInspected ? 'Inspecting' : 'Inspect'}</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tablet & Mobile Stacked Card View (< md) — zero horizontal scroll */}
      <div className="md:hidden divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
        {anomalies.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">No anomalies matching criteria</p>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1">Try clearing filters or run an anomaly scan</p>
          </div>
        ) : (
          anomalies.map((a) => {
            const isSelected = selectedIds.has(a.id);
            const isInspected = activeId === a.id;
            const deviationAbs = a.deviation_pct != null ? Math.abs(a.deviation_pct) : null;
            const isPositive = (a.deviation_pct ?? 0) > 0;
            const dateLabel = a.event_date ?? (a.detected_at ? new Date(a.detected_at).toLocaleDateString() : '—');

            return (
              <div
                key={a.id}
                onClick={() => onRowClick?.(a)}
                className={cn(
                  'p-4 space-y-3 cursor-pointer transition-colors duration-150',
                  isInspected && 'bg-[#fafaf9] dark:bg-[#18181b]',
                  a.is_resolved && 'opacity-70'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelectToggle(a.id); }}
                      aria-label={`Select anomaly ${a.anomaly_type} on ${dateLabel}`}
                      className="text-[#52525b] dark:text-[#a1a1aa] p-0.5 cursor-pointer"
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" />
                        : <Square className="w-4 h-4" />}
                    </button>
                    <TypeBadge type={a.anomaly_type} />
                    <SeverityBadge severity={a.severity} />
                  </div>

                  {a.is_resolved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#dcfce7] text-[#166534] font-semibold border border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60 flex-shrink-0">
                      Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#fee2e2] text-[#991b1b] font-semibold border border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60 flex-shrink-0">
                      Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#52525b] dark:text-[#a1a1aa]">Deviation</p>
                    <p className={cn(
                      'font-mono font-bold mt-0.5 tabular-nums',
                      isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    )}>
                      {deviationAbs != null ? `${isPositive ? '+' : '-'}${deviationAbs.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#52525b] dark:text-[#a1a1aa]">Actual / Exp</p>
                    <p className="font-mono font-semibold text-[#0a0a0a] dark:text-[#fafaf9] mt-0.5 tabular-nums">
                      {a.actual_value != null ? formatNumber(a.actual_value) : '—'} / {a.expected_value != null ? formatNumber(a.expected_value) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#52525b] dark:text-[#a1a1aa]">Date</p>
                    <p className="font-mono text-[#0a0a0a] dark:text-[#fafaf9] mt-0.5">{dateLabel}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e3fc8] dark:text-[#60a5fa]">
                    <span>{isInspected ? 'Inspecting' : 'Inspect event'}</span>
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-mono font-medium">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total} records
          </span>
          <div className="flex items-center gap-2">
            <button
              id="prev-page-btn"
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#0a0a0a] dark:text-[#fafaf9] font-mono px-2 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              id="next-page-btn"
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
