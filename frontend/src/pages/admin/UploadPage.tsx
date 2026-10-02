/** Admin - Data Upload Page with CSV ETL pipeline and live task progress. */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, Loader2, FileSpreadsheet, Database, Cpu, AlertTriangle, ArrowRight, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';
import { useTaskProgress } from '@/hooks/useTaskProgress';
import api from '@/services/api';
import { useQuery } from '@tanstack/react-query';

type UploadStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'error';

interface UploadState {
  file: File | null;
  status: UploadStatus;
  progress: number;
}

const pipelineSteps = [
  { id: 'uploading', icon: Upload, label: 'Upload', desc: 'CSV file upload', stepIdx: 0 },
  { id: 'validating', icon: FileSpreadsheet, label: 'Validate', desc: 'Schema validation', stepIdx: 1 },
  { id: 'mapping', icon: Link, label: 'Map Data', desc: 'Column alignment', stepIdx: 2 },
  { id: 'processing', icon: Database, label: 'ETL', desc: 'Transform & load', stepIdx: 3 },
  { id: 'ml', icon: Cpu, label: 'ML', desc: 'Retrain models', stepIdx: 4 },
  { id: 'completed', icon: CheckCircle2, label: 'Done', desc: 'Data ready', stepIdx: 5 },
];

// System required columns
const systemColumns = [
  { id: 'transaction_date', label: 'Transaction Date', required: true },
  { id: 'product_sku', label: 'Product SKU', required: true },
  { id: 'quantity_sold', label: 'Quantity Sold', required: true },
  { id: 'unit_price', label: 'Unit Price', required: true },
  { id: 'category', label: 'Category', required: false },
];

export default function UploadPage() {
  const [state, setState] = useState<UploadState>({ file: null, status: 'idle', progress: 0 });
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [fullCsvText, setFullCsvText] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);
  const setRawCsvText = useDataStore(s => s.setRawCsvText);

  // Live task progress via WS + HTTP polling
  const { status: taskStatus } = useTaskProgress(taskId);

  // Real upload history from backend
  const { data: historyData } = useQuery({
    queryKey: ['upload-history'],
    queryFn: async () => {
      const res = await api.get('/upload/history');
      return res.data as { uploads: Array<{ id: number; filename: string; rows_processed: number; status: string; date: string; size: string }> };
    },
    refetchInterval: taskId ? 5_000 : false,
  });

  // Sync task status → UI state
  useEffect(() => {
    if (!taskStatus) return;
    if (taskStatus.state === 'completed') {
      setState(s => ({ ...s, status: 'completed', progress: 100 }));
      setTaskId(null);
    } else if (taskStatus.state === 'failed') {
      setState(s => ({ ...s, status: 'error', progress: 0 }));
      setTaskId(null);
    } else {
      setState(s => ({ ...s, status: 'processing', progress: taskStatus.progress }));
    }
  }, [taskStatus]);

  const processFileAndStart = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      setFullCsvText(text);
      setRawCsvText(text);
      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      setDetectedColumns(headers.length > 0 ? headers : ['column_1', 'column_2', 'column_3']);

      // Pause at mapping
      setState({ file, status: 'queued', progress: 5 });
    };
    reader.readAsText(file);
  };

  // resumePipeline — called after column mapping confirmation
  const resumePipeline = async () => {
    if (!state.file) return;
    setState(s => ({ ...s, status: 'uploading', progress: 10 }));
    
    try {
      const formData = new FormData();
      formData.append('file', state.file);
      // Optional: append mappings if backend expects them
      formData.append('mappings', JSON.stringify(mappings));
      
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { task_id } = res.data as { task_id: string };
      setTaskId(task_id);
      setState(s => ({ ...s, status: 'processing', progress: 15 }));
    } catch {
      setState(s => ({ ...s, status: 'error', progress: 0 }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) processFileAndStart(file);
  };

  // Map status to pipeline step index
  const currentStepIdx =
    state.status === 'idle'        ? -1 :
    state.status === 'uploading'   ?  0 :
    state.status === 'queued'      ?  1 :
    state.status === 'processing' && (state.progress ?? 0) <= 50 ? 2 :
    state.status === 'processing' && (state.progress ?? 0) <= 80 ? 3 :
    state.status === 'processing'  ?  4 :
    state.status === 'completed'   ?  5 : -1;

  const handleMappingChange = (sysCol: string, csvCol: string) => {
    setMappings(prev => ({ ...prev, [sysCol]: csvCol }));
  };

  const allRequiredMapped = systemColumns.every(col => mappings[col.id]);

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Upload Sales Data</h1>
        <p className="text-sm text-surface-500 mt-1">Upload CSV files to feed the demand forecasting pipeline</p>
      </motion.div>

      {/* Pipeline visualization */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card p-6">
        <h3 className="text-sm font-semibold text-surface-200 mb-6">Enterprise ETL Pipeline</h3>
        <div className="flex items-center justify-between relative px-4">
          <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-surface-800/50 z-0" />
          <div className="absolute top-5 left-[10%] h-0.5 bg-primary-500 z-0 transition-all duration-500"
            style={{ width: currentStepIdx >= 0 ? `${(currentStepIdx / 5) * 80}%` : '0%' }} />
          
          {pipelineSteps.map((step, i) => (
            <div key={i} className="flex flex-col items-center z-10 relative">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500',
                i < currentStepIdx ? 'gradient-primary text-white shadow-lg shadow-primary-500/20' : 
                i === currentStepIdx && state.status !== 'completed' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' :
                i === currentStepIdx && state.status === 'completed' ? 'gradient-primary text-white shadow-lg shadow-primary-500/20' :
                'bg-surface-800/60 text-surface-500 border border-surface-700/50')}>
                
                {i < currentStepIdx ? <CheckCircle2 className="w-5 h-5" /> :
                 i === currentStepIdx && state.status !== 'completed' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                 <step.icon className="w-5 h-5" />}
              </div>
              <p className={cn('text-xs font-semibold mt-2', i <= currentStepIdx ? 'text-surface-200' : 'text-surface-500')}>{step.label}</p>
              <p className="text-[10px] text-surface-600 hidden sm:block">{step.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main interactive area */}
      <AnimatePresence mode="wait">
        
        {/* Drop Zone */}
        {state.status !== 'queued' && (
          <motion.div key="dropzone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => state.status === 'idle' && fileRef.current?.click()}
            className={cn('glass-card p-12 border-2 border-dashed transition-all text-center',
              state.status === 'idle' ? 'border-surface-700/50 hover:border-primary-500/30 hover:bg-surface-800/20 cursor-pointer' :
              state.status === 'completed' ? 'border-accent-500/30 bg-accent-500/5' : 'border-primary-500/30 bg-primary-500/5')}>
            
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFileAndStart(f); }} />
            
            {state.status === 'idle' ? (
              <>
                <Upload className="w-12 h-12 text-surface-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-surface-300">Drag & drop your CSV file here</p>
                <p className="text-xs text-surface-500 mt-1">or click to browse files (max 50MB)</p>
              </>
            ) : state.status === 'completed' ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-accent-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-accent-400">Pipeline Complete!</p>
                <p className="text-xs text-surface-400 mt-1">Model retrained and active.</p>
                <button onClick={() => setState({ file: null, status: 'idle', progress: 0 })}
                  className="mt-6 px-4 py-2 rounded-lg text-xs font-medium border border-surface-700 text-surface-300 hover:bg-surface-800">
                  Upload Another File
                </button>
              </>
            ) : state.status === 'error' ? (
              <>
                <AlertTriangle className="w-12 h-12 text-danger-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-danger-400">Upload Failed</p>
                <p className="text-xs text-surface-500 mt-1">{taskStatus?.error || 'An error occurred. Please try again.'}</p>
                <button onClick={() => setState({ file: null, status: 'idle', progress: 0 })}
                  className="mt-6 px-4 py-2 rounded-lg text-xs font-medium border border-surface-700 text-surface-300 hover:bg-surface-800">
                  Try Again
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 text-primary-400 mx-auto mb-3 animate-spin" />
                <p className="text-sm font-semibold text-surface-300">
                  {state.status === 'uploading' ? 'Uploading...' : (taskStatus?.message || 'Processing...')} {state.progress}%
                </p>
                <div className="w-64 h-2 bg-surface-800/50 rounded-full mx-auto mt-4 overflow-hidden">
                  <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${state.progress}%` }} />
                </div>
                {taskId && (
                  <p className="text-[10px] text-surface-600 mt-2 font-mono">task: {taskId.slice(0, 8)}…</p>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Mapping panel */}
        {state.status === 'queued' && (
          <motion.div key="mapping" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card border border-warning-500/30 overflow-hidden">
            <div className="p-5 bg-warning-500/10 border-b border-warning-500/20 flex items-start gap-4">
              <div className="p-2 bg-warning-500/20 rounded-lg text-warning-400"><AlertTriangle className="w-6 h-6" /></div>
              <div>
                <h3 className="text-base font-semibold text-warning-400">Schema Mismatch Detected</h3>
                <p className="text-sm text-surface-300 mt-1">
                  The uploaded file <strong>{state.file?.name}</strong> does not match the standard system schema. 
                  Please map your CSV columns to the required system fields below to continue.
                </p>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mb-4 text-xs font-semibold text-surface-500 uppercase px-2">
                <div>System Required Field</div>
                <div className="w-8"></div>
                <div>Your CSV Column</div>
              </div>
              
              <div className="space-y-3">
                {systemColumns.map((col) => (
                  <div key={col.id} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center p-3 rounded-xl bg-surface-800/40 border border-surface-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-200">{col.label}</span>
                      {col.required && <span className="text-[10px] text-danger-400 font-bold">*</span>}
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-surface-500" />
                    
                    <select 
                      value={mappings[col.id] || ''}
                      onChange={(e) => handleMappingChange(col.id, e.target.value)}
                      className={cn("w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2", 
                        mappings[col.id] ? "bg-primary-500/10 text-primary-400 border border-primary-500/30 focus:ring-primary-500/30" : 
                        "bg-surface-900 border border-surface-600 text-surface-400 focus:ring-surface-500/50"
                      )}
                    >
                      <option value="" disabled>Select column...</option>
                      {detectedColumns.map(csvCol => (
                        <option key={csvCol} value={csvCol}>{csvCol}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-surface-800/50 pt-5">
                <button onClick={() => setState({ file: null, status: 'idle', progress: 0 })}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition">
                  Cancel Upload
                </button>
                <button onClick={resumePipeline} disabled={!allRequiredMapped}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold gradient-primary text-white shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition">
                  Confirm Mapping & Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent uploads — from real API */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-800/50">
          <h3 className="text-sm font-semibold text-surface-200">Recent Uploads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-800/50 bg-surface-900/50">
                {['File', 'Rows', 'Size', 'Date', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(historyData?.uploads ?? []).map((f, i) => (
                <motion.tr key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
                  className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-surface-200 flex items-center gap-2"><FileText className="w-4 h-4 text-surface-500" />{f.filename}</td>
                  <td className="px-4 py-3 text-xs text-surface-400 tabular-nums">{(f.rows_processed ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{f.size}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{f.date}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      f.status === 'completed' ? 'text-accent-400' :
                      f.status === 'queued' || f.status === 'processing' ? 'text-warning-400' :
                      'text-danger-400'
                    )}>
                      {f.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                       f.status === 'queued' || f.status === 'processing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                       <AlertTriangle className="w-3.5 h-3.5" />}
                      {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {(historyData?.uploads ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-surface-500">No uploads yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
