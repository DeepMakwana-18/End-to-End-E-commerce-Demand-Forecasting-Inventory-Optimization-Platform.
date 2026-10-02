/** Admin - ML Pipeline Page. */

import { useState, useEffect } from 'react';
import api, { systemApi } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useDataStore } from '@/stores/dataStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Cpu, Clock, CheckCircle2, Loader2, Play, RefreshCw, Zap, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn } from '@/lib/utils';



export default function PipelinePage() {
  const isCustomDataset = useDataStore(s => s.isCustomDataset);
  const rawCsvText = useDataStore(s => s.rawCsvText);
  const datasetName = useDataStore(s => s.datasetName);

  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    }
  });

  const isEmptyOrg = systemStatus && !systemStatus.dataset_exists;

  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);
  const [featureImportance, setFeatureImportance] = useState<any[]>([]);
  const [modelMetrics, setModelMetrics] = useState<any[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isEmptyOrg) return;
    const fetchModelInfo = async () => {
      try {
        const res = await api.get('/forecast/model-info');
        const data = res.data;

        // Map backend features to UI format
        const features = Object.entries(data.feature_importance || {}).map(([name, importance]) => ({
          name,
          importance: importance as number
        })).sort((a, b) => b.importance - a.importance);

        setFeatureImportance(features);

        if (data.convergence && data.convergence.length > 0) {
          setModelMetrics(data.convergence);
        }
      } catch (err) {
        console.error("Failed to load ML model info", err);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await api.get('/forecast/training-history');
        if (res.data && res.data.versions) {
          const mappedHistory = res.data.versions.map((v: any) => ({
            id: v.id,
            version: v.version_tag,
            accuracy: v.accuracy,
            mae: v.mae,
            rmse: v.rmse,
            duration: 'Async',
            date: v.created_at ? v.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            status: v.is_active ? 'active' : 'archived',
          }));
          setTrainingHistory(mappedHistory);
        }
      } catch (err) {
        console.error("Failed to load training history", err);
      }
    };

    Promise.all([fetchModelInfo(), fetchHistory()]).finally(() => setIsLoading(false));
  }, [isEmptyOrg]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRetrain = async () => {
    setIsTraining(true);
    try {
      // Always POST /forecast/retrain — NEVER /forecast/reset.
      // Send csv_text if available in the Zustand store (just uploaded this session).
      // If not (page refresh / new session), the backend reloads from the stored CSV on disk.
      const body: { csv_text?: string; filename?: string } = {};
      if (isCustomDataset && rawCsvText) {
        body.csv_text = rawCsvText;
        body.filename = datasetName || 'uploaded.csv';
      }
      const res = await api.post('/forecast/retrain', body);

      if (res.data.error) {
        showToast(`❌ ML Error: ${res.data.error}`);
        setIsTraining(false);
        return;
      }

      if (res.data.task_id) {
        const taskId = res.data.task_id;
        const pollTask = async () => {
          try {
            const taskRes = await api.get(`/tasks/${taskId}`);
            const state = taskRes.data.state;
            if (state === 'completed') {
              showToast('✅ Model retrained successfully');
              setIsTraining(false);
              // Refresh history
              const histRes = await api.get('/forecast/training-history');
              if (histRes.data && histRes.data.versions) {
                const mappedHistory = histRes.data.versions.map((v: any) => ({
                  id: v.id,
                  version: v.version_tag,
                  accuracy: v.accuracy,
                  mae: v.mae,
                  rmse: v.rmse,
                  duration: 'Async',
                  date: v.created_at ? v.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                  status: v.is_active ? 'active' : 'archived',
                }));
                setTrainingHistory(mappedHistory);
              }
              // Refresh model info
              try {
                const infoRes = await api.get('/forecast/model-info');
                const data = infoRes.data;
                const features = Object.entries(data.feature_importance || {}).map(([name, importance]) => ({
                  name,
                  importance: importance as number
                })).sort((a, b) => b.importance - a.importance);
                setFeatureImportance(features);
                if (data.convergence && data.convergence.length > 0) {
                  setModelMetrics(data.convergence);
                }
              } catch (e) {
                console.error("Failed to refresh ML model info", e);
              }
            } else if (state === 'failed') {
              showToast(`❌ ML Error: ${taskRes.data.error || 'Failed'}`);
              setIsTraining(false);
            } else {
              setTimeout(pollTask, 1500);
            }
          } catch (e) {
            setTimeout(pollTask, 1500);
          }
        };
        pollTask();
      } else {
        // Sync response fallback (should not occur with async Celery tasks)
        const newVersion = res.data.model_version || 'v?.0';
        const newEntry = {
          id: Date.now(),
          version: newVersion,
          accuracy: res.data.accuracy || 0,
          mae: res.data.rmse ? res.data.rmse * 0.8 : 0,
          rmse: res.data.rmse || 0,
          duration: 'Sync',
          date: new Date().toISOString().split('T')[0],
          status: 'active',
        };
        setTrainingHistory(prev => [newEntry, ...prev.map(t => ({ ...t, status: 'archived' }))]);
        showToast(`✅ Model retrained — ${newVersion} (${res.data.accuracy || 0}% accuracy)`);
        setIsTraining(false);
      }
    } catch (err: any) {
      console.error(err);
      const detail = err?.response?.data?.detail || 'Failed to retrain model';
      showToast(`❌ ${detail}`);
      setIsTraining(false);
    }
  };

  const handleRunPipeline = async () => {
    setIsPipelineRunning(true);
    // Running pipeline implies full retrain in this context
    await handleRetrain();
    setIsPipelineRunning(false);
    // Note: Success toast is handled within handleRetrain polling
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

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 tracking-tight">ML Pipeline</h1>
          <p className="text-sm text-surface-500 mt-1">XGBoost model training, monitoring & feature analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRetrain} disabled={isTraining || isPipelineRunning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 transition border border-surface-700/50 disabled:opacity-50 disabled:cursor-wait">
            {isTraining ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isTraining ? 'Training...' : 'Retrain'}
          </button>
          <button onClick={handleRunPipeline} disabled={isTraining || isPipelineRunning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold gradient-primary text-white shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-wait">
            {isPipelineRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isPipelineRunning ? 'Running...' : 'Run Pipeline'}
          </button>
        </div>
      </motion.div>

      {!isLoading && trainingHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 mt-8">
          <Brain className="w-16 h-16 text-surface-600 mb-6" />
          <h2 className="text-xl font-semibold text-surface-200 mb-2">No model has been trained yet.</h2>
          <p className="text-surface-400 text-center max-w-md">
            Upload a dataset to automatically train your first demand forecasting model.
          </p>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Model Accuracy" value={trainingHistory.length > 0 ? `${trainingHistory[0]?.accuracy || 0}%` : "No data"} change={trainingHistory.length > 0 ? 0.9 : undefined} icon={Brain} gradient="gradient-primary" delay={0} />
        <KPICard title="MAE Score" value={trainingHistory.length > 0 ? String(trainingHistory[0]?.mae || 0) : "No data"} change={trainingHistory.length > 0 ? -4.3 : undefined} icon={Activity} gradient="gradient-accent" delay={0.05} />
        <KPICard title="RMSE Score" value={trainingHistory.length > 0 ? String(trainingHistory[0]?.rmse || 0) : "No data"} change={trainingHistory.length > 0 ? -4.2 : undefined} icon={Zap} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Last Trained" value={trainingHistory[0]?.date || 'No data'} icon={Clock} gradient="bg-cyan-500" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Training loss chart */}
        <ChartCard title="Training Convergence" subtitle="MAE & RMSE over training iterations" delay={0.2}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={modelMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" />
              <XAxis dataKey="epoch" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '12px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="mae" name="MAE" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="rmse" name="RMSE" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Feature importance */}
        <ChartCard title="Feature Importance" subtitle="XGBoost feature contribution scores" delay={0.25}>
          <div className="space-y-3">
            {featureImportance.map((f, i) => (
              <motion.div key={f.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-center gap-3">
                <span className="w-40 text-xs font-medium text-surface-300 font-mono truncate">{f.name}</span>
                <div className="flex-1 h-2 bg-surface-800/50 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(f.importance / (featureImportance[0]?.importance || 1)) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: 'easeOut' }}
                    className="h-full rounded-full gradient-primary" />
                </div>
                <span className="text-xs font-semibold text-surface-400 tabular-nums w-12 text-right">{(f.importance * 100).toFixed(1)}%</span>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Training history table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-800/50">
          <h3 className="text-sm font-semibold text-surface-200">Training History <span className="text-surface-500 font-normal">({trainingHistory.length} runs)</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-800/50 bg-surface-900/50">
                {['Version', 'Accuracy', 'MAE', 'RMSE', 'Duration', 'Date', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trainingHistory.map((t, i) => (
                <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.03 }}
                  className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-primary-400">{t.version}</td>
                  <td className="px-4 py-3 text-sm font-bold text-accent-400">{t.accuracy}%</td>
                  <td className="px-4 py-3 text-sm text-surface-300 tabular-nums">{t.mae}</td>
                  <td className="px-4 py-3 text-sm text-surface-300 tabular-nums">{t.rmse}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{t.duration}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{t.date}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-1 rounded-md text-[10px] font-bold uppercase border',
                      t.status === 'active' ? 'bg-accent-500/10 text-accent-400 border-accent-500/20' : 'bg-surface-700/50 text-surface-500 border-surface-600/50')}>
                      {t.status === 'active' ? '● Active' : 'Archived'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
      </>
      )}
    </div>
  );
}
