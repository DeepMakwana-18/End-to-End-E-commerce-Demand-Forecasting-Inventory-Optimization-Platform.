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
        <h1 className="text-2xl font-bold text-ds-text tracking-tight">Upload Sales Data</h1>
        <p className="text-sm text-ds-text-secondary mt-1">Upload CSV files to feed the demand forecasting pipeline</p>
      </motion.div>

      {/* Pipeline visualization */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card-apple p-6 shadow-[var(--ds-raise-1)]">
        <h3 className="text-sm font-semibold text-ds-text mb-6">Enterprise ETL Pipeline</h3>
        <div className="flex items-center justify-between relative px-4">
          <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-ds-surface-sunken z-0" />
          <div className="absolute top-5 left-[10%] h-0.5 bg-ds-blue-action z-0 transition-all duration-500"
            style={{ width: currentStepIdx >= 0 ? `${(currentStepIdx / 5) * 80}%` : '0%' }} />
          
          {pipelineSteps.map((step, i) => (
            <div key={i} className="flex flex-col items-center z-10 relative">
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500',
                i < currentStepIdx ? 'bg-ds-blue-action text-white shadow-[var(--ds-raise-1)]' : 
                i === currentStepIdx && state.status !== 'completed' ? 'bg-ds-blue-action/20 text-ds-blue-action border border-ds-blue-action/50' :
                i === currentStepIdx && state.status === 'completed' ? 'bg-ds-blue-action text-white shadow-[var(--ds-raise-1)]' :
                'bg-ds-surface-sunken text-ds-text-secondary border border-ds-border')}>
                
                {i < currentStepIdx ? <CheckCircle2 className="w-5 h-5" /> :
                 i === currentStepIdx && state.status !== 'completed' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                 <step.icon className="w-5 h-5" />}
              </div>
              <p className={cn('text-xs font-semibold mt-2', i <= currentStepIdx ? 'text-ds-text' : 'text-ds-text-secondary')}>{step.label}</p>
              <p className="text-[10px] text-ds-text-secondary hidden sm:block">{step.desc}</p>
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
            className={cn('card-apple p-12 border-2 border-dashed transition-all text-center',
              state.status === 'idle' ? 'border-ds-border hover:border-ds-blue-action/40 hover:bg-ds-surface-sunken/40 cursor-pointer shadow-[var(--ds-raise-1)]' :
              state.status === 'completed' ? 'border-ds-emerald-success/30 bg-ds-emerald-success/5 shadow-[var(--ds-raise-1)]' : 'border-ds-blue-action/30 bg-ds-blue-action/5 shadow-[var(--ds-raise-1)]')}>
            
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFileAndStart(f); }} />
            
            {state.status === 'idle' ? (
              <>
                <Upload className="w-12 h-12 text-ds-text-secondary mx-auto mb-3" />
                <p className="text-sm font-semibold text-ds-text">Drag & drop your CSV file here</p>
                <p className="text-xs text-ds-text-secondary mt-1">or click to browse files (max 50MB)</p>
              </>
            ) : state.status === 'completed' ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-ds-emerald-success mx-auto mb-3" />
                <p className="text-sm font-semibold text-ds-emerald-success">Pipeline Complete!</p>
                <p className="text-xs text-ds-text-secondary mt-1">Model retrained and active.</p>
                <button onClick={() => setState({ file: null, status: 'idle', progress: 0 })}
                  className="mt-6 btn-apple btn-apple-soft text-xs h-9 px-4">
                  Upload Another File
                </button>
              </>
            ) : state.status === 'error' ? (
              <>
                <AlertTriangle className="w-12 h-12 text-ds-red-danger mx-auto mb-3" />
                <p className="text-sm font-semibold text-ds-red-danger">Upload Failed</p>
                <p className="text-xs text-ds-text-secondary mt-1">{taskStatus?.error || 'An error occurred. Please try again.'}</p>
                <button onClick={() => setState({ file: null, status: 'idle', progress: 0 })}
                  className="mt-6 btn-apple btn-apple-soft text-xs h-9 px-4">
                  Try Again
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 text-ds-blue-action mx-auto mb-3 animate-spin" />
                <p className="text-sm font-semibold text-ds-text">
                  {state.status === 'uploading' ? 'Uploading...' : (taskStatus?.message || 'Processing...')} {state.progress}%
                </p>
                <div className="w-64 h-2 bg-ds-surface-sunken rounded-full mx-auto mt-4 overflow-hidden">
                  <div className="h-full bg-ds-blue-action rounded-full transition-all duration-500" style={{ width: `${state.progress}%` }} />
                </div>
                {taskId && (
                  <p className="text-[10px] text-ds-text-secondary mt-2 font-mono">task: {taskId.slice(0, 8)}…</p>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Mapping panel */}
        {state.status === 'queued' && (
          <motion.div key="mapping" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="card-raised-1 border border-ds-amber-warning/30 overflow-hidden rounded-2xl">
            <div className="p-5 bg-ds-amber-warning/10 border-b border-ds-amber-warning/20 flex items-start gap-4">
              <div className="p-2 bg-ds-amber-warning/20 rounded-xl text-ds-amber-warning"><AlertTriangle className="w-6 h-6" /></div>
              <div>
                <h3 className="text-base font-semibold text-ds-amber-warning">Schema Mismatch Detected</h3>
                <p className="text-sm text-ds-text-secondary mt-1">
                  The uploaded file <strong className="text-ds-text">{state.file?.name}</strong> does not match the standard system schema. 
                  Please map your CSV columns to the required system fields below to continue.
                </p>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mb-4 text-xs font-semibold text-ds-text-muted uppercase tracking-wider px-2">
                <div>System Required Field</div>
                <div className="w-8"></div>
                <div>Your CSV Column</div>
              </div>
              
              <div className="space-y-3">
                {systemColumns.map((col) => (
                  <div key={col.id} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center p-3.5 rounded-xl bg-ds-surface-sunken/60 border border-ds-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ds-text">{col.label}</span>
                      {col.required && <span className="text-[10px] text-ds-red-danger font-bold">*</span>}
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-ds-text-muted" />
                    
                    <select 
                      value={mappings[col.id] || ''}
                      onChange={(e) => handleMappingChange(col.id, e.target.value)}
                      className={cn("w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition-all", 
                        mappings[col.id] ? "bg-ds-blue-action/10 text-ds-blue-action border border-ds-blue-action/30 focus:ring-2 focus:ring-ds-blue-action/30" : 
                        "bg-ds-surface-elevated border border-ds-border text-ds-text-secondary focus:ring-2 focus:ring-ds-border"
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

              <div className="mt-8 flex items-center justify-between border-t border-ds-border-subtle pt-5">
                <button onClick={() => setState({ file: null, status: 'idle', progress: 0 })}
                  className="btn-apple btn-apple-soft text-sm px-4 py-2">
                  Cancel Upload
                </button>
                <button onClick={resumePipeline} disabled={!allRequiredMapped}
                  className="btn-apple btn-apple-primary text-sm px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  Confirm Mapping & Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent uploads — from real API */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card-raised-1 overflow-hidden">
        <div className="p-4 border-b border-ds-border-subtle">
          <h3 className="text-sm font-semibold text-ds-text">Recent Uploads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ds-border-subtle bg-ds-surface-sunken/40">
                {['File', 'Rows', 'Size', 'Date', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-ds-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(historyData?.uploads ?? []).map((f, i) => (
                <motion.tr key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
                  className="border-b border-ds-border-subtle/50 hover:bg-ds-surface-sunken/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-ds-text flex items-center gap-2"><FileText className="w-4 h-4 text-ds-text-secondary" />{f.filename}</td>
                  <td className="px-4 py-3 text-xs text-ds-text-secondary tabular-nums">{(f.rows_processed ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-ds-text-secondary">{f.size}</td>
                  <td className="px-4 py-3 text-xs text-ds-text-secondary">{f.date}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                      f.status === 'completed' ? 'bg-ds-emerald-success/10 text-ds-emerald-success' :
                      f.status === 'queued' || f.status === 'processing' ? 'bg-ds-amber-warning/10 text-ds-amber-warning' :
                      'bg-ds-red-danger/10 text-ds-red-danger'
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
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-ds-text-muted">No uploads yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
