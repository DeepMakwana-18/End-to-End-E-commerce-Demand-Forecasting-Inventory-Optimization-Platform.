/**
 * Anomaly Intelligence & Investigation Center — Titan AI
 *
 * Full-width investigation workspace:
 *   Header   — Titan editorial title + Refresh
 *   Sec 1    — Executive Intelligence Header (8 KPI cards with accurate units)
 *   Sec 2    — Detection Control Center
 *   Sec 3    — Anomaly Breakdown Dashboard (4 charts)
 *   Sec 4    — Full-width Filter Bar + Anomaly Table (newest event first)
 *   Sec 5    — Compact Event Timeline synchronized with selected anomaly
 *   Drawer   — Investigation Drawer opens on row or timeline selection
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

import { AnomalyExecutiveHeader } from '@/components/anomalies/AnomalyExecutiveHeader';
import { AnomalyDetectPanel } from '@/components/anomalies/AnomalyDetectPanel';
import { AnomalyDashboardCharts } from '@/components/anomalies/AnomalyDashboardCharts';
import { AnomalyFilterBar } from '@/components/anomalies/AnomalyFilterBar';
import { AnomalyTable } from '@/components/anomalies/AnomalyTable';
import { AnomalyTimeline } from '@/components/anomalies/AnomalyTimeline';
import { AnomalyInvestigationDrawer } from '@/components/anomalies/AnomalyInvestigationDrawer';

import anomalyApi from '@/services/anomalyApi';
import { toast } from '@/hooks/useToast';
import type {
  Anomaly, AnomalySummary,
  AnomalyFilters, AnomalyDetectRequest, AnomalyDetectResponse,
} from '@/types/anomaly';
import '@/styles/titan-dashboard.css';

const PER_PAGE = 50;

const DEFAULT_FILTERS: AnomalyFilters = {
  severity: 'all',
  anomaly_type: 'all',
  include_resolved: false,
  search: '',
};

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [allAnomalies, setAllAnomalies] = useState<Anomaly[]>([]);
  const [summary, setSummary] = useState<AnomalySummary | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AnomalyFilters>(DEFAULT_FILTERS);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerAnomaly, setDrawerAnomaly] = useState<Anomaly | null>(null);

  const loadList = useCallback(async (p = page, f = filters) => {
    setIsLoadingList(true);
    setSelectedIds(new Set());
    try {
      const params: Record<string, string | number | boolean> = {
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

  const loadAllForCharts = useCallback(async () => {
    setIsLoadingAll(true);
    try {
      const { data } = await anomalyApi.list({ page: 1, per_page: 500, include_resolved: true });
      setAllAnomalies(data.anomalies);
    } catch (err: unknown) {
      console.error('[loadAllForCharts] failed:', err);
    } finally {
      setIsLoadingAll(false);
    }
  }, []);

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

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      anomalyApi.list({ page: 1, per_page: PER_PAGE, include_resolved: DEFAULT_FILTERS.include_resolved })
        .then(({ data }) => {
          if (!isMounted) return;
          setAnomalies(data.anomalies);
          setTotal(data.total);
          setTotalPages(data.total_pages);
        })
        .catch(() => {
          if (isMounted) toast.error('Load failed', 'Could not fetch anomalies');
        })
        .finally(() => {
          if (isMounted) setIsLoadingList(false);
        }),
      anomalyApi.summary()
        .then(({ data }) => {
          if (isMounted) setSummary(data);
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoadingSummary(false);
        }),
      anomalyApi.list({ page: 1, per_page: 500, include_resolved: true })
        .then(({ data }) => {
          if (isMounted) setAllAnomalies(data.anomalies);
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoadingAll(false);
        }),
    ]);
    return () => { isMounted = false; };
  }, []);

  const handleFilterChange = useCallback((f: AnomalyFilters) => {
    setFilters(f);
    setPage(1);
    loadList(1, f);
  }, [loadList]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    loadList(p, filters);
  }, [filters, loadList]);

  const handleRefresh = useCallback(() => {
    loadList(page, filters);
    loadSummary();
    loadAllForCharts();
  }, [page, filters, loadList, loadSummary, loadAllForCharts]);

  const handleSelectToggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const handleDetect = useCallback(async (
    req: AnomalyDetectRequest
  ): Promise<AnomalyDetectResponse | null> => {
    setIsDetecting(true);
    try {
      const { data } = await anomalyApi.detect(req);
      const mode = req.comprehensive_sweep ? 'Comprehensive Sweep' : 'Scan';
      toast.success(
        `${mode} complete`,
        `${data.detected} anomal${data.detected !== 1 ? 'ies' : 'y'} found in ${data.computation_seconds.toFixed(2)}s`
      );
      await Promise.all([loadList(1, filters), loadSummary(), loadAllForCharts()]);
      return data;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Detection failed';
      toast.error('Detection error', typeof msg === 'string' ? msg : 'Unexpected error');
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [filters, loadList, loadSummary, loadAllForCharts]);

  // Client-side search + consistent newest-event-first sort matching AnomalyTimeline
  const filteredAnomalies = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const list = q
      ? anomalies.filter(
          (a) =>
            a.explanation?.toLowerCase().includes(q) ||
            a.anomaly_type.includes(q) ||
            a.event_date?.includes(q)
        )
      : anomalies;

    return [...list].sort((a, b) => {
      const da = new Date(a.event_date ?? a.detected_at).getTime();
      const db = new Date(b.event_date ?? b.detected_at).getTime();
      return db - da;
    });
  }, [anomalies, filters.search]);

  const handleRowClick = useCallback((a: Anomaly) => {
    setDrawerAnomaly(a);
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Compact Titan Editorial Page Header */}
      <header
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
        className="titan-dash-reveal pb-6 border-b border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.13em] text-[#52525b] dark:text-[#a1a1aa]">
            <span className="inline-block w-6 h-[1.5px] bg-[#f59e0b]" aria-hidden="true" />
            <span>ANOMALY INTELLIGENCE</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-[32px] font-extrabold text-[#0a0a0a] dark:text-[#fafaf9] tracking-[-0.02em] leading-[1.15]">
            Anomaly Intelligence
          </h1>
          <p className="text-sm text-[#52525b] dark:text-[#a1a1aa] mt-1.5 font-medium">
            Rolling z-score detection across demand, inventory &amp; forecast data
          </p>
        </div>

        <button
          id="refresh-all-btn"
          type="button"
          onClick={handleRefresh}
          disabled={isLoadingList}
          className="h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] hover:bg-[#fafaf9] dark:hover:bg-[#18181b] transition-colors self-start sm:self-end cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa] ${isLoadingList ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </header>

      {/* 2. Executive Intelligence Header */}
      <AnomalyExecutiveHeader
        summary={summary}
        anomalies={allAnomalies}
        isLoading={isLoadingSummary}
        isLoadingAnomalies={isLoadingAll}
      />

      {/* 3. Detection Control Center */}
      <AnomalyDetectPanel onDetect={handleDetect} isRunning={isDetecting} />

      {/* 4. Anomaly Breakdown Dashboard */}
      <AnomalyDashboardCharts
        summary={summary}
        anomalies={allAnomalies}
        isLoading={isLoadingSummary}
        isLoadingAnomalies={isLoadingAll}
      />

      {/* 5. Full-width Investigation Workspace: Filter Bar + Anomaly Table */}
      <section aria-label="Anomaly Records" className="flex flex-col gap-4">
        <AnomalyFilterBar
          filters={filters}
          onChange={handleFilterChange}
          isLoading={isLoadingList}
          onRefresh={handleRefresh}
          total={filters.search ? filteredAnomalies.length : total}
        />

        <AnomalyTable
          anomalies={filteredAnomalies}
          isLoading={isLoadingList}
          selectedIds={selectedIds}
          activeId={drawerAnomaly?.id ?? null}
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
      </section>

      {/* 6. Compact Synchronized Event Timeline */}
      <AnomalyTimeline
        anomalies={allAnomalies}
        isLoading={isLoadingSummary || isLoadingAll}
        activeId={drawerAnomaly?.id ?? null}
        onSelect={setDrawerAnomaly}
      />

      {/* Investigation Drawer */}
      <AnomalyInvestigationDrawer
        anomaly={drawerAnomaly}
        onClose={() => setDrawerAnomaly(null)}
        onResolve={handleResolve}
      />
    </div>
  );
}
