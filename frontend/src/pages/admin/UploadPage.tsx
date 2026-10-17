/**
 * Admin - Data Upload Page with CSV ETL pipeline and live task progress.
 *
 * Titan AI Page 11 Refinement:
 * - High-contrast 6-stage ETL stepper with 5 distinct semantic states:
 *   (Pending, Active, Action Required, Completed, Failed)
 * - Compact, accessible drag-and-drop CSV upload zone with prominent 50 MB limit
 * - Schema Alignment workflow with column auto-matching suggestions, inline sample data previews,
 *   field requirement badges, and explicit validation feedback
 * - Ingestion logs with distinct Run IDs, human-readable file sizes (B/KB/MB),
 *   timestamp resolution, and semantic status pills
 * - Floating AI assistant bottom clearance (pb-28 sm:pb-32)
 * - Cohesive Light & Dark mode support
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
  Sparkles,
  Check,
  RotateCcw,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';
import { useTaskProgress } from '@/hooks/useTaskProgress';
import api from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

type UploadStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'error';
type StepVisualState = 'pending' | 'active' | 'action_required' | 'completed' | 'failed';

interface UploadState {
  file: File | null;
  status: UploadStatus;
  progress: number;
}

interface UploadRecord {
  id: number;
  filename: string;
  rows_processed: number;
  status: string;
  date: string;
  time?: string;
  created_at?: string | null;
  size: string;
  file_size_bytes?: number;
}

const pipelineSteps = [
  { id: 'uploading', icon: Upload, label: 'Upload', desc: 'CSV received', stepIdx: 0 },
  { id: 'validating', icon: FileSpreadsheet, label: 'Validate', desc: 'Check schema', stepIdx: 1 },
  { id: 'mapping', icon: LinkIcon, label: 'Map Data', desc: 'Align columns', stepIdx: 2 },
  { id: 'processing', icon: Database, label: 'ETL', desc: 'Transform & load', stepIdx: 3 },
  { id: 'ml', icon: Cpu, label: 'ML', desc: 'Retrain models', stepIdx: 4 },
  { id: 'completed', icon: CheckCircle2, label: 'Done', desc: 'Data ready', stepIdx: 5 },
];

// System target fields with requirement constraints and descriptions
const systemColumns = [
  { id: 'transaction_date', label: 'Transaction Date', required: true, hint: 'Date of sale (e.g. YYYY-MM-DD)' },
  { id: 'product_sku', label: 'Product SKU', required: true, hint: 'Unique stock keeping unit identifier' },
  { id: 'quantity_sold', label: 'Quantity Sold', required: true, hint: 'Number of units sold (integer)' },
  { id: 'unit_price', label: 'Unit Price', required: true, hint: 'Selling price per unit (numeric)' },
  { id: 'category', label: 'Category', required: false, hint: 'Product category or merchandise department' },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB limit

// Human-readable file size formatter
function formatFileSize(bytes?: number, fallbackSize?: string): string {
  if (bytes && bytes > 0) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (!fallbackSize) return 'N/A';
  if (fallbackSize === '0.0 MB') return '< 100 KB';
  return fallbackSize;
}

export default function UploadPage() {
  const [state, setState] = useState<UploadState>({ file: null, status: 'idle', progress: 0 });
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnSamples, setColumnSamples] = useState<Record<string, string>>({});
  const [suggestedMappings, setSuggestedMappings] = useState<Record<string, string>>({});
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
        uploads: UploadRecord[];
        total: number;
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

  // Process uploaded CSV file, extract headers and sample values, propose auto-mappings
  const processFileAndStart = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.warning('Invalid file format', 'Only standard comma-separated (.csv) files are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeded', `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB limit.`);
      return;
    }

    if (file.size === 0) {
      toast.error('Empty file', 'The selected file is empty. Please choose a valid sales CSV.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        toast.error('Empty file contents', 'The selected CSV file contains no readable records.');
        return;
      }
      setRawCsvText(text);

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        toast.error('Invalid CSV format', 'No valid rows detected in the CSV file.');
        return;
      }

      const firstLine = lines[0] || '';
      const headers = firstLine
        .split(',')
        .map((h) => h.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);

      if (headers.length === 0) {
        toast.error('Missing CSV headers', 'Could not detect column headers in the first row.');
        return;
      }

      setDetectedColumns(headers);

      // Extract sample row for inline user preview
      const sampleRow = lines[1] ? lines[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')) : [];
      const samples: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const val = sampleRow[idx];
        samples[h] = val !== undefined && val !== '' ? val : '—';
      });
      setColumnSamples(samples);

      // Intelligent column auto-matching heuristics
      const proposed: Record<string, string> = {};
      systemColumns.forEach((sys) => {
        const match = headers.find((h) => {
          const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          switch (sys.id) {
            case 'transaction_date':
              return norm.includes('date') || norm.includes('time') || norm === 'txdate' || norm === 'orderdate';
            case 'product_sku':
              return norm.includes('sku') || norm.includes('product') || norm.includes('item') || norm === 'itemid';
            case 'quantity_sold':
              return norm.includes('qty') || norm.includes('quantity') || norm.includes('units') || norm.includes('sold');
            case 'unit_price':
              return norm.includes('price') || norm.includes('cost') || norm.includes('rate') || norm.includes('amount');
            case 'category':
              return norm.includes('category') || norm.includes('cat') || norm.includes('dept') || norm.includes('department');
            default:
              return false;
          }
        });
        if (match) {
          proposed[sys.id] = match;
        }
      });

      setSuggestedMappings(proposed);
      setMappings(proposed);

      // Transition to Step 3: Schema Alignment Required
      setState({ file, status: 'queued', progress: 15 });
    };

    reader.onerror = () => {
      toast.error('File read error', 'Unable to parse the uploaded CSV file. Please verify file integrity.');
    };

    reader.readAsText(file);
  };

  // resumePipeline — called after schema mapping confirmation
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
      toast.info('Upload initiated', 'Dataset sent to enterprise ETL pipeline.');
    } catch {
      setState((s) => ({ ...s, status: 'error', progress: 0 }));
      toast.error('Upload failed', 'Server could not process dataset. Please verify schema and retry.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFileAndStart(file);
    }
  };

  const handleMappingChange = (sysCol: string, csvCol: string) => {
    setMappings((prev) => ({ ...prev, [sysCol]: csvCol }));
  };

  // Derive missing required fields for explicit user feedback
  const missingRequired = useMemo(() => {
    return systemColumns
      .filter((c) => c.required && !mappings[c.id])
      .map((c) => c.label);
  }, [mappings]);

  const allRequiredMapped = missingRequired.length === 0;

  // Derive visual state for each of the 6 ETL stepper stages
  const getStepVisualState = (stepIndex: number): StepVisualState => {
    if (effectiveStatus === 'idle') return 'pending';

    if (effectiveStatus === 'error') {
      if (stepIndex === 3) return 'failed';
      if (stepIndex < 3) return 'completed';
      return 'pending';
    }

    if (effectiveStatus === 'completed') {
      return 'completed';
    }

    if (effectiveStatus === 'queued') {
      // CSV received (Step 0) & Schema Checked (Step 1) are complete; Mapping is paused awaiting user action
      if (stepIndex < 2) return 'completed';
      if (stepIndex === 2) return 'action_required';
      return 'pending';
    }

    if (effectiveStatus === 'uploading') {
      if (stepIndex <= 2) return 'completed';
      if (stepIndex === 3) return 'active';
      return 'pending';
    }

    if (effectiveStatus === 'processing') {
      if (stepIndex <= 2) return 'completed';
      const p = effectiveProgress ?? 0;
      if (p < 75) {
        if (stepIndex === 3) return 'active';
        return 'pending';
      } else {
        if (stepIndex === 3) return 'completed';
        if (stepIndex === 4) return 'active';
        return 'pending';
      }
    }

    return 'pending';
  };

  // Header status indicator text
  const stepperHeaderText = useMemo(() => {
    if (effectiveStatus === 'idle') return 'Standby • Awaiting CSV Upload';
    if (effectiveStatus === 'queued') return 'Step 3 of 6 • Action Required: Align Columns';
    if (effectiveStatus === 'uploading') return 'Step 4 of 6 • Submitting Dataset';
    if (effectiveStatus === 'processing') {
      return (effectiveProgress ?? 0) < 75
        ? 'Step 4 of 6 • ETL Ingestion in Progress'
        : 'Step 5 of 6 • ML Retraining in Progress';
    }
    if (effectiveStatus === 'completed') return 'Completed • Pipeline Succeeded';
    if (effectiveStatus === 'error') return 'Interrupted • Pipeline Failed';
    return 'Standby';
  }, [effectiveStatus, effectiveProgress]);

  return (
    <div className="space-y-6 max-w-5xl pb-28 sm:pb-32">
      {/* ── 1. PAGE HEADER ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
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
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-xs font-semibold text-blue-700 dark:text-blue-300">
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

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors',
              effectiveStatus === 'completed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                : effectiveStatus === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                : effectiveStatus === 'queued'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                : effectiveStatus === 'processing' || effectiveStatus === 'uploading'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700'
            )}
          >
            {effectiveStatus === 'queued' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
            {(effectiveStatus === 'processing' || effectiveStatus === 'uploading') && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            {stepperHeaderText}
          </span>
        </div>

        <div className="flex items-center justify-between relative px-2 sm:px-6">
          {/* Background Connecting Line */}
          <div className="absolute top-5 left-[6%] right-[6%] h-1 bg-slate-200 dark:bg-slate-800 rounded-full z-0" />

          {/* Active Status Connecting Line */}
          <div
            className={cn(
              'absolute top-5 left-[6%] h-1 rounded-full z-0 transition-all duration-500',
              effectiveStatus === 'completed'
                ? 'bg-emerald-500'
                : effectiveStatus === 'error'
                ? 'bg-rose-500'
                : effectiveStatus === 'queued'
                ? 'bg-amber-500'
                : 'bg-blue-600'
            )}
            style={{
              width:
                effectiveStatus === 'completed'
                  ? '88%'
                  : effectiveStatus === 'queued'
                  ? '36%'
                  : effectiveStatus === 'uploading'
                  ? '52%'
                  : effectiveStatus === 'processing'
                  ? `${Math.max(52, ((effectiveProgress ?? 0) / 100) * 88)}%`
                  : '0%',
            }}
          />

          {pipelineSteps.map((step, i) => {
            const visualState = getStepVisualState(i);

            return (
              <div key={step.id} className="flex flex-col items-center z-10 relative">
                {/* Step Icon Container */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xs border',
                    visualState === 'completed'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300/90 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                      : visualState === 'action_required'
                      ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 ring-4 ring-amber-400/20 scale-105'
                      : visualState === 'failed'
                      ? 'bg-rose-50 text-rose-600 border-rose-300/90 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
                      : visualState === 'active'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
                      : 'bg-slate-50 text-slate-400 border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700'
                  )}
                >
                  {visualState === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  ) : visualState === 'action_required' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-bounce" />
                  ) : visualState === 'failed' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                  ) : visualState === 'active' ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>

                {/* Step Label */}
                <p
                  className={cn(
                    'text-xs mt-2.5 transition-colors text-center',
                    visualState === 'completed'
                      ? 'font-bold text-emerald-700 dark:text-emerald-300'
                      : visualState === 'action_required'
                      ? 'font-bold text-amber-700 dark:text-amber-300'
                      : visualState === 'failed'
                      ? 'font-bold text-rose-700 dark:text-rose-300'
                      : visualState === 'active'
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'font-semibold text-slate-600 dark:text-slate-300'
                  )}
                >
                  {step.label}
                </p>

                {/* Step Description */}
                <p
                  className={cn(
                    'text-[10px] hidden md:block text-center mt-0.5',
                    visualState === 'completed'
                      ? 'text-emerald-600/80 dark:text-emerald-400/80 font-medium'
                      : visualState === 'action_required'
                      ? 'text-amber-600/90 dark:text-amber-400/90 font-medium'
                      : visualState === 'active'
                      ? 'text-blue-600/90 dark:text-blue-400/90 font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {visualState === 'action_required' ? 'Action needed' : step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── 3 & 4. UPLOAD DROP ZONE & FEEDBACK ───────────────────────── */}
      <AnimatePresence mode="wait">
        {/* Drop Zone: Shown when not paused in schema alignment */}
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
              'rounded-3xl py-8 sm:py-9 px-6 border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center relative overflow-hidden',
              effectiveStatus === 'idle'
                ? cn(
                    'bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white dark:bg-none dark:bg-ds-surface cursor-pointer group shadow-2xs',
                    isDragOver
                      ? 'border-blue-600 bg-blue-50/90 shadow-md scale-[1.01]'
                      : 'border-blue-300 hover:border-blue-500 hover:shadow-md dark:border-blue-800 dark:hover:border-blue-600'
                  )
                : effectiveStatus === 'completed'
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                : effectiveStatus === 'error'
                ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 shadow-2xs'
                : 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 shadow-2xs'
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
                <div className="w-14 h-14 rounded-2xl bg-blue-100/90 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center mb-3 transition-transform group-hover:scale-105 shadow-2xs">
                  <Upload className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-ds-text tracking-tight">
                  Drag &amp; drop your sales CSV here
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  or <span className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2">click to browse</span> from your device
                </p>

                {/* File constraints pills */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50/90 text-blue-800 border border-blue-200/90 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60 mt-4 shadow-2xs">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Max file size: <strong>50 MB</strong></span>
                  <span>•</span>
                  <span>Accepted format: <strong>.CSV only</strong></span>
                </div>
              </>
            ) : effectiveStatus === 'completed' ? (
              /* State: Pipeline Completed */
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100/90 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-3 shadow-2xs">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-300 tracking-tight">
                  Pipeline Execution Succeeded!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium max-w-md">
                  Dataset successfully ingested, schema validated, and demand forecasting models retrained with updated telemetry.
                </p>
                <button
                  onClick={() => {
                    setState({ file: null, status: 'idle', progress: 0 });
                    setTaskId(null);
                    setMappings({});
                    setDetectedColumns([]);
                    setColumnSamples({});
                  }}
                  className="mt-5 h-9 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all active:scale-95 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Upload Another File</span>
                </button>
              </>
            ) : effectiveStatus === 'error' ? (
              /* State: Error */
              <>
                <div className="w-14 h-14 rounded-2xl bg-rose-100/90 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mb-3 shadow-2xs">
                  <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-base font-bold text-rose-700 dark:text-rose-300 tracking-tight">
                  Pipeline Processing Failed
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium max-w-md">
                  {taskStatus?.error || 'An error occurred during dataset transformation. Please verify schema headers and retry.'}
                </p>
                <button
                  onClick={() => {
                    setState({ file: null, status: 'idle', progress: 0 });
                    setTaskId(null);
                  }}
                  className="mt-5 h-9 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                >
                  Try Again
                </button>
              </>
            ) : (
              /* State: Uploading / Processing */
              <>
                {state.file && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 text-xs font-semibold mb-3 shadow-2xs">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{state.file.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      ({formatFileSize(state.file.size)})
                    </span>
                  </div>
                )}

                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-ds-text">
                  {effectiveStatus === 'uploading'
                    ? 'Submitting dataset to ETL worker...'
                    : taskStatus?.message || 'Processing dataset & retraining models...'}
                </h4>
                <p className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  {effectiveProgress}% completed
                </p>

                {/* High contrast progress bar */}
                <div className="w-64 sm:w-80 h-2 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-3 overflow-hidden border border-slate-300/60 dark:border-slate-700 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${effectiveProgress}%` }}
                  />
                </div>

                {taskId && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-2.5">
                    ETL Task Reference: {taskId}
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* State: Schema Alignment Confirmation Panel (Step 3) */}
        {effectiveStatus === 'queued' && (
          <motion.div
            key="mapping"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-ds-surface shadow-xs overflow-hidden"
          >
            {/* Informative Guidance Header */}
            <div className="p-5 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-blue-50/30 dark:from-amber-950/40 dark:via-ds-surface dark:to-blue-950/20 border-b border-amber-200 dark:border-amber-900/40 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Schema Alignment Required
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      Step 3: Action Needed
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium leading-relaxed max-w-2xl">
                    CSV file <strong className="text-slate-900 dark:text-white">{state.file?.name}</strong> has been uploaded and schema checked. Align each system field to your CSV column headers before ETL transformation resumes.
                  </p>
                </div>
              </div>

              {state.file && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{detectedColumns.length} headers detected</span>
                  <span>•</span>
                  <span>{formatFileSize(state.file.size)}</span>
                </div>
              )}
            </div>

            {/* Mapping Field Alignment Rows */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-ds-border pb-2.5">
                <span className="font-semibold">Review and confirm target schema alignment:</span>
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-matching suggestions applied for review
                </span>
              </div>

              <div className="space-y-2.5">
                {systemColumns.map((col) => {
                  const currentMappedVal = mappings[col.id] || '';
                  const isMapped = Boolean(currentMappedVal);
                  const sampleVal = currentMappedVal ? columnSamples[currentMappedVal] : null;
                  const isSuggested = suggestedMappings[col.id] && suggestedMappings[col.id] === currentMappedVal;

                  return (
                    <div
                      key={col.id}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all duration-150',
                        isMapped
                          ? 'bg-slate-50/70 dark:bg-ds-surface-sunken/50 border-slate-200 dark:border-ds-border'
                          : col.required
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                          : 'bg-slate-50/40 dark:bg-ds-surface-sunken/30 border-slate-200 dark:border-ds-border'
                      )}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[220px_auto_1fr] items-center gap-3">
                        {/* System Target Field Information */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-ds-text">
                              {col.label}
                            </span>
                            {col.required ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Optional
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {col.hint}
                          </p>
                        </div>

                        {/* Arrow separator */}
                        <div className="hidden md:flex items-center justify-center text-slate-400">
                          <ArrowRight className="w-4 h-4" />
                        </div>

                        {/* CSV Column Selector & Sample Data Preview */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="relative flex-1">
                            <select
                              value={currentMappedVal}
                              onChange={(e) => handleMappingChange(col.id, e.target.value)}
                              className={cn(
                                'w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none transition-all shadow-2xs border appearance-none pr-8',
                                isMapped
                                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500/20'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/20'
                              )}
                            >
                              <option value="" disabled>
                                Select matching CSV column...
                              </option>
                              {detectedColumns.map((csvCol) => (
                                <option key={csvCol} value={csvCol}>
                                  {csvCol} {columnSamples[csvCol] ? `(e.g. "${columnSamples[csvCol]}")` : ''}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                              <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                            </div>
                          </div>

                          {/* Sample Value & Status Tag */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isMapped && sampleVal && (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                                <span className="text-slate-400 font-sans text-[10px]">Sample:</span>
                                <span className="font-semibold truncate max-w-[140px]">"{sampleVal}"</span>
                              </div>
                            )}

                            {isSuggested && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                <Sparkles className="w-3 h-3 text-blue-500" />
                                Suggested
                              </span>
                            )}

                            {isMapped ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                ?
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Validation Status & Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-ds-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  {allRequiredMapped ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>All 4 required system fields successfully mapped</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                      <Info className="w-4 h-4 text-rose-500" />
                      <span>Missing required: {missingRequired.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      setState({ file: null, status: 'idle', progress: 0 });
                      setMappings({});
                      setDetectedColumns([]);
                      setColumnSamples({});
                    }}
                    className="h-9 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                  >
                    Cancel Upload
                  </button>

                  <button
                    onClick={resumePipeline}
                    disabled={!allRequiredMapped}
                    title={!allRequiredMapped ? `Please map: ${missingRequired.join(', ')}` : undefined}
                    className="h-9 px-5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xs transition-all duration-150 active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Confirm Mapping &amp; Ingest</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/60 dark:border-slate-700">
            {(historyData?.uploads ?? []).length} recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-ds-border bg-slate-50/80 dark:bg-ds-surface-sunken/50">
                {['Run ID & File Name', 'Rows Processed', 'File Size', 'Upload Date & Time', 'Pipeline Status'].map((h) => (
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
                  transition={{ delay: 0.2 + i * 0.02 }}
                  className="border-b border-slate-100/80 dark:border-ds-border/40 hover:bg-slate-50/70 dark:hover:bg-ds-surface-sunken/40 transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-ds-text">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60 flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{f.filename}</span>
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">Run #{f.id}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                    {(f.rows_processed ?? 0).toLocaleString()} rows
                  </td>

                  <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300 font-mono font-medium">
                    {formatFileSize(f.file_size_bytes, f.size)}
                  </td>

                  <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 tabular-nums font-medium">
                    {f.date} {f.time ? `• ${f.time}` : ''}
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-2xs',
                        f.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : f.status === 'queued' || f.status === 'processing'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      )}
                    >
                      {f.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : f.status === 'queued' || f.status === 'processing' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
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
