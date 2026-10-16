/**
 * AnomalyTable — Main investigation data table
 * Refined layout:
 *  - Proportional column widths
 *  - Guaranteed single-line dates (whitespace-nowrap min-w-[110px])
 *  - Compact badges that preserve horizontal room
 *  - Clear Expected vs Actual and Deviation % formatting
 *  - Polished selection checkboxes, hover states, and pagination
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Square, CheckCircle2, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Minus,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { SeverityBadge, TypeBadge } from './AnomalyBadges';
import type { Anomaly } from '@/types/anomaly';

// ── Row detail expand ─────────────────────────────────────────────────

function AnomalyDetail({ anomaly }: { anomaly: Anomaly }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <td colSpan={9} className="px-5 py-0 bg-slate-50/70 dark:bg-ds-surface-sunken/40">
        <div className="py-4 border-t border-slate-200/60 dark:border-ds-border grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Explanation */}
          <div className="col-span-full">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-ds-text-secondary mb-1.5">
              Anomaly Explanation &amp; Root Cause Analysis
            </p>
            <p className="text-sm text-slate-800 dark:text-ds-text-heading leading-relaxed bg-white dark:bg-ds-surface p-3.5 rounded-xl border border-slate-200/80 dark:border-ds-border shadow-2xs">
              {anomaly.explanation ?? 'No automated explanation generated for this record.'}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Z-Score', value: anomaly.z_score?.toFixed(3) ?? '—' },
              { label: 'Expected Value', value: anomaly.expected_value != null ? formatNumber(anomaly.expected_value) : '—' },
              { label: 'Actual Value', value: anomaly.actual_value != null ? formatNumber(anomaly.actual_value) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-ds-surface border border-slate-200/80 dark:border-ds-border rounded-xl p-3 shadow-2xs">
                <p className="text-[10px] text-slate-400 dark:text-ds-text-muted uppercase font-bold tracking-wider mb-1">{label}</p>
                <p className="text-sm font-bold font-mono text-slate-900 dark:text-ds-text-heading">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Event Date', value: anomaly.event_date ?? '—' },
              { label: 'Detected At', value: new Date(anomaly.detected_at).toLocaleDateString() },
              {
                label: 'Status',
                value: anomaly.is_resolved
                  ? `Resolved ${anomaly.resolved_at ? new Date(anomaly.resolved_at).toLocaleDateString() : ''}`
                  : 'Active'
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-ds-surface border border-slate-200/80 dark:border-ds-border rounded-xl p-3 shadow-2xs">
                <p className="text-[10px] text-slate-400 dark:text-ds-text-muted uppercase font-bold tracking-wider mb-1">{label}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-ds-text-heading font-mono">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Main table ────────────────────────────────────────────────────────

interface Props {
  anomalies: Anomaly[];
  isLoading: boolean;
  selectedIds: Set<number>;
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
    'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-ds-text-secondary bg-slate-50/80 dark:bg-ds-surface-sunken/80 border-b border-slate-200/80 dark:border-ds-border select-none whitespace-nowrap',
    className
  )}>
    {children}
  </th>
);

export function AnomalyTable({
  anomalies, isLoading, selectedIds, onSelectToggle,
  onSelectAll, onResolve, page, totalPages, total, perPage, onPageChange,
  onRowClick,
}: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const allSelected = anomalies.length > 0 && anomalies.every((a) => selectedIds.has(a.id));
  const someSelected = selectedIds.size > 0;
  const activeSelected = anomalies
    .filter((a) => selectedIds.has(a.id) && !a.is_resolved)
    .map((a) => a.id);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden">
        <div className="p-4 space-y-2.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 skeleton rounded-xl bg-slate-100 dark:bg-ds-surface-sunken" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden">
      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-3 bg-indigo-50/90 dark:bg-indigo-950/40 border-b border-indigo-200/80 dark:border-indigo-800/40 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                {selectedIds.size} anomaly record{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              {activeSelected.length > 0 && (
                <button
                  id="bulk-resolve-btn"
                  onClick={() => onResolve(activeSelected)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolve {activeSelected.length} active
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <TH className="w-10 text-center">
                <button
                  id="select-all-btn"
                  onClick={onSelectAll}
                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center justify-center"
                  aria-label="Select all anomalies"
                >
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    : someSelected
                    ? <Minus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    : <Square className="w-4 h-4" />}
                </button>
              </TH>
              <TH>Type</TH>
              <TH>Severity</TH>
              <TH>Deviation</TH>
              <TH className="hidden md:table-cell">Expected</TH>
              <TH className="hidden md:table-cell">Actual</TH>
              <TH className="whitespace-nowrap min-w-[110px]">Event Date</TH>
              <TH className="hidden sm:table-cell">Status</TH>
              <TH className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-ds-border">
            {anomalies.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-14 text-center">
                  <p className="text-sm font-semibold text-slate-500 dark:text-ds-text-secondary">No anomalies matching criteria</p>
                  <p className="text-xs text-slate-400 dark:text-ds-text-muted mt-1">Try clearing filters or run an anomaly scan</p>
                </td>
              </tr>
            ) : (
              anomalies.map((a, idx) => {
                const isExpanded = expandedId === a.id;
                const isSelected = selectedIds.has(a.id);
                const deviationAbs = a.deviation_pct != null ? Math.abs(a.deviation_pct) : null;
                const isPositive = (a.deviation_pct ?? 0) > 0;

                return (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    onClick={() => {
                      if (onRowClick) {
                        onRowClick(a);
                      } else {
                        setExpandedId(isExpanded ? null : a.id);
                      }
                    }}
                    className={cn(
                      'group cursor-pointer transition-colors duration-150',
                      isSelected
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'hover:bg-slate-50/80 dark:hover:bg-ds-surface-sunken/60',
                      a.is_resolved && 'opacity-60'
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectToggle(a.id)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center justify-center"
                        aria-label={`Select anomaly ${a.id}`}
                      >
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <TypeBadge type={a.anomaly_type} />
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SeverityBadge severity={a.severity} />
                    </td>

                    {/* Deviation % */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {deviationAbs != null ? (
                        <span className={cn(
                          'text-xs sm:text-sm font-bold font-mono tabular-nums px-2 py-0.5 rounded-md',
                          isPositive
                            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400'
                        )}>
                          {isPositive ? '+' : '-'}{deviationAbs.toFixed(1)}%
                        </span>
                      ) : <span className="text-slate-400 dark:text-ds-text-muted">—</span>}
                    </td>

                    {/* Expected */}
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-slate-500 dark:text-ds-text-muted font-mono tabular-nums">
                        {a.expected_value != null ? formatNumber(a.expected_value) : '—'}
                      </span>
                    </td>

                    {/* Actual */}
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-slate-900 dark:text-ds-text-heading font-mono tabular-nums font-bold">
                        {a.actual_value != null ? formatNumber(a.actual_value) : '—'}
                      </span>
                    </td>

                    {/* Event date — CRITICAL: whitespace-nowrap prevents line wrap */}
                    <td className="px-4 py-3 whitespace-nowrap min-w-[110px]">
                      <span className="text-xs font-mono font-medium text-slate-700 dark:text-ds-text-secondary whitespace-nowrap">
                        {a.event_date ?? (a.detected_at ? new Date(a.detected_at).toLocaleDateString() : '—')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                      {a.is_resolved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-rose-50 text-rose-700 font-semibold border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Expand chevron */}
                    <td className="px-3 py-3 w-8 text-center">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded detail row if any */}
      <AnimatePresence>
        {expandedId !== null && (() => {
          const item = anomalies.find((a) => a.id === expandedId);
          return item ? <AnomalyDetail key={`detail-${item.id}`} anomaly={item} /> : null;
        })()}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-ds-border bg-slate-50/50 dark:bg-ds-surface-sunken/30 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-ds-text-muted font-mono font-medium">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total} records
          </span>
          <div className="flex items-center gap-2">
            <button
              id="prev-page-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-surface text-slate-600 dark:text-ds-text-muted hover:text-slate-900 dark:hover:text-ds-text-heading hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 dark:text-ds-text-secondary font-mono px-2 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              id="next-page-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-surface text-slate-600 dark:text-ds-text-muted hover:text-slate-900 dark:hover:text-ds-text-heading hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
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
