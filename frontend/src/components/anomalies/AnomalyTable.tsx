/** AnomalyTable — main data table with selection, row detail, and resolve workflow. */

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
      <td colSpan={9} className="px-4 py-0 bg-surface-900/40">
        <div className="py-3 border-t border-surface-800/60 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Explanation */}
          <div className="col-span-full">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-1">
              Explanation
            </p>
            <p className="text-sm text-surface-200 leading-relaxed">
              {anomaly.explanation ?? '—'}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Z-Score', value: anomaly.z_score?.toFixed(3) ?? '—' },
              { label: 'Expected', value: anomaly.expected_value != null ? formatNumber(anomaly.expected_value) : '—' },
              { label: 'Actual', value: anomaly.actual_value != null ? formatNumber(anomaly.actual_value) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-2.5">
                <p className="text-[10px] text-surface-600 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-bold font-mono text-surface-100">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Event Date', value: anomaly.event_date ?? '—' },
              { label: 'Detected', value: new Date(anomaly.detected_at).toLocaleDateString() },
              {
                label: 'Status',
                value: anomaly.is_resolved
                  ? `Resolved ${anomaly.resolved_at ? new Date(anomaly.resolved_at).toLocaleDateString() : ''}`
                  : 'Active'
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-900/60 border border-surface-800/40 rounded-xl p-2.5">
                <p className="text-[10px] text-surface-600 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xs font-semibold text-surface-200">{value}</p>
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
  <th className={cn('px-4 py-3 text-left text-[11px] font-semibold text-ds-text-muted bg-ds-surface-alt/60 border-b border-ds-hairline', className)}>
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
      <div className="card-apple overflow-hidden">
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 skeleton rounded-2xl bg-ds-surface-sunken" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-apple overflow-hidden">
      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-ds-blue-surface border-b border-ds-hairline flex items-center gap-3">
              <span className="text-xs font-semibold text-ds-blue-on-surface">
                {selectedIds.size} selected
              </span>
              {activeSelected.length > 0 && (
                <button
                  id="bulk-resolve-btn"
                  onClick={() => onResolve(activeSelected)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-ds-green-surface text-ds-green-text border border-ds-green/30 hover:opacity-90 transition-all shadow-sm"
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
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-surface-800/60">
              <TH className="w-10">
                <button
                  id="select-all-btn"
                  onClick={onSelectAll}
                  className="text-surface-500 hover:text-primary-400 transition-colors"
                >
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-primary-400" />
                    : someSelected
                    ? <Minus className="w-4 h-4 text-surface-400" />
                    : <Square className="w-4 h-4" />}
                </button>
              </TH>
              <TH>Type</TH>
              <TH>Severity</TH>
              <TH>Deviation</TH>
              <TH className="hidden md:table-cell">Expected</TH>
              <TH className="hidden md:table-cell">Actual</TH>
              <TH className="hidden lg:table-cell">Event Date</TH>
              <TH className="hidden lg:table-cell">Status</TH>
              <TH className="w-8" />
            </tr>
          </thead>
          <tbody>
            {anomalies.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <p className="text-sm text-surface-500">No anomalies found</p>
                  <p className="text-xs text-surface-700 mt-1">Try adjusting filters or run a detection scan</p>
                </td>
              </tr>
            ) : (
              anomalies.map((a, idx) => {
                const isExpanded = expandedId === a.id;
                const isSelected = selectedIds.has(a.id);
                const deviationAbs = a.deviation_pct != null ? Math.abs(a.deviation_pct) : null;
                const isPositive = (a.deviation_pct ?? 0) > 0;

                return (
                  <>
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => {
                        if (onRowClick) {
                          onRowClick(a);
                        } else {
                          setExpandedId(isExpanded ? null : a.id);
                        }
                      }}
                      className={cn(
                        'border-b border-ds-hairline cursor-pointer transition-colors duration-150',
                        isSelected
                          ? 'bg-ds-blue-surface/30'
                          : 'hover:bg-ds-surface-alt/50',
                        a.is_resolved && 'opacity-60'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 w-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectToggle(a.id); }}
                          className="text-ds-text-muted hover:text-ds-blue transition-colors"
                        >
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-ds-blue" />
                            : <Square className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <TypeBadge type={a.anomaly_type} />
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3">
                        <SeverityBadge severity={a.severity} />
                      </td>

                      {/* Deviation % */}
                      <td className="px-4 py-3">
                        {deviationAbs != null ? (
                          <span className={cn(
                            'text-sm font-bold font-mono tabular-nums',
                            isPositive ? 'text-ds-green-text' : 'text-ds-red-text'
                          )}>
                            {isPositive ? '+' : '-'}{deviationAbs.toFixed(1)}%
                          </span>
                        ) : <span className="text-ds-text-muted">—</span>}
                      </td>

                      {/* Expected */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-ds-text-muted font-mono tabular-nums">
                          {a.expected_value != null ? formatNumber(a.expected_value) : '—'}
                        </span>
                      </td>

                      {/* Actual */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-ds-text-primary font-mono tabular-nums font-semibold">
                          {a.actual_value != null ? formatNumber(a.actual_value) : '—'}
                        </span>
                      </td>

                      {/* Event date */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-ds-text-muted font-mono">
                          {a.event_date ?? new Date(a.detected_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {a.is_resolved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-ds-green-surface text-ds-green-text font-semibold border border-ds-green/30">
                            <CheckCircle2 className="w-3 h-3" />Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-ds-red-surface text-ds-red-text font-semibold border border-ds-red/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-ds-red animate-pulse" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Expand chevron */}
                      <td className="px-2 py-3 w-8">
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-ds-blue" />
                          : <ChevronDown className="w-3.5 h-3.5 text-ds-text-muted" />}
                      </td>
                    </motion.tr>

                    {/* Expanded detail row */}
                    <AnimatePresence>
                      {isExpanded && <AnomalyDetail key={`detail-${a.id}`} anomaly={a} />}
                    </AnimatePresence>
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-ds-hairline bg-ds-surface-alt/30 flex items-center justify-between">
          <span className="text-xs text-ds-text-muted font-mono">
            {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              id="prev-page-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-ds-hairline bg-ds-surface-alt/60 text-ds-text-muted hover:text-ds-text-primary hover:bg-ds-surface-alt disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-ds-text-muted font-mono px-2">
              {page} / {totalPages}
            </span>
            <button
              id="next-page-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-ds-hairline bg-ds-surface-alt/60 text-ds-text-muted hover:text-ds-text-primary hover:bg-ds-surface-alt disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
