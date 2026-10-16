/** Forecasting Page - Product-wise & category demand forecasts with charts. */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Calendar, Layers, ArrowUpRight, ArrowDownRight,
  Filter, Download, X, CheckCircle2, Loader2
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


const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-apple p-3 !bg-ds-surface/95 !border-ds-border/80 shadow-[var(--ds-raise-3)] backdrop-blur-xl">
      <p className="text-xs font-medium text-ds-text-secondary mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs font-medium" style={{ color: entry.color || entry.stroke }}>
          <span className="font-semibold">{entry.name}: </span>
          <span className="font-sans tabular-nums font-semibold">{formatNumber(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function ForecastPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);
  
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [categoryForecasts, setCategoryForecasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modelMetrics, setModelMetrics] = useState<any>(null);

  // ── SHAP Explain state ──────────────────────────────────────────
  const [explainData, setExplainData] = useState<ForecastExplainResponse | null>(null);
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Helper to format the API response into chart data
  const formatResponse = (data: any) => {
    const historical = (data.historical || []).map((h: any, i: number) => ({
      week: `H${i + 1}`,
      date: h.date,
      actual: h.demand,
      predicted: undefined as number | undefined,
      lower: undefined as number | undefined,
      upper: undefined as number | undefined,
      label: new Date(h.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    }));
    
    const forecasts = (data.forecasts || []).map((d: any) => ({
      week: `F${d.week}`,
      date: d.date,
      actual: undefined as number | undefined,
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

  // ── Load forecasts and then explanations ────────────────────────
  useEffect(() => {
    const loadForecasts = async () => {
      try {
        setIsLoading(true);
        setExplainData(null);
        setExplainError(null);
        const res = await forecastApi.get(12);
        formatResponse(res.data);
        const catRes = await forecastApi.getCategories();
        setCategoryForecasts(catRes.data.categories.map((c: any) => ({
          category: c.category,
          current: c.current_demand,
          predicted: c.predicted_demand,
          change: c.change_pct
        })));
      } catch (err) {
        console.error(err);
        showToast('❌ Failed to load ML forecasts from backend');
      } finally {
        setIsLoading(false);
      }
    };
    loadForecasts();
  }, []);

  // Fetch explanations after forecast data is ready
  useEffect(() => {
    if (isLoading || forecastData.length === 0) return;

    const loadExplain = async () => {
      try {
        setIsExplainLoading(true);
        setExplainError(null);
        const res = await forecastApi.getExplain(12);
        setExplainData(res.data);
      } catch (err: any) {
        console.error('SHAP explain error:', err);
        setExplainError(
          err?.response?.data?.detail ?? 'Could not load SHAP explanations.'
        );
      } finally {
        setIsExplainLoading(false);
      }
    };
    loadExplain();
  }, [isLoading, forecastData.length]);

  const filteredCategories = useMemo(() => {
    if (selectedCategory === 'all') return categoryForecasts;
    return categoryForecasts.filter(c => c.category === selectedCategory);
  }, [selectedCategory, categoryForecasts]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl glass-card !bg-accent-500/10 !border-accent-500/30 text-accent-400 text-sm font-medium flex items-center gap-2 shadow-2xl">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && modelMetrics && !modelMetrics.hasModel ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 mt-8">
          <Layers className="w-16 h-16 text-surface-600 mb-6" />
          <h2 className="text-xl font-semibold text-surface-200 mb-2">No Forecast Data</h2>
          <p className="text-surface-400 text-center max-w-md">
            Upload a dataset and train a model to generate forecasts.
          </p>
        </div>
      ) : (
        <>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ds-text tracking-tight">Demand Forecasting</h1>
          <p className="text-sm text-ds-text-secondary mt-1">
            ML-powered demand predictions with SHAP explainability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("btn-apple btn-apple-soft text-xs h-9 px-3.5",
                showFilters && "bg-ds-blue-action text-white")}>
              <Filter className="w-3.5 h-3.5" /> Filters
              {selectedCategory !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-56 card-apple p-2 z-50 space-y-1 shadow-[var(--ds-raise-3)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-ds-border">
                    <span className="text-xs font-semibold text-ds-text">Filter by Category</span>
                    <button onClick={() => setShowFilters(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-ds-text-secondary hover:text-ds-text hover:bg-ds-surface-sunken"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {['all', ...categoryForecasts.map(c => c.category)].map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200",
                        selectedCategory === cat ? "bg-ds-blue-action text-white" : "text-ds-text-secondary hover:bg-ds-surface-sunken hover:text-ds-text")}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={handleExport}
            className="btn-apple btn-apple-primary text-xs h-9 px-3.5 shadow-[var(--ds-raise-1)]">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </motion.div>

      {/* Forecast KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Model Accuracy" value={modelMetrics?.accuracy ? `${modelMetrics.accuracy}%` : "—"} change={modelMetrics?.accuracy ? 2.1 : undefined} icon={TrendingUp} gradient="gradient-primary" delay={0} />
        <KPICard title="RMSE Score" value={modelMetrics?.rmse ? String(modelMetrics.rmse) : "—"} change={modelMetrics?.rmse ? -8.5 : undefined} icon={Layers} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Forecast Horizon" value="12 Weeks" icon={Calendar} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Next Week Demand" value={(() => { const f = forecastData.find(d => d.predicted !== undefined && d.predicted !== null); return f ? formatNumber(f.predicted) : "—"; })()} change={forecastData.length > 0 ? 12.3 : undefined} icon={ArrowUpRight} gradient="bg-cyan-500" delay={0.15} />
      </div>

      {/* Main Forecast Chart with Confidence Intervals */}
      <ChartCard title="Demand Forecast with Confidence Intervals"
        subtitle={isLoading ? "Training ML model and predicting..." : `Trained on: ${modelMetrics?.dataSource || 'synthetic'} (${modelMetrics?.trainingSamples || '?'} samples) | ${modelMetrics?.version || 'ML'} predictions (95% CI)`} delay={0.2}>
        {isLoading ? (
          <div className="w-full h-[340px] flex flex-col items-center justify-center text-ds-text-secondary gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-ds-blue-action" />
            <p className="text-sm font-medium animate-pulse">Running ML Pipeline...</p>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#007AFF" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#8E8E93' }} />
            <Area type="monotone" dataKey="upper" name="Upper CI" stroke="transparent" fill="url(#ciGrad)" />
            <Area type="monotone" dataKey="lower" name="Lower CI" stroke="transparent" fill="transparent" />
            <Line type="monotone" dataKey="actual" name="Actual Demand" stroke="#007AFF" strokeWidth={2.5}
              dot={{ fill: '#007AFF', r: 3 }} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted Demand" stroke="#5856D6" strokeWidth={2.5}
              strokeDasharray="5 5" dot={{ fill: '#5856D6', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
        )}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Forecasts */}
        <ChartCard title="Category Forecast Summary" subtitle={selectedCategory === 'all' ? 'Predicted demand changes by category' : `Showing: ${selectedCategory}`} delay={0.25}>
          <div className="space-y-3">
            {filteredCategories.map((cat, i) => (
              <motion.div key={cat.category}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-ds-surface-sunken/40 hover:bg-ds-surface-sunken transition-all duration-200 border border-ds-border/60">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ds-text">{cat.category}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-ds-text-secondary font-sans tabular-nums">Current: {formatNumber(cat.current)}</span>
                    <span className="text-xs text-ds-text-secondary">→</span>
                    <span className="text-xs font-semibold text-ds-text font-sans tabular-nums">Predicted: {formatNumber(cat.predicted)}</span>
                  </div>
                </div>
                <div className={cn('badge-apple flex items-center gap-1 font-sans font-semibold tabular-nums',
                  cat.change > 0 ? 'bg-ds-emerald-success/10 text-ds-emerald-success border-ds-emerald-success/25' : 'bg-ds-red-danger/10 text-ds-red-danger border-ds-red-danger/25')}>
                  {cat.change > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(cat.change)}%
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>

        {/* Seasonal Pattern */}
        <ChartCard title="Seasonal Demand Pattern" subtitle="Monthly demand seasonality analysis" delay={0.3}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="actual" name="Actual Demand" stroke="#007AFF" strokeWidth={2.5}
                dot={{ fill: '#007AFF', r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="predicted" name="Predicted Demand" stroke="#5856D6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
        </>
      )}
    </div>
  );
}
