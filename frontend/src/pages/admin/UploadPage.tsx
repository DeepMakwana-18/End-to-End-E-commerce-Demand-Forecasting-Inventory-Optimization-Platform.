/**
 * Admin - Data Upload Page with CSV ETL pipeline and live task progress.
 *
 * Light Mode Refinement: Apple Modern design system, high-contrast ETL stepper,
 * accessible drop zone with prominent 50 MB limit, verified schema mapping,
 * and readable recent uploads table.
 */

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Database,
  Cpu,
  AlertTriangle,
  ArrowRight,
  Link as LinkIcon,
  HardDrive,
  FileUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';
import { useTaskProgress } from '@/hooks/useTaskProgress';
import api from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

type UploadStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'error';

interface UploadState {
  file: File | null;
  status: UploadStatus;
  progress: number;
}

const pipelineSteps = [
  { id: 'uploading', icon: Upload, label: 'Upload', desc: 'CSV file upload', stepIdx: 0 },
  { id: 'validating', icon: FileSpreadsheet, label: 'Validate', desc: 'Schema validation', stepIdx: 1 },
  { id: 'mapping', icon: LinkIcon, label: 'Map Data', desc: 'Column alignment', stepIdx: 2 },
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB limit

export default function UploadPage() {
  const [state, setState] = useState<UploadState>({ file: null, status: 'idle', progress: 0 });
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const setRawCsvText = useDataStore((s) => s.setRawCsvText);

  // Live task progress via WS + HTTP polling
  const { status: taskStatus } = useTaskProgress(taskId);

  // Real upload history from backend
  const { data: historyData } = useQuery({
    queryKey: ['upload-history'],
    queryFn: async () => {
      const res = await api.get('/upload/history');
      return res.data as {
        uploads: Array<{
          id: number;
          filename: string;
          rows_processed: number;
          status: string;
          date: string;
          size: string;
        }>;
      };
    },
    refetchInterval: taskId ? 5_000 : false,
  });

  // Derive effective status & progress without triggering cascading renders
  const effectiveStatus: UploadStatus = useMemo(() => {
    if (state.status === 'processing') {
      if (taskStatus?.state === 'completed') return 'completed';
      if (taskStatus?.state === 'failed') return 'error';
      return 'processing';
    }
    return state.status;
  }, [state.status, taskStatus]);

  const effectiveProgress =
    effectiveStatus === 'completed'
      ? 100
      : effectiveStatus === 'error'
      ? 0
      : state.status === 'processing' && taskStatus?.progress !== undefined
      ? taskStatus.progress
      : state.progress;

  const processFileAndStart = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeded', 'The selected file exceeds the maximum 50 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      setRawCsvText(text);
      const firstLine = text.split('\n')[0];
      const headers = firstLine
        .split(',')
        .map((h) => h.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      setDetectedColumns(headers.length > 0 ? headers : ['column_1', 'column_2', 'column_3']);

      // Pause at schema mapping stage
      setState({ file, status: 'queued', progress: 15 });
    };
    reader.readAsText(file);
  };

  // resumePipeline — called after column mapping confirmation
  const resumePipeline = async () => {
    if (!state.file) return;
    setState((s) => ({ ...s, status: 'uploading', progress: 25 }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('mappings', JSON.stringify(mappings));

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { task_id } = res.data as { task_id: string };
      setTaskId(task_id);
      setState((s) => ({ ...s, status: 'processing', progress: 35 }));
      toast.info('Upload initiated', 'Dataset sent to enterprise ETL worker.');
    } catch {
      setState((s) => ({ ...s, status: 'error', progress: 0 }));
      toast.error('Upload failed', 'Server could not process dataset.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith('.csv')) {
      processFileAndStart(file);
    } else if (file) {
      toast.warning('Invalid file type', 'Please select a comma-separated (.csv) file.');
    }
  };

  // Map status to pipeline step index (Upload: 0, Validate: 1, Map Data: 2, ETL: 3, ML: 4, Done: 5)
  const isFailed = effectiveStatus === 'error';
  const isCompleted = effectiveStatus === 'completed';

  const currentStepIdx = useMemo(() => {
    if (effectiveStatus === 'idle') return -1;
    if (effectiveStatus === 'uploading') return 0;
    if (effectiveStatus === 'queued') return 1;
    if (effectiveStatus === 'processing') {
      const p = effectiveProgress ?? 0;
      if (p <= 50) return 2;
      if (p <= 80) return 3;
      return 4;
    }
    if (effectiveStatus === 'completed') return 5;
    return -1;
  }, [effectiveStatus, effectiveProgress]);

  const handleMappingChange = (sysCol: string, csvCol: string) => {
    setMappings((prev) => ({ ...prev, [sysCol]: csvCol }));
  };

  const allRequiredMapped = systemColumns.filter((c) => c.required).every((col) => mappings[col.id]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── 1. PAGE HEADER ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
        {/* Subtle decorative blue-to-indigo gradient glow */}
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <FileUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 inline-block" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-ds-text tracking-tight">
                Upload Sales Data
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-0.5 ml-3.5 font-medium">
              Upload CSV telemetry to feed the demand forecasting pipeline and retrain ML models
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            CSV Ingestion Engine
          </div>
        </div>
      </motion.div>

      {/* ── 2. ENTERPRISE ETL PIPELINE STEPPER ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface p-5 sm:p-6 shadow-2xs overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 dark:border-ds-border">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text tracking-tight">
              Enterprise ETL Pipeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5 font-medium">
              Automated end-to-end data transformation &amp; model synchronization
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isCompleted
              ? 'Status: Completed'
              : isFailed
              ? 'Status: Interrupted'
              : currentStepIdx >= 0
              ? `Step ${currentStepIdx + 1} of 6`
              : 'Standby'}
          </span>
        </div>

        <div className="flex items-center justify-between relative px-2 sm:px-6">
          {/* Background Connecting Line */}
          <div className="absolute top-5 left-[6%] right-[6%] h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />

          {/* Active Connecting Line with Status Colors */}
          <div
            className={cn(
              'absolute top-5 left-[6%] h-1 rounded-full z-0 transition-all duration-500',
              isCompleted ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-blue-600'
            )}
            style={{
              width:
                currentStepIdx >= 0
                  ? `${(Math.min(currentStepIdx, 5) / 5) * 88}%`
                  : '0%',
            }}
          />

          {pipelineSteps.map((step, i) => {
            const isStepCompleted = isCompleted || i < currentStepIdx;
            const isStepActive = i === currentStepIdx && !isCompleted;
            const isStepFailed = isStepActive && isFailed;

            return (
              <div key={step.id} className="flex flex-col items-center z-10 relative">
                {/* Step Icon Container */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xs border',
                    isStepCompleted
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                      : isStepFailed
                      ? 'bg-rose-50 text-rose-600 border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                      : isStepActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
                      : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/60 dark:text-slate-500 dark:border-slate-700/60'
                  )}
                >
                  {isStepCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  ) : isStepFailed ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                  ) : isStepActive ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>

                {/* Step Label */}
                <p
                  className={cn(
                    'text-xs mt-2.5 transition-colors',
                    isStepCompleted
                      ? 'font-bold text-emerald-700 dark:text-emerald-300'
                      : isStepFailed
                      ? 'font-bold text-rose-700 dark:text-rose-300'
                      : isStepActive
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'font-medium text-slate-500 dark:text-slate-400'
                  )}
                >
                  {step.label}
                </p>

                {/* Step Description */}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 hidden md:block">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── 3 & 4. UPLOAD DROP ZONE & FEEDBACK ───────────────────────── */}
      <AnimatePresence mode="wait">
        {/* Drop Zone */}
        {effectiveStatus !== 'queued' && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => effectiveStatus === 'idle' && fileRef.current?.click()}
            className={cn(
              'rounded-3xl p-10 sm:p-14 border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center relative overflow-hidden',
              effectiveStatus === 'idle'
                ? cn(
                    'bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white dark:bg-none dark:bg-ds-surface cursor-pointer group shadow-2xs',
                    isDragOver
                      ? 'border-blue-600 bg-blue-50/90 shadow-md scale-[1.01]'
                      : 'border-blue-300 hover:border-blue-500 hover:shadow-md'
                  )
                : effectiveStatus === 'completed'
                ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-300/80 dark:border-emerald-800/40 shadow-2xs'
                : effectiveStatus === 'error'
                ? 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-300/80 dark:border-rose-800/40 shadow-2xs'
                : 'bg-blue-50/30 dark:bg-blue-950/15 border-blue-300/80 dark:border-blue-800/40 shadow-2xs'
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFileAndStart(f);
              }}
            />

            {/* State: Idle / Ready to Browse */}
            {effectiveStatus === 'idle' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-blue-100/80 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center mb-4 transition-transform group-hover:scale-105 shadow-2xs">
                  <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-ds-text tracking-tight">
                  Drag &amp; drop your CSV file here
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  or click anywhere to browse from your device
                </p>

                {/* 50 MB limit badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 mt-3.5 shadow-2xs">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Maximum file size: <strong>50 MB</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Accepted format: <strong>.CSV</strong>
                  </span>
                </div>
              </>
            ) : effectiveStatus === 'completed' ? (
              /* State: Pipeline Completed */
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center mb-4 shadow-2xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-300 tracking-tight">
                  Pipeline Execution Succeeded!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-md">
                  Dataset successfully ingested, schema validated, and models retrained with updated telemetry.
                </p>
                <button
                  onClick={() => {
                    setState({ file: null, status: 'idle', progress: 0 });
                    setTaskId(null);
                  }}
                  className="mt-6 h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                >
                  Upload Another File
                </button>
              </>
            ) : effectiveStatus === 'error' ? (
              /* State: Error */
              <>
                <div className="w-16 h-16 rounded-2xl bg-rose-100/80 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 flex items-center justify-center mb-4 shadow-2xs">
                  <AlertTriangle className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-base font-bold text-rose-700 dark:text-rose-300 tracking-tight">
                  Pipeline Processing Failed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-md">
                  {taskStatus?.error || 'An error occurred during dataset transformation. Please verify schema headers and retry.'}
                </p>
                <button
                  onClick={() => {
                    setState({ file: null, status: 'idle', progress: 0 });
                    setTaskId(null);
                  }}
                  className="mt-6 h-9 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                >
                  Try Again
                </button>
              </>
            ) : (
              /* State: Uploading / Processing */
              <>
                {state.file && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 text-blue-800 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 text-xs font-semibold mb-4 shadow-2xs">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>{state.file.name}</span>
                    <span className="text-slate-400 font-mono">
                      ({(state.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                )}

                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-ds-text">
                  {effectiveStatus === 'uploading'
                    ? 'Uploading file...'
                    : taskStatus?.message || 'Processing dataset in background...'}
                </h4>
                <p className="text-xs font-mono font-semibold text-blue-600 mt-1">
                  {effectiveProgress}% completed
                </p>

                {/* High contrast progress bar */}
                <div className="w-64 sm:w-80 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mt-3 overflow-hidden border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${effectiveProgress}%` }}
                  />
                </div>

                {taskId && (
                  <p className="text-[11px] text-slate-400 font-mono mt-3">
                    Task Reference: {taskId}
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* State: Schema Mapping Confirmation Panel */}
        {effectiveStatus === 'queued' && (
          <motion.div
            key="mapping"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="rounded-2xl border border-amber-200/90 dark:border-amber-800/40 bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
          >
            {/* Informative Warning Header */}
            <div className="p-5 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-blue-50/30 dark:from-amber-950/30 dark:via-ds-surface dark:to-blue-950/20 border-b border-amber-200/80 dark:border-amber-900/40 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Schema Alignment Required
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-200/60 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    Action Needed
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                  Uploaded file <strong className="text-slate-900 dark:text-white">{state.file?.name}</strong> needs to be aligned with the system schema. Please map your CSV headers to the target fields below to resume ingestion.
                </p>
              </div>
            </div>

            {/* Mapping Field Alignment Rows */}
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mb-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">
                <div>System Required Field</div>
                <div className="w-6" />
                <div>Your CSV Column Header</div>
              </div>

              <div className="space-y-3">
                {systemColumns.map((col) => (
                  <div
                    key={col.id}
                    className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center p-3 rounded-xl bg-slate-50/80 dark:bg-ds-surface-sunken/60 border border-slate-200/80 dark:border-ds-border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-ds-text">
                        {col.label}
                      </span>
                      {col.required && (
                        <span className="text-xs text-rose-600 font-bold" title="Required field">
                          *
                        </span>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400" />

                    <select
                      value={mappings[col.id] || ''}
                      onChange={(e) => handleMappingChange(col.id, e.target.value)}
                      className={cn(
                        'w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none transition-all shadow-2xs',
                        mappings[col.id]
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 focus:ring-2 focus:ring-blue-500/20'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20'
                      )}
                    >
                      <option value="" disabled>
                        Select matching column...
                      </option>
                      {detectedColumns.map((csvCol) => (
                        <option key={csvCol} value={csvCol}>
                          {csvCol}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-ds-border pt-4">
                <button
                  onClick={() => setState({ file: null, status: 'idle', progress: 0 })}
                  className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                >
                  Cancel Upload
                </button>
                <button
                  onClick={resumePipeline}
                  disabled={!allRequiredMapped}
                  className="h-9 px-5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xs transition-all duration-150 active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Confirm Mapping &amp; Ingest</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. RECENT UPLOADS TABLE ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-ds-border bg-gradient-to-r from-slate-50/70 via-white to-white dark:bg-none dark:from-ds-surface-sunken/40 dark:via-ds-surface dark:to-ds-surface flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
              Recent Ingestion Logs
            </h3>
            <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5 font-medium">
              Audit log of historical CSV uploads and ETL pipeline outcomes
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            {(historyData?.uploads ?? []).length} recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-ds-border bg-slate-50/80 dark:bg-ds-surface-sunken/50">
                {['File Name', 'Rows Processed', 'File Size', 'Upload Date', 'Pipeline Status'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-[11px] font-bold text-slate-600 dark:text-ds-text-secondary uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(historyData?.uploads ?? []).map((f, i) => (
                <motion.tr
                  key={f.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.02 }}
                  className="border-b border-slate-100/80 dark:border-ds-border/40 hover:bg-slate-50/70 dark:hover:bg-ds-surface-sunken/40 transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-ds-text flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span>{f.filename}</span>
                  </td>

                  <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                    {(f.rows_processed ?? 0).toLocaleString()} rows
                  </td>

                  <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                    {f.size || '12.4 MB'}
                  </td>

                  <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    {f.date}
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-2xs',
                        f.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                          : f.status === 'queued' || f.status === 'processing'
                          ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                          : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                      )}
                    >
                      {f.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : f.status === 'queued' || f.status === 'processing' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</span>
                    </span>
                  </td>
                </motion.tr>
              ))}

              {(historyData?.uploads ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                    No upload telemetry recorded yet. Ingest your first dataset above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
