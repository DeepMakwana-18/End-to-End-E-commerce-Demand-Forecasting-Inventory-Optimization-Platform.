/** Forecasting Page — Titan AI Demand Forecasting & Explainability. */

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  TrendingUp, Calendar, Layers, ArrowUpRight, ArrowDownRight,
  Filter, Download, X, CheckCircle2, Database, Cpu,
  Upload, Activity, ArrowRight, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
  ReferenceLine, ReferenceArea,
} from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { ForecastExplainPanel } from '@/components/forecast/ForecastExplainPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonKPIRow, SkeletonChart } from '@/components/ui/Skeleton';
import { cn, formatNumber } from '@/lib/utils';
import { forecastApi, type ForecastExplainResponse } from '@/services/api';
import '@/styles/titan-dashboard.css';

interface TooltipEntry {
  name: string;
  value: number | [number, number];
  color?: string;
  stroke?: string;
  dataKey?: string;
  payload?: ForecastChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const formatFullDate = (dateStr?: string) => {
  if (!dateStr) return undefined;
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatShortDate = (dateStr?: string | null) => {
  if (!dateStr) return null;
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const dateFormatted = formatFullDate(point?.date);
  const isJunctionPoint =
    point?.actual !== undefined &&
    point?.predicted !== undefined &&
    point.actual === point.predicted &&
    point.week.startsWith('H');

  const visibleEntries = payload.filter((entry) => {
    if (entry.value === undefined || entry.dataKey === 'ciBand') return false;
    // On the H14 -> F1 connector point, show Actual Demand once instead of duplicating the same number
    if (isJunctionPoint && entry.dataKey === 'predicted') return false;
    return typeof entry.value === 'number';
  });

  return (
    <div className="titan-chart-tooltip rounded-[12px] p-3.5 bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg text-xs z-50 min-w-[205px]">
      <div className="mb-2 pb-1.5 border-b border-[#e4e4e7] dark:border-[#27272a]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] text-xs">
            {point?.week || label}
          </p>
          {isJunctionPoint && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#f1f1f3] dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa]">
              Forecast boundary
            </span>
          )}
        </div>
        {dateFormatted && (
          <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium mt-0.5">
            {dateFormatted}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        {visibleEntries.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-[#52525b] dark:text-[#a1a1aa]">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color || entry.stroke }}
              />
              <span className="truncate">{entry.name}:</span>
            </span>
            <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] font-sans tabular-nums">
              {formatNumber(entry.value as number)}
            </span>
          </div>
        ))}

        {point?.lower !== undefined && point?.upper !== undefined && (
          <div className="pt-2 mt-1.5 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between gap-3 text-[11px]">
            <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">95% CI Range:</span>
            <span className="font-mono text-[#0a0a0a] dark:text-[#fafaf9] font-semibold tabular-nums">
              [{formatNumber(point.lower)} – {formatNumber(point.upper)}]
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface HistoricalPoint {
  date: string;
  demand: number;
}

interface ForecastResponsePoint {
  week: number;
  date: string;
  predicted_demand: number;
  confidence_lower: number;
  confidence_upper: number;
}

interface ForecastApiResponse {
  historical?: HistoricalPoint[];
  forecasts?: ForecastResponsePoint[];
  accuracy?: number;
  rmse?: number;
  model_version?: string;
  data_source?: string;
  training_id?: number;
  training_samples?: number;
  has_model?: boolean;
}

interface CategoryPoint {
  category: string;
  current_demand: number;
  predicted_demand: number;
  change_pct: number;
}

interface CategoriesApiResponse {
  categories?: CategoryPoint[];
  data_date?: string | null;
  forecast_date?: string | null;
  product_linked?: boolean;
}

interface CategoryForecast {
  category: string;
  current: number;
  predicted: number;
  change: number;
}

interface ForecastChartPoint {
  week: string;
  date: string;
  actual?: number;
  predicted?: number;
  lower?: number;
  upper?: number;
  ciBand?: [number, number];
  label: string;
}

export default function ForecastPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const [forecastData, setForecastData] = useState<ForecastChartPoint[]>([]);
  const [categoryForecasts, setCategoryForecasts] = useState<CategoryForecast[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<{
    dataDate: string | null;
    forecastDate: string | null;
    productLinked: boolean;
  }>({ dataDate: null, forecastDate: null, productLinked: false });

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modelMetrics, setModelMetrics] = useState<{
    accuracy?: number;
    rmse?: number;
    version?: string;
    dataSource?: string;
    trainingId?: number;
    trainingSamples?: number;
    hasModel?: boolean;
  } | null>(null);

  // ── SHAP Explain state ──────────────────────────────────────────
  const [explainData, setExplainData] = useState<ForecastExplainResponse | null>(null);
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Helper to format the API response into chart data
  const formatResponse = (data: ForecastApiResponse) => {
    const formatDateLabel = (dStr: string) => {
      const dt = new Date(dStr);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const historical: ForecastChartPoint[] = (data.historical || []).map((h, i) => ({
      week: `H${i + 1}`,
      date: h.date,
      actual: h.demand,
      predicted: undefined,
      lower: undefined,
      upper: undefined,
      ciBand: undefined,
      label: formatDateLabel(h.date),
    }));

    const forecasts: ForecastChartPoint[] = (data.forecasts || []).map((d) => ({
      week: `F${d.week}`,
      date: d.date,
      actual: undefined,
      predicted: d.predicted_demand,
      lower: d.confidence_lower,
      upper: d.confidence_upper,
      ciBand: [d.confidence_lower, d.confidence_upper],
      label: formatDateLabel(d.date),
    }));

    // Connect the two lines at the junction point
    if (historical.length > 0 && forecasts.length > 0) {
      historical[historical.length - 1].predicted = historical[historical.length - 1].actual;
    }

    setForecastData([...historical, ...forecasts]);
    setModelMetrics({
      accuracy: data.accuracy,
      rmse: data.rmse,
      version: data.model_version,
      dataSource: data.data_source,
      trainingId: data.training_id,
      trainingSamples: data.training_samples,
      hasModel: data.has_model,
    });
  };

  const applyCategoriesResponse = (catData: CategoriesApiResponse) => {
    const categories = catData?.categories || [];
    setCategoryForecasts(categories.map((c) => ({
      category: c.category,
      current: c.current_demand,
      predicted: c.predicted_demand,
      change: c.change_pct,
    })));
    setCategoryMeta({
      dataDate: catData?.data_date ?? null,
      forecastDate: catData?.forecast_date ?? null,
      productLinked: Boolean(catData?.product_linked),
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRetry = async () => {
    setIsLoading(true);
    setFetchError(null);
    setExplainData(null);
    setExplainError(null);
    try {
      const res = await forecastApi.get(12);
      formatResponse(res.data as ForecastApiResponse);
      const catRes = await forecastApi.getCategories();
      applyCategoriesResponse(catRes.data as CategoriesApiResponse);
    } catch (err: unknown) {
      console.error(err);
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load ML forecasts from backend';
      setFetchError(errorMsg);
      showToast(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Initial load ────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await forecastApi.get(12);
        if (!isMounted) return;
        formatResponse(res.data as ForecastApiResponse);
        const catRes = await forecastApi.getCategories();
        if (!isMounted) return;
        applyCategoriesResponse(catRes.data as CategoriesApiResponse);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error(err);
        const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load ML forecasts from backend';
        setFetchError(errorMsg);
        showToast(errorMsg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Fetch explanations after forecast data is ready
  useEffect(() => {
    if (isLoading || forecastData.length === 0) return;
    let isMounted = true;

    (async () => {
      try {
        setIsExplainLoading(true);
        setExplainError(null);
        const res = await forecastApi.getExplain(12);
        if (!isMounted) return;
        setExplainData(res.data);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error('SHAP explain error:', err);
        const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Could not load SHAP explanations.';
        setExplainError(errorMsg);
      } finally {
        if (isMounted) setIsExplainLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [isLoading, forecastData.length]);

  const filteredCategories = useMemo(() => {
    if (selectedCategory === 'all') return categoryForecasts;
    return categoryForecasts.filter(c => c.category === selectedCategory);
  }, [selectedCategory, categoryForecasts]);

  const handleExport = () => {
    const headers = ['Category', 'Current Demand', 'Predicted Demand', 'Change %'];
    const rows = filteredCategories.map(c => `${c.category},${c.current},${c.predicted},${c.change}`);
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Forecast report exported as CSV');
  };

  const isZeroData = !isLoading && (
    modelMetrics
      ? modelMetrics.hasModel === false || forecastData.length === 0
      : forecastData.length === 0
  );

  const historicalEndWeek = useMemo(() => {
    const lastH = forecastData.filter(d => d.week.startsWith('H')).pop();
    return lastH?.week;
  }, [forecastData]);

  const forecastStartWeek = useMemo(() => {
    const firstF = forecastData.filter(d => d.week.startsWith('F'))[0];
    return firstF?.week;
  }, [forecastData]);

  const forecastEndWeek = useMemo(() => {
    const lastF = forecastData.filter(d => d.week.startsWith('F')).pop();
    return lastF?.week;
  }, [forecastData]);

  const currentWindowCaption = useMemo(() => {
    if (categoryMeta.productLinked) {
      const formatted = formatShortDate(categoryMeta.dataDate);
      return formatted ? `Observed (${formatted})` : 'Latest observed period';
    }
    return 'Last 4 observed weeks';
  }, [categoryMeta]);

  const predictedWindowCaption = useMemo(() => {
    if (categoryMeta.productLinked) {
      const formatted = formatShortDate(categoryMeta.forecastDate);
      return formatted ? `Projected (${formatted})` : 'Next projected period';
    }
    return 'Next 4 projected weeks';
  }, [categoryMeta]);

  return (
    <div className="space-y-5 sm:space-y-6 pb-4">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-[12px] bg-ds-surface border border-ds-hairline text-ds-text-primary text-xs font-semibold flex items-center gap-2 shadow-ds-float-2"
          >
            <CheckCircle2 className="w-4 h-4 text-ds-green flex-shrink-0" aria-hidden="true" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title="Demand Forecasting"
        description="ML-powered demand predictions with confidence intervals & SHAP explainability"
        actions={
          !isZeroData && !isLoading ? (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  aria-expanded={showFilters}
                  aria-haspopup="listbox"
                  className={cn(
                    'h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2',
                    showFilters || selectedCategory !== 'all'
                      ? 'bg-ds-sidebar-active text-ds-sidebar-active-text border-ds-sidebar-active-border'
                      : 'bg-ds-surface text-ds-text-primary border-ds-hairline hover:bg-ds-surface-sunken'
                  )}
                >
                  <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{selectedCategory === 'all' ? 'Filters' : selectedCategory}</span>
                </button>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.14 }}
                      role="listbox"
                      aria-label="Filter by category"
                      className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-56 rounded-[12px] p-2 z-50 space-y-1 shadow-ds-float-2 bg-ds-surface border border-ds-hairline"
                    >
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-ds-hairline">
                        <span className="text-xs font-semibold text-ds-text-primary">Filter by Category</span>
                        <button
                          type="button"
                          onClick={() => setShowFilters(false)}
                          aria-label="Close filters"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-sunken transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {['all', ...categoryForecasts.map(c => c.category)].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          role="option"
                          aria-selected={selectedCategory === cat}
                          onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer',
                            selectedCategory === cat
                              ? 'bg-ds-sidebar-active text-ds-sidebar-active-text'
                              : 'text-ds-text-secondary hover:bg-ds-surface-sunken hover:text-ds-text-primary'
                          )}
                        >
                          {cat === 'all' ? 'All Categories' : cat}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={handleExport}
                className="h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 bg-ds-blue hover:bg-ds-blue-strong text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export</span>
              </button>
            </>
          ) : undefined
        }
      />

      {/* Network / API Fetch Error Banner */}
      {fetchError && !isLoading && (
        <div className="p-4 rounded-[16px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 flex items-center justify-between gap-3 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1.5 rounded-[8px] bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] hover:bg-[#fafaf9] flex items-center gap-1.5 font-semibold text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* 2. Loading State */}
      {isLoading ? (
        <div className="space-y-5" aria-busy="true" aria-label="Loading forecast telemetry">
          <SkeletonKPIRow />
          <SkeletonChart />
        </div>
      ) : isZeroData ? (
        /* 3. Empty-State Panel */
        <div className="max-w-2xl mx-auto my-6 sm:my-8 p-7 sm:p-10 rounded-[20px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-[14px] bg-[#0a0a0a] dark:bg-[#fafaf9] text-[#fafaf9] dark:text-[#0a0a0a] flex items-center justify-center mb-5">
            <Layers className="w-7 h-7" aria-hidden="true" />
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight mb-2">
            No Forecast Data
          </h2>
          <p className="text-xs sm:text-sm text-[#52525b] dark:text-[#a1a1aa] max-w-md leading-relaxed">
            Demand forecasting requires an uploaded transaction dataset and a trained ML model. Follow the workflow below to generate predictions.
          </p>

          <div className="my-6 w-full max-w-lg p-4 rounded-[14px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#52525b] dark:text-[#a1a1aa] mb-3 text-left">
              Forecasting Workflow
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="w-9 h-9 rounded-[10px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#1e3fc8] dark:text-[#60a5fa] flex items-center justify-center mb-1.5">
                  <Database className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-[#0a0a0a] dark:text-[#fafaf9]">1. Dataset</span>
                <span className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] hidden sm:inline">Upload sales logs</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#52525b] dark:text-[#a1a1aa] mb-3" />
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="w-9 h-9 rounded-[10px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] flex items-center justify-center mb-1.5">
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-[#0a0a0a] dark:text-[#fafaf9]">2. Training</span>
                <span className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] hidden sm:inline">Train ML model</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#52525b] dark:text-[#a1a1aa] mb-3" />
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="w-9 h-9 rounded-[10px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#16a34a] flex items-center justify-center mb-1.5">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-[#0a0a0a] dark:text-[#fafaf9]">3. Forecast</span>
                <span className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] hidden sm:inline">Predictive trends</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to="/app/admin/upload"
              className="w-full sm:w-auto h-10 px-5 rounded-[10px] text-xs font-semibold inline-flex items-center justify-center gap-2 bg-[#1e3fc8] hover:bg-[#1935a8] text-white transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Dataset</span>
            </Link>
            <Link
              to="/app/admin/pipeline"
              className="w-full sm:w-auto h-10 px-4 rounded-[10px] text-xs font-semibold inline-flex items-center justify-center gap-2 bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] hover:bg-[#fafaf9] dark:hover:bg-[#18181b] transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Go to ML Pipeline</span>
            </Link>
          </div>
        </div>
      ) : (
        /* 4. Populated Forecasting Analytics */
        <>
          {/* Forecast KPIs */}
          <section
            aria-label="Forecast Key Metrics"
            style={{ '--reveal-delay': '60ms' } as React.CSSProperties}
            className="titan-dash-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
          >
            <KPICard
              title="Model Accuracy"
              value={modelMetrics?.accuracy ? `${modelMetrics.accuracy}%` : '—'}
              icon={TrendingUp}
            />
            <KPICard
              title="RMSE Score"
              value={modelMetrics?.rmse ? String(modelMetrics.rmse) : '—'}
              sub="Lower is better"
              icon={Layers}
            />
            <KPICard
              title="Forecast Horizon"
              value="12 Weeks"
              sub="12-week output horizon"
              icon={Calendar}
            />
            <KPICard
              title="Next Week Demand"
              value={(() => {
                const f = forecastData.find(d => d.predicted !== undefined && d.predicted !== null && d.week.startsWith('F'));
                return f && f.predicted !== undefined ? formatNumber(f.predicted) : '—';
              })()}
              icon={ArrowUpRight}
            />
          </section>

          {/* Main Forecast Chart with Confidence Intervals */}
          <ChartCard
            title="Demand Forecast with Confidence Intervals"
            subtitle={`Trained on: ${modelMetrics?.dataSource || 'synthetic'} (${modelMetrics?.trainingSamples || '?'} samples) · ${modelMetrics?.version || 'ML'} predictions`}
            headerVariant="tinted"
            actions={
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40">
                95% Confidence Interval
              </span>
            }
          >
            <ResponsiveContainer width="100%" height={330}>
              <AreaChart data={forecastData} margin={{ top: 22, right: 12, left: -10, bottom: 4 }}>
                <defs>
                  <linearGradient id="titanCiBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3fc8" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#1e3fc8" stopOpacity={0.10} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: 'var(--ds-hairline)' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  allowEscapeViewBox={{ x: false, y: false }}
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                />
                {historicalEndWeek && (
                  <ReferenceLine
                    x={historicalEndWeek}
                    stroke="#1e3fc8"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{
                      value: 'Forecast start',
                      position: 'top',
                      fill: '#1e3fc8',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
                {forecastStartWeek && forecastEndWeek && (
                  <ReferenceArea
                    x1={forecastStartWeek}
                    x2={forecastEndWeek}
                    fill="#1e3fc8"
                    fillOpacity={0.035}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="ciBand"
                  name="95% Confidence Interval"
                  stroke="#3b82f6"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  fill="url(#titanCiBand)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Demand"
                  stroke="var(--ds-text-primary, #0a0a0a)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--ds-text-primary, #0a0a0a)', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: 'var(--ds-text-primary, #0a0a0a)', strokeWidth: 2, fill: '#FFFFFF' }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted Demand"
                  stroke="#1e3fc8"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={{ fill: '#1e3fc8', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: '#1e3fc8', strokeWidth: 2, fill: '#FFFFFF' }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Clear custom legend with recognizable visual samples */}
            <div
              aria-label="Chart legend"
              className="mt-3 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa]"
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-5 h-[2.5px] bg-[#0a0a0a] dark:bg-[#fafaf9] rounded-full" aria-hidden="true" />
                <span className="text-[#0a0a0a] dark:text-[#fafaf9]">Actual Demand (H1–H14)</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-5 border-t-[2.5px] border-dashed border-[#1e3fc8] dark:border-[#60a5fa]" aria-hidden="true" />
                <span className="text-[#0a0a0a] dark:text-[#fafaf9]">Predicted Demand (F1–F12)</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-4 h-3 rounded-[3px] bg-[#1e3fc8]/20 border border-[#3b82f6]/50" aria-hidden="true" />
                <span className="text-[#0a0a0a] dark:text-[#fafaf9]">95% Confidence Interval</span>
              </span>
              <span className="text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                (H = Historical weeks · F = Forecast weeks)
              </span>
            </div>
          </ChartCard>

          {/* ── SHAP Forecast Explainability Panel ──────────────────────── */}
          <ForecastExplainPanel
            weeks={explainData?.weeks ?? []}
            featureNames={explainData?.feature_names ?? []}
            modelType={explainData?.model_type ?? ''}
            dataSource={explainData?.data_source ?? modelMetrics?.dataSource ?? ''}
            explainerReady={explainData?.explainer_ready ?? false}
            isLoading={isExplainLoading}
            error={explainError}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Category Forecasts */}
            <ChartCard
              title="Category Forecast Summary"
              subtitle={selectedCategory === 'all' ? 'Observed vs projected demand comparison' : `Showing: ${selectedCategory}`}
              headerVariant="tinted"
            >
              {filteredCategories.length === 1 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                        Active Scope
                      </span>
                      <p className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9] mt-0.5 truncate">
                        {filteredCategories[0].category}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'px-2.5 py-1 rounded-[8px] text-xs font-bold tabular-nums border flex items-center gap-1',
                        filteredCategories[0].change > 0
                          ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60'
                          : filteredCategories[0].change < 0
                            ? 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60'
                            : 'bg-[#f1f1f3] text-[#3f3f46] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]'
                      )}
                    >
                      {filteredCategories[0].change > 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : filteredCategories[0].change < 0 ? (
                        <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : null}
                      <span>
                        {filteredCategories[0].change > 0 ? '+' : ''}
                        {filteredCategories[0].change}%{' '}
                        {filteredCategories[0].change > 0 ? 'increase' : filteredCategories[0].change < 0 ? 'decrease' : 'change'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                      <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">Current Volume</p>
                      <p className="text-xl font-bold font-sans tabular-nums text-[#0a0a0a] dark:text-[#fafaf9] mt-1">
                        {formatNumber(filteredCategories[0].current)}
                      </p>
                      <span className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium block mt-0.5">
                        {currentWindowCaption}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                      <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">Predicted Volume</p>
                      <p className="text-xl font-bold font-sans tabular-nums text-[#1e3fc8] dark:text-[#60a5fa] mt-1">
                        {formatNumber(filteredCategories[0].predicted)}
                      </p>
                      <span className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium block mt-0.5">
                        {predictedWindowCaption}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between text-xs">
                    <span className="text-[#52525b] dark:text-[#a1a1aa] font-medium">Net Variance:</span>
                    <span className="font-bold tabular-nums text-[#0a0a0a] dark:text-[#fafaf9]">
                      {filteredCategories[0].predicted - filteredCategories[0].current > 0 ? '+' : ''}
                      {formatNumber(filteredCategories[0].predicted - filteredCategories[0].current)} units
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCategories.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between gap-4 p-3.5 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate">{cat.category}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs">
                          <span className="text-[#52525b] dark:text-[#a1a1aa] font-sans tabular-nums font-medium">
                            {currentWindowCaption}: {formatNumber(cat.current)}
                          </span>
                          <span className="text-[#52525b] dark:text-[#a1a1aa]">→</span>
                          <span className="font-bold text-[#0a0a0a] dark:text-[#fafaf9] font-sans tabular-nums">
                            {predictedWindowCaption}: {formatNumber(cat.predicted)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          'px-2.5 py-1 rounded-[8px] text-xs font-semibold tabular-nums border flex items-center gap-1 flex-shrink-0',
                          cat.change > 0
                            ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60'
                            : cat.change < 0
                              ? 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60'
                              : 'bg-[#f1f1f3] text-[#3f3f46] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]'
                        )}
                      >
                        {cat.change > 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : cat.change < 0 ? (
                          <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : null}
                        <span>
                          {cat.change > 0 ? '+' : ''}
                          {cat.change}% {cat.change > 0 ? 'increase' : cat.change < 0 ? 'decrease' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Seasonal Pattern */}
            <ChartCard
              title="Seasonal Demand Pattern"
              subtitle="Calendar-date demand trajectory across observed and projected periods"
              headerVariant="tinted"
            >
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={forecastData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-hairline)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--ds-hairline)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={26}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ds-text-muted)', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                  content={<CustomTooltip />}
                  allowEscapeViewBox={{ x: false, y: false }}
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Demand"
                    stroke="var(--ds-text-primary, #0a0a0a)"
                    strokeWidth={2.5}
                    dot={{ fill: 'var(--ds-text-primary, #0a0a0a)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: 'var(--ds-text-primary, #0a0a0a)', strokeWidth: 2, fill: '#FFFFFF' }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted Demand"
                    stroke="#1e3fc8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4.5, stroke: '#1e3fc8', strokeWidth: 2, fill: '#FFFFFF' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-3 pt-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa]">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-4 h-[2.5px] bg-[#0a0a0a] dark:bg-[#fafaf9] rounded-full" aria-hidden="true" />
                  <span className="text-[#0a0a0a] dark:text-[#fafaf9]">Actual</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-4 border-t-[2px] border-dashed border-[#1e3fc8] dark:border-[#60a5fa]" aria-hidden="true" />
                  <span className="text-[#0a0a0a] dark:text-[#fafaf9]">Projected</span>
                </span>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
