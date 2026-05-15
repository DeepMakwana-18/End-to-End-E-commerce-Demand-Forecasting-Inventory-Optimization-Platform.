/** Admin - Data Upload Page with CSV ETL pipeline visualization. */

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, FileSpreadsheet, Database, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadState {
  file: File | null;
  status: 'idle' | 'uploading' | 'validating' | 'processing' | 'completed' | 'error';
  progress: number;
  rowsProcessed: number;
  totalRows: number;
  errors: string[];
}

const recentUploads = [
  { id: 1, name: 'olist_orders_2024.csv', rows: 99441, status: 'completed', date: '2026-05-10', size: '12.4 MB' },
  { id: 2, name: 'product_catalog.csv', rows: 32951, status: 'completed', date: '2026-05-08', size: '4.2 MB' },
  { id: 3, name: 'sales_q1_2026.csv', rows: 45230, status: 'completed', date: '2026-04-15', size: '6.1 MB' },
];

const pipelineSteps = [
  { icon: Upload, label: 'Upload', desc: 'CSV file upload' },
  { icon: FileSpreadsheet, label: 'Validate', desc: 'Schema validation' },
  { icon: Database, label: 'ETL', desc: 'Transform & load' },
  { icon: Cpu, label: 'ML', desc: 'Retrain models' },
  { icon: CheckCircle2, label: 'Done', desc: 'Data ready' },
];

export default function UploadPage() {
  const [state, setState] = useState<UploadState>({ file: null, status: 'idle', progress: 0, rowsProcessed: 0, totalRows: 0, errors: [] });
  const fileRef = useRef<HTMLInputElement>(null);

  const simulateUpload = (file: File) => {
    setState({ file, status: 'uploading', progress: 0, rowsProcessed: 0, totalRows: 50000, errors: [] });
    let progress = 0;
    const interval = setInterval(() => {
      progress += 8;
      if (progress <= 30) setState(s => ({ ...s, progress, status: 'uploading' }));
      else if (progress <= 50) setState(s => ({ ...s, progress, status: 'validating' }));
      else if (progress <= 90) setState(s => ({ ...s, progress, status: 'processing', rowsProcessed: Math.floor((progress / 100) * 50000) }));
      else {
        clearInterval(interval);
        setState(s => ({ ...s, progress: 100, status: 'completed', rowsProcessed: 50000 }));
      }
    }, 300);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) simulateUpload(file);
  };

  const currentStep = state.status === 'idle' ? -1 : state.status === 'uploading' ? 0 : state.status === 'validating' ? 1 : state.status === 'processing' ? 2 : state.status === 'completed' ? 4 : -1;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload Sales Data</h1>
        <p className="text-sm text-surface-500 mt-1">Upload CSV files to feed the demand forecasting pipeline</p>
      </motion.div>

      {/* Pipeline visualization */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card p-6">
        <h3 className="text-sm font-semibold text-surface-200 mb-5">ETL Pipeline</h3>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-surface-800/50 z-0" />
          <div className="absolute top-5 left-[10%] h-0.5 bg-primary-500 z-0 transition-all duration-500"
            style={{ width: currentStep >= 0 ? `${(currentStep / 4) * 80}%` : '0%' }} />
          {pipelineSteps.map((step, i) => (
            <div key={i} className="flex flex-col items-center z-10 relative">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                i <= currentStep ? 'gradient-primary text-white shadow-lg shadow-primary-500/20' : 'bg-surface-800/60 text-surface-500 border border-surface-700/50')}>
                {i < currentStep ? <CheckCircle2 className="w-5 h-5" /> :
                  i === currentStep && state.status !== 'completed' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                    <step.icon className="w-5 h-5" />}
              </div>
              <p className={cn('text-xs font-semibold mt-2', i <= currentStep ? 'text-surface-200' : 'text-surface-500')}>{step.label}</p>
              <p className="text-[10px] text-surface-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Drop zone */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn('glass-card p-12 border-2 border-dashed cursor-pointer transition-all text-center',
          state.status === 'idle' ? 'border-surface-700/50 hover:border-primary-500/30 hover:bg-surface-800/20' :
            state.status === 'completed' ? 'border-accent-500/30 bg-accent-500/5' : 'border-primary-500/30 bg-primary-500/5')}>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) simulateUpload(f); }} />
        {state.status === 'idle' ? (
          <>
            <Upload className="w-12 h-12 text-surface-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-300">Drag & drop your CSV file here</p>
            <p className="text-xs text-surface-500 mt-1">or click to browse files (max 50MB)</p>
          </>
        ) : state.status === 'completed' ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-accent-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-accent-400">Upload Complete!</p>
            <p className="text-xs text-surface-400 mt-1">{state.rowsProcessed.toLocaleString()} rows processed from {state.file?.name}</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-primary-400 mx-auto mb-3 animate-spin" />
            <p className="text-sm font-semibold text-surface-300 capitalize">{state.status}... {state.progress}%</p>
            <div className="w-64 h-2 bg-surface-800/50 rounded-full mx-auto mt-3 overflow-hidden">
              <div className="h-full gradient-primary rounded-full transition-all duration-300" style={{ width: `${state.progress}%` }} />
            </div>
            {state.status === 'processing' && (
              <p className="text-xs text-surface-500 mt-2">{state.rowsProcessed.toLocaleString()} / {state.totalRows.toLocaleString()} rows</p>
            )}
          </>
        )}
      </motion.div>

      {/* Recent uploads */}
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
              {recentUploads.map((f, i) => (
                <motion.tr key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
                  className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-surface-200 flex items-center gap-2"><FileText className="w-4 h-4 text-surface-500" />{f.name}</td>
                  <td className="px-4 py-3 text-xs text-surface-400 tabular-nums">{f.rows.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{f.size}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{f.date}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs text-accent-400"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
