/**
 * Anomaly Intelligence & Investigation Center — Phase 4B.5
 *
 * Enterprise Layout:
 *   Header  — Page title + refresh
 *   Sec 1   — Executive Intelligence Header (8 KPI cards)
 *   Sec 2   — Detection Control Center (expanded scanner)
 *   Sec 3   — Anomaly Breakdown Dashboard (4 charts)
 *   Split   — Left: Filter + Table | Right: Timeline
 *   Drawer  — Investigation Drawer (Sections 4-7) opens on row click
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, Brain } from 'lucide-react';

import { AnomalyExecutiveHeader } from '@/components/anomalies/AnomalyExecutiveHeader';
import { AnomalyDetectPanel } from '@/components/anomalies/AnomalyDetectPanel';
import { AnomalyDashboardCharts } from '@/components/anomalies/AnomalyDashboardCharts';
import { AnomalyFilterBar } from '@/components/anomalies/AnomalyFilterBar';
import { AnomalyTable } from '@/components/anomalies/AnomalyTable';
import { AnomalyTimeline } from '@/components/anomalies/AnomalyTimeline';
import { AnomalyInvestigationDrawer } from '@/components/anomalies/AnomalyInvestigationDrawer';
import { AnomalyTypeBreakdown } from '@/components/anomalies/AnomalySummaryCards';

import anomalyApi from '@/services/anomalyApi';
import { toast } from '@/hooks/useToast';
import type {
  Anomaly, AnomalyListResponse, AnomalySummary,
  AnomalyFilters, AnomalyDetectRequest, AnomalyDetectResponse,
} from '@/types/anomaly';

const PER_PAGE = 50;

const DEFAULT_FILTERS: AnomalyFilters = {
  severity: 'all',
  anomaly_type: 'all',
  include_resolved: false,
  search: '',
};

export default function AnomaliesPage() {
  // ── Data state ────────────────────────────────────────────────────
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [allAnomalies, setAllAnomalies] = useState<Anomaly[]>([]); // for timeline/charts (no pagination)
  const [summary, setSummary] = useState<AnomalySummary | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ── UI state ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AnomalyFilters>(DEFAULT_FILTERS);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(true);  // gates trend chart
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerAnomaly, setDrawerAnomaly] = useState<Anomaly | null>(null);

  // ── Load paginated list ───────────────────────────────────────────
  const loadList = useCallback(async (p = page, f = filters) => {
    setIsLoadingList(true);
    setSelectedIds(new Set());
    try {
      const params: Record<string, any> = {
        page: p,
        per_page: PER_PAGE,
        include_resolved: f.include_resolved,
      };
      if (f.severity !== 'all') params.severity = f.severity;
      if (f.anomaly_type !== 'all') params.anomaly_type = f.anomaly_type;

      const { data } = await anomalyApi.list(params);
      setAnomalies(data.anomalies);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch {
      toast.error('Load failed', 'Could not fetch anomalies');
    } finally {
      setIsLoadingList(false);
    }
  }, [page, filters]);

  // ── Load all anomalies for charts & timeline ──────────────────────
  // per_page=500 is now valid (backend le=1000). Previously this silently
  // failed with a 422 because the old limit was le=200.
  const loadAllForCharts = useCallback(async () => {
    setIsLoadingAll(true);
    try {
      const { data } = await anomalyApi.list({ page: 1, per_page: 500, include_resolved: true });
      setAllAnomalies(data.anomalies);
    } catch (err: any) {
      console.error('[loadAllForCharts] failed:', err?.response?.status, err?.response?.data);
    } finally {
      setIsLoadingAll(false);
    }
  }, []);

  // ── Load summary ──────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const { data } = await anomalyApi.summary();
      setSummary(data);
    } catch {
      // Summary is non-critical
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadList(1, DEFAULT_FILTERS);
    loadSummary();
    loadAllForCharts();
  }, []);

  // ── Filter change ─────────────────────────────────────────────────
  const handleFilterChange = useCallback((f: AnomalyFilters) => {
    setFilters(f);
    setPage(1);
    loadList(1, f);
  }, [loadList]);

  // ── Page change ───────────────────────────────────────────────────
  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    loadList(p, filters);
  }, [filters, loadList]);

  // ── Refresh all ───────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    loadList(page, filters);
    loadSummary();
    loadAllForCharts();
  }, [page, filters, loadList, loadSummary, loadAllForCharts]);

  // ── Selection ─────────────────────────────────────────────────────
  const handleSelectToggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (anomalies.every((a) => selectedIds.has(a.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(anomalies.map((a) => a.id)));
    }
  }, [anomalies, selectedIds]);

  // ── Resolve ───────────────────────────────────────────────────────
  const handleResolve = useCallback(async (ids: number[]) => {
    try {
      const { data } = await anomalyApi.resolve({ anomaly_ids: ids });
      toast.success('Resolved', data.message);
      setSelectedIds(new Set());
      await Promise.all([loadList(page, filters), loadSummary(), loadAllForCharts()]);
    } catch {
      toast.error('Resolve failed', 'Could not resolve anomalies');
    }
  }, [page, filters, loadList, loadSummary, loadAllForCharts]);

  // ── Detect ────────────────────────────────────────────────────────
  const handleDetect = useCallback(async (
    req: AnomalyDetectRequest
  ): Promise<AnomalyDetectResponse | null> => {
    setIsDetecting(true);
    try {
      const { data } = await anomalyApi.detect(req);
      const mode = req.comprehensive_sweep ? 'Comprehensive Sweep' : 'Scan';
      toast.success(
        `${mode} complete`,
        `${data.detected} anomaly${data.detected !== 1 ? 'ies' : ''} found in ${data.computation_seconds.toFixed(2)}s`
      );
      await Promise.all([loadList(1, filters), loadSummary(), loadAllForCharts()]);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Detection failed';
      toast.error('Detection error', typeof msg === 'string' ? msg : 'Unexpected error');
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [filters, loadList, loadSummary, loadAllForCharts]);

  // ── Client-side search filter ─────────────────────────────────────
  const filteredAnomalies = useMemo(() => {
    if (!filters.search.trim()) return anomalies;
    const q = filters.search.toLowerCase();
    return anomalies.filter(
      (a) =>
        a.explanation?.toLowerCase().includes(q) ||
        a.anomaly_type.includes(q) ||
        a.event_date?.includes(q)
    );
  }, [anomalies, filters.search]);

  // ── Row click: open investigation drawer ──────────────────────────
  const handleRowClick = useCallback((a: Anomaly) => {
    setDrawerAnomaly(a);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 border-b border-surface-800/50 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-danger flex items-center justify-center shadow-lg shadow-danger-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-surface-50 flex items-center gap-2">
              Anomaly Intelligence
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 font-semibold">
                & Investigation Center
              </span>
            </h1>
            <p className="text-xs text-surface-500 mt-0.5">
              Rolling z-score detection across demand, inventory & forecast data
            </p>
          </div>
        </div>

        <button
          id="refresh-all-btn"
          onClick={handleRefresh}
          disabled={isLoadingList}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-surface-700/60 text-surface-400 hover:bg-surface-800/50 hover:text-surface-200 transition-all duration-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* ── Scrollable content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

        {/* Section 1: Executive Intelligence Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <AnomalyExecutiveHeader
            summary={summary}
            anomalies={allAnomalies}
            isLoading={isLoadingSummary}
            isLoadingAnomalies={isLoadingAll}
          />
        </motion.div>

        {/* Section 2: Detection Control Center */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <AnomalyDetectPanel onDetect={handleDetect} isRunning={isDetecting} />
        </motion.div>

        {/* Section 3: Anomaly Breakdown Dashboard */}
        <AnomalyDashboardCharts
          summary={summary}
          anomalies={allAnomalies}
          isLoading={isLoadingSummary}
          isLoadingAnomalies={isLoadingAll}
        />

        {/* Type Breakdown (legacy — kept for compatibility) */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <AnomalyTypeBreakdown summary={summary} isLoading={isLoadingSummary} />
        </motion.div>

        {/* Filter + Table | Timeline split layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Left: Filter + Table (2/3 width on xl) */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <AnomalyFilterBar
                filters={filters}
                onChange={handleFilterChange}
                isLoading={isLoadingList}
                onRefresh={handleRefresh}
                total={filters.search ? filteredAnomalies.length : total}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
              <AnomalyTable
                anomalies={filteredAnomalies}
                isLoading={isLoadingList}
                selectedIds={selectedIds}
                onSelectToggle={handleSelectToggle}
                onSelectAll={handleSelectAll}
                onResolve={handleResolve}
                page={page}
                totalPages={totalPages}
                total={total}
                perPage={PER_PAGE}
                onPageChange={handlePageChange}
                onRowClick={handleRowClick}
              />
            </motion.div>
          </div>

          {/* Right: Timeline (1/3 width on xl) */}
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28 }}>
            <AnomalyTimeline
              anomalies={allAnomalies}
              isLoading={isLoadingSummary || isLoadingAll}
              onSelect={setDrawerAnomaly}
            />
          </motion.div>
        </div>
      </div>

      {/* Investigation Drawer (Sections 4-7) */}
      <AnomalyInvestigationDrawer
        anomaly={drawerAnomaly}
        onClose={() => setDrawerAnomaly(null)}
        onResolve={handleResolve}
      />
    </div>
  );
}
