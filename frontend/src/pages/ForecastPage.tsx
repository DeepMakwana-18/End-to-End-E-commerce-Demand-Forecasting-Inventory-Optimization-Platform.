/** Forecasting Page - Product-wise & category demand forecasts with charts. */

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Calendar, Layers, ArrowUpRight, ArrowDownRight,
  Filter, Download, X, CheckCircle2, Loader2, Database, Cpu,
  Upload, Activity, ArrowRight, Sparkles, AlertTriangle, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { ForecastExplainPanel } from '@/components/forecast/ForecastExplainPanel';
import { cn, formatNumber } from '@/lib/utils';
import { forecastApi, type ForecastExplainResponse } from '@/services/api';

interface TooltipEntry {
  name: string;
  value: number;
  color?: string;
  stroke?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 bg-ds-surface border border-ds-border shadow-ds-float-2 text-xs z-50 min-w-[160px]">
      <p className="font-bold text-ds-text-primary mb-1.5 pb-1 border-b border-ds-hairline">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-ds-text-muted">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || entry.stroke }} />
              <span className="truncate">{entry.name}:</span>
            </span>
            <span className="font-bold text-ds-text-primary font-sans tabular-nums">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
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
  label: string;
}

export default function ForecastPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);
  
  const [forecastData, setForecastData] = useState<ForecastChartPoint[]>([]);
  const [categoryForecasts, setCategoryForecasts] = useState<CategoryForecast[]>([]);
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
    const historical: ForecastChartPoint[] = (data.historical || []).map((h, i) => ({
      week: `H${i + 1}`,
      date: h.date,
      actual: h.demand,
      predicted: undefined,
      lower: undefined,
      upper: undefined,
      label: new Date(h.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    }));
    
    const forecasts: ForecastChartPoint[] = (data.forecasts || []).map((d) => ({
      week: `F${d.week}`,
      date: d.date,
      actual: undefined,
      predicted: d.predicted_demand,
      lower: d.confidence_lower,
      upper: d.confidence_upper,
      label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
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
      const categories = (catRes.data as { categories?: CategoryPoint[] })?.categories || [];
      setCategoryForecasts(categories.map((c) => ({
        category: c.category,
        current: c.current_demand,
        predicted: c.predicted_demand,
        change: c.change_pct
      })));
    } catch (err: unknown) {
      console.error(err);
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load ML forecasts from backend';
      setFetchError(errorMsg);
      showToast(`❌ ${errorMsg}`);
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
        const categories = (catRes.data as { categories?: CategoryPoint[] })?.categories || [];
        setCategoryForecasts(categories.map((c) => ({
          category: c.category,
          current: c.current_demand,
          predicted: c.predicted_demand,
          change: c.change_pct
        })));
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error(err);
        const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load ML forecasts from backend';
        setFetchError(errorMsg);
        showToast(`❌ ${errorMsg}`);
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
    showToast('✅ Forecast report exported as CSV');
  };

  const isZeroData = !isLoading && (
    modelMetrics
      ? modelMetrics.hasModel === false || forecastData.length === 0
      : forecastData.length === 0
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-ds-surface border border-ds-border text-ds-text-primary text-xs font-semibold flex items-center gap-2 shadow-ds-float-2 backdrop-blur-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-ds-emerald-success" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header with elevated container matching Inventory direction */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
        {/* Subtle blue-to-indigo decorative glow without impairing text readability */}
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600 inline-block" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-ds-text-heading tracking-tight">
                Demand Forecasting
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-ds-text-secondary mt-0.5 ml-3.5 font-medium">
              ML-powered demand predictions with SHAP explainability
            </p>
          </div>
        </div>

        {/* Action Controls (Active when data exists) */}
        {!isZeroData && !isLoading && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto relative z-10">
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'btn-apple btn-apple-soft text-xs h-9 px-3.5 shadow-2xs border border-ds-border',
                  showFilters && 'bg-ds-blue-surface text-ds-blue-text border-ds-blue/30'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {selectedCategory !== 'all' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-ds-blue" />
                )}
              </button>
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.96 }}
                    className="absolute right-0 top-full mt-2 w-56 card-apple p-2 z-50 space-y-1 shadow-ds-float-2 bg-ds-surface/98 backdrop-blur-xl border border-ds-border"
                  >
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-ds-hairline">
                      <span className="text-xs font-bold text-ds-text-primary">Filter by Category</span>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-ds-text-muted hover:text-ds-text-primary hover:bg-ds-surface-sunken transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {['all', ...categoryForecasts.map(c => c.category)].map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                          selectedCategory === cat
                            ? 'bg-ds-blue text-white shadow-xs'
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
              onClick={handleExport}
              className="btn-apple btn-apple-primary text-xs h-9 px-3.5 shadow-sm inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Network / API Fetch Error Banner */}
      {fetchError && !isLoading && (
        <div className="p-4 rounded-2xl bg-ds-red-surface border border-ds-red/20 text-ds-red-text flex items-center justify-between gap-3 text-xs font-medium shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-ds-red" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={handleRetry}
            className="px-3 py-1 rounded-lg bg-white dark:bg-ds-surface text-ds-red-text border border-ds-red/25 hover:bg-ds-surface-sunken flex items-center gap-1.5 font-semibold text-xs shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* 2. Loading State */}
      {isLoading ? (
        <div className="card-apple p-12 sm:p-16 flex flex-col items-center justify-center text-center my-6">
          <div className="w-12 h-12 rounded-2xl bg-ds-blue-surface text-ds-blue flex items-center justify-center mb-4 shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-ds-text-primary">Loading Forecast Telemetry</h3>
          <p className="text-xs text-ds-text-muted mt-1.5 max-w-sm">
            Retrieving machine learning model predictions, confidence intervals, and SHAP drivers...
          </p>
        </div>
      ) : isZeroData ? (
        /* 3. Polished Empty-State Panel */
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.28, 0.11, 0.32, 1] }}
          className="max-w-2xl mx-auto my-6 sm:my-8 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-[#F0F5FF]/90 via-[#F8FAFF]/90 to-white dark:bg-none dark:bg-ds-surface border border-blue-200/70 dark:border-ds-border shadow-[0_16px_40px_rgba(37,99,235,0.07)] flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Subtle ambient gradient highlights */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-indigo-400/15 to-teal-400/15 rounded-full blur-3xl pointer-events-none" />

          {/* Large layered illustration-style icon */}
          <div className="relative mb-5 flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-blue-500/15 via-indigo-500/15 to-teal-500/15 border border-blue-300/30 flex items-center justify-center shadow-inner relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Layers className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              {/* Floating accent badge */}
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white dark:bg-surface-800 text-blue-600 dark:text-blue-400 shadow-md border border-blue-100 dark:border-blue-900/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Existing "No Forecast Data" Heading */}
          <h2 className="text-xl sm:text-2xl font-extrabold text-ds-text-heading tracking-tight mb-2">
            No Forecast Data
          </h2>

          {/* Concise guidance */}
          <p className="text-xs sm:text-sm text-ds-text-secondary max-w-md leading-relaxed">
            Demand forecasting requires an uploaded transaction dataset and a successfully trained ML model. Follow the workflow below to generate predictive insights.
          </p>

          {/* Informational Workflow Visual: Dataset → Training → Forecast */}
          <div className="my-6 w-full max-w-lg p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-surface-800/60 border border-blue-100 dark:border-ds-border shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ds-text-muted mb-3 text-left">
              Forecasting Workflow
            </p>
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              {/* Step 1: Dataset */}
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center shadow-2xs mb-1.5">
                  <Database className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-ds-text-primary">1. Dataset</span>
                <span className="text-[10px] text-ds-text-muted hidden sm:inline">Upload sales logs</span>
              </div>

              {/* Arrow */}
              <div className="text-blue-300 dark:text-ds-text-muted pb-3">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Step 2: Training */}
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-center shadow-2xs mb-1.5">
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-ds-text-primary">2. Training</span>
                <span className="text-[10px] text-ds-text-muted hidden sm:inline">Train ML model</span>
              </div>

              {/* Arrow */}
              <div className="text-indigo-300 dark:text-ds-text-muted pb-3">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Step 3: Forecast */}
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center shadow-2xs mb-1.5">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-ds-text-primary">3. Forecast</span>
                <span className="text-[10px] text-ds-text-muted hidden sm:inline">Predictive trends</span>
              </div>
            </div>
          </div>

          {/* Action buttons with verified routes */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to="/app/admin/upload"
              className="btn-apple btn-apple-primary w-full sm:w-auto text-xs h-10 px-5 shadow-sm inline-flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Dataset</span>
            </Link>
            <Link
              to="/app/admin/pipeline"
              className="btn-apple btn-apple-soft w-full sm:w-auto text-xs h-10 px-4 inline-flex items-center justify-center gap-2 bg-white dark:bg-ds-surface border border-ds-border hover:bg-ds-surface-sunken"
            >
              <Activity className="w-4 h-4" />
              <span>Go to ML Pipeline</span>
            </Link>
          </div>
        </motion.div>
      ) : (
        /* 4. Populated Forecasting Analytics */
        <>
          {/* Forecast KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <KPICard
              title="Model Accuracy"
              value={modelMetrics?.accuracy ? `${modelMetrics.accuracy}%` : "—"}
              change={modelMetrics?.accuracy ? 2.1 : undefined}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-emerald-600 to-teal-600"
              glowColor="rgba(5, 150, 105, 0.25)"
              delay={0}
            />
            <KPICard
              title="RMSE Score"
              value={modelMetrics?.rmse ? String(modelMetrics.rmse) : "—"}
              change={modelMetrics?.rmse ? -8.5 : undefined}
              icon={Layers}
              gradient="bg-gradient-to-br from-indigo-600 to-blue-600"
              glowColor="rgba(99, 102, 241, 0.25)"
              delay={0.05}
            />
            <KPICard
              title="Forecast Horizon"
              value="12 Weeks"
              icon={Calendar}
              gradient="bg-gradient-to-br from-amber-500 to-amber-600"
              glowColor="rgba(217, 119, 6, 0.25)"
              delay={0.1}
            />
            <KPICard
              title="Next Week Demand"
              value={(() => {
                const f = forecastData.find(d => d.predicted !== undefined && d.predicted !== null);
                return f && f.predicted !== undefined ? formatNumber(f.predicted) : "—";
              })()}
              change={forecastData.length > 0 ? 12.3 : undefined}
              icon={ArrowUpRight}
              gradient="bg-gradient-to-br from-blue-600 to-indigo-600"
              glowColor="rgba(37, 99, 235, 0.25)"
              delay={0.15}
            />
          </div>

          {/* Main Forecast Chart with Confidence Intervals */}
          <ChartCard
            title="Demand Forecast with Confidence Intervals"
            subtitle={`Trained on: ${modelMetrics?.dataSource || 'synthetic'} (${modelMetrics?.trainingSamples || '?'} samples) | ${modelMetrics?.version || 'ML'} predictions`}
            delay={0.2}
            headerVariant="tinted"
            actions={
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-ds-blue-surface text-ds-blue-on-surface border border-ds-blue/20">
                95% Confidence Interval
              </span>
            }
          >
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '12px', color: '#475569' }}
                />
                <Area type="monotone" dataKey="upper" name="Upper CI" stroke="transparent" fill="url(#ciGrad)" />
                <Area type="monotone" dataKey="lower" name="Lower CI" stroke="transparent" fill="transparent" />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Demand"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ fill: '#2563EB', r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5.5, stroke: '#2563EB', strokeWidth: 2, fill: '#FFFFFF' }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted Demand"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ fill: '#6366F1', r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5.5, stroke: '#6366F1', strokeWidth: 2, fill: '#FFFFFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
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
              subtitle={selectedCategory === 'all' ? 'Predicted demand changes by category' : `Showing: ${selectedCategory}`}
              delay={0.25}
              headerVariant="tinted"
            >
              <div className="space-y-3">
                {filteredCategories.map((cat, i) => (
                  <motion.div
                    key={cat.category}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    className="flex items-center gap-4 p-3.5 rounded-xl bg-ds-surface-sunken hover:bg-ds-surface transition-all duration-150 border border-ds-hairline shadow-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-ds-text-primary truncate">{cat.category}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-ds-text-muted font-sans tabular-nums font-medium">
                          Current: {formatNumber(cat.current)}
                        </span>
                        <span className="text-ds-text-muted">→</span>
                        <span className="font-bold text-ds-text-primary font-sans tabular-nums">
                          Predicted: {formatNumber(cat.predicted)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums border flex items-center gap-1 flex-shrink-0',
                        cat.change > 0
                          ? 'bg-ds-green-surface text-ds-green-text border-ds-green/20'
                          : 'bg-ds-red-surface text-ds-red-text border-ds-red/20'
                      )}
                    >
                      {cat.change > 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-ds-green" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-ds-red" />
                      )}
                      <span>{Math.abs(cat.change)}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ChartCard>

            {/* Seasonal Pattern */}
            <ChartCard
              title="Seasonal Demand Pattern"
              subtitle="Monthly demand seasonality analysis"
              delay={0.3}
              headerVariant="tinted"
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={forecastData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Demand"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ fill: '#2563EB', r: 3.5, strokeWidth: 0 }}
                    activeDot={{ r: 5.5, stroke: '#2563EB', strokeWidth: 2, fill: '#FFFFFF' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted Demand"
                    stroke="#6366F1"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
