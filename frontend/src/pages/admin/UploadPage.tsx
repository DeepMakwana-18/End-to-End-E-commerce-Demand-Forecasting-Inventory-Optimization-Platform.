/**
 * Titan AI — Upload Sales Data Page (/app/admin/upload)
 *
 * Refined with Titan AI editorial design system:
 * - Full-width Titan editorial header and grid alignment (no unexplained right-side gap).
 * - Accessible drop zone (click, keyboard Enter/Space, drag-and-drop) with file replacement & inline validation feedback.
 * - Explicit workflow clarity: local CSV header inspection first -> schema mapping confirmation -> server ETL & ML retraining.
 * - Truthful 6-stage pipeline stepper driven strictly by client validation and real task progress (useTaskProgress).
 * - Actionable error recovery (return to column mapping or choose another file) and live history invalidation.
 * - Responsive desktop table + mobile stacked cards with reduced-motion support.
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  Sparkles,
  Check,
  RotateCcw,
  Info,
  HelpCircle,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';
import { useTaskProgress } from '@/hooks/useTaskProgress';
import { PageHeader } from '@/components/ui/PageHeader';
import api from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import '@/styles/titan-dashboard.css';

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

interface SystemColumnDefinition {
  id: string;
  label: string;
  required: boolean;
  dataType: string;
  expectedFormat: string;
  example: string;
  purpose: string;
}

const PIPELINE_STEPS = [
  { id: 'uploading', icon: Upload, label: 'Upload', desc: 'CSV selected', stepIdx: 0 },
  { id: 'validating', icon: FileSpreadsheet, label: 'Validate', desc: 'Headers checked', stepIdx: 1 },
  { id: 'mapping', icon: LinkIcon, label: 'Map Data', desc: 'Confirm columns', stepIdx: 2 },
  { id: 'processing', icon: Database, label: 'ETL', desc: 'Transform & load', stepIdx: 3 },
  { id: 'ml', icon: Cpu, label: 'ML', desc: 'Retrain models', stepIdx: 4 },
  { id: 'completed', icon: CheckCircle2, label: 'Done', desc: 'Data ready', stepIdx: 5 },
];

const SYSTEM_COLUMNS: SystemColumnDefinition[] = [
  {
    id: 'transaction_date',
    label: 'Transaction Date',
    required: true,
    dataType: 'Timestamp / ISO Date',
    expectedFormat: 'YYYY-MM-DD or YYYY-MM-DD HH:mm:ss',
    example: '2026-01-15 18:30:00',
    purpose: 'Orders and resamples demand telemetry into weekly time-series intervals for ML lag feature engineering.',
  },
  {
    id: 'product_sku',
    label: 'Product SKU',
    required: true,
    dataType: 'Alphanumeric Code',
    expectedFormat: 'Unique SKU identifier string (e.g. ABC-123)',
    example: 'TECH-KB-001',
    purpose: 'Maps demand and reorder parameters to individual product variants in catalog and inventory records.',
  },
  {
    id: 'quantity_sold',
    label: 'Quantity Sold',
    required: true,
    dataType: 'Positive Integer',
    expectedFormat: 'Numeric volume units sold (integer > 0)',
    example: '14',
    purpose: 'Primary demand metric used as the target regression variable during ML training and loss evaluation.',
  },
  {
    id: 'unit_price',
    label: 'Unit Price',
    required: true,
    dataType: 'Decimal Currency',
    expectedFormat: 'Numeric price per unit ($ / € / £)',
    example: '89.99',
    purpose: 'Computes inventory holding valuation, stockout loss severity, and revenue impact predictions.',
  },
  {
    id: 'category',
    label: 'Category',
    required: false,
    dataType: 'Text String (Optional)',
    expectedFormat: 'Product family or department name',
    example: 'Electronics',
    purpose: 'Enables category-level aggregation, demand rollups, and cross-category cannibalization modeling.',
  },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB limit

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
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();

  const [state, setState] = useState<UploadState>({ file: null, status: 'idle', progress: 0 });
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnSamples, setColumnSamples] = useState<Record<string, string>>({});
  const [suggestedMappings, setSuggestedMappings] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [activeHelpColumn, setActiveHelpColumn] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedAtStep, setFailedAtStep] = useState<number>(3);

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

  // Refresh upload history when background task completes or fails
  useEffect(() => {
    if (taskStatus?.state === 'completed' || taskStatus?.state === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['upload-history'] });
    }
  }, [taskStatus?.state, queryClient]);

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

  const resetAll = () => {
    setState({ file: null, status: 'idle', progress: 0 });
    setTaskId(null);
    setMappings({});
    setDetectedColumns([]);
    setColumnSamples({});
    setSuggestedMappings({});
    setHasAttemptedSubmit(false);
    setActiveHelpColumn(null);
    setSelectionError(null);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Process selected CSV locally (header inspection only — does NOT upload until confirmed)
  const processFileAndStart = (file: File) => {
    setSelectionError(null);
    setUploadError(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      const msg = `"${file.name}" is not a .csv file. Only comma-separated (.csv) files are supported.`;
      setSelectionError(msg);
      toast.warning('Invalid file format', 'Only standard comma-separated (.csv) files are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      const msg = `"${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB limit.`;
      setSelectionError(msg);
      toast.error('File size exceeded', msg);
      return;
    }

    if (file.size === 0) {
      const msg = `"${file.name}" is empty (0 bytes). Choose a CSV file with headers and rows.`;
      setSelectionError(msg);
      toast.error('Empty file', msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        const msg = 'The selected CSV file contains no readable text.';
        setSelectionError(msg);
        toast.error('Empty file contents', msg);
        return;
      }
      setRawCsvText(text);

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        const msg = 'No valid rows detected in the CSV file.';
        setSelectionError(msg);
        toast.error('Invalid CSV format', msg);
        return;
      }

      const firstLine = lines[0] || '';
      if (!firstLine.includes(',')) {
        const msg = 'First row does not appear to be comma-separated headers.';
        setSelectionError(msg);
        toast.error('Invalid CSV delimiter', msg);
        return;
      }

      const headers = firstLine
        .split(',')
        .map((h) => h.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);

      if (headers.length === 0) {
        const msg = 'Could not detect column headers in the first row.';
        setSelectionError(msg);
        toast.error('Missing CSV headers', msg);
        return;
      }

      setDetectedColumns(headers);

      const sampleRow = lines[1]
        ? lines[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
        : [];
      const samples: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const val = sampleRow[idx];
        samples[h] = val !== undefined && val !== '' ? val : '—';
      });
      setColumnSamples(samples);

      const proposed: Record<string, string> = {};
      SYSTEM_COLUMNS.forEach((sys) => {
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
        if (match) proposed[sys.id] = match;
      });

      setSuggestedMappings(proposed);
      setMappings(proposed);
      setHasAttemptedSubmit(false);
      setActiveHelpColumn(null);
      setState({ file, status: 'queued', progress: 0 });
    };

    reader.onerror = () => {
      const msg = 'Unable to read the selected CSV file from disk.';
      setSelectionError(msg);
      toast.error('File read error', msg);
    };

    reader.readAsText(file);
  };

  // Submit file + confirmed mappings to POST /upload
  const resumePipeline = async () => {
    if (!state.file) return;

    if (!allRequiredMapped) {
      setHasAttemptedSubmit(true);
      toast.error('Required mappings missing', `Map all ${requiredCount} required fields (${missingRequired.join(', ')}) to continue.`);
      return;
    }

    setUploadError(null);
    setState((s) => ({ ...s, status: 'uploading', progress: 0 }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('mappings', JSON.stringify(mappings));

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { task_id } = res.data as { task_id: string };
      setTaskId(task_id);
      setState((s) => ({ ...s, status: 'processing', progress: 0 }));
      toast.info('Ingestion queued', 'Dataset uploaded and queued for ETL & ML retraining.');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const safeDetail =
        status && status < 500 && typeof detail === 'string' && detail.trim()
          ? detail
          : 'The server could not queue this dataset. Verify your column mappings and retry.';
      setFailedAtStep(3);
      setUploadError(safeDetail);
      setState((s) => ({ ...s, status: 'error', progress: 0 }));
      toast.error('Upload failed', safeDetail);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (effectiveStatus !== 'idle') return;
    const file = e.dataTransfer.files[0];
    if (file) processFileAndStart(file);
  };

  const handleMappingChange = (sysCol: string, csvCol: string) => {
    setMappings((prev) => ({ ...prev, [sysCol]: csvCol }));
  };

  const requiredCount = SYSTEM_COLUMNS.filter((c) => c.required).length;
  const mappedRequiredCount = SYSTEM_COLUMNS.filter((c) => c.required && mappings[c.id]).length;
  const missingRequired = SYSTEM_COLUMNS.filter((c) => c.required && !mappings[c.id]).map((c) => c.label);

  const allRequiredMapped = missingRequired.length === 0;
  const suggestedCount = Object.keys(suggestedMappings).length;

  const duplicateSourceColumns = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(mappings).forEach((col) => {
      if (col) counts[col] = (counts[col] || 0) + 1;
    });
    return Object.keys(counts).filter((col) => counts[col] > 1);
  }, [mappings]);

  // Derive truthful visual state for each of the 6 pipeline stages
  const getStepVisualState = (stepIndex: number): StepVisualState => {
    if (effectiveStatus === 'idle') return 'pending';

    if (effectiveStatus === 'error') {
      const failIdx = taskStatus?.state === 'failed' && (taskStatus.progress ?? 0) >= 75 ? 4 : failedAtStep;
      if (stepIndex === failIdx) return 'failed';
      if (stepIndex < failIdx) return 'completed';
      return 'pending';
    }

    if (effectiveStatus === 'completed') return 'completed';

    if (effectiveStatus === 'queued') {
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
      }
      if (stepIndex === 3) return 'completed';
      if (stepIndex === 4) return 'active';
      return 'pending';
    }

    return 'pending';
  };

  const stepperHeaderText = useMemo(() => {
    if (effectiveStatus === 'idle') return 'Standby · Awaiting CSV selection';
    if (effectiveStatus === 'queued') return 'Step 3 of 6 · Confirm Column Mapping';
    if (effectiveStatus === 'uploading') return 'Step 4 of 6 · Uploading CSV to Server';
    if (effectiveStatus === 'processing') {
      return (effectiveProgress ?? 0) < 75
        ? 'Step 4 of 6 · ETL Ingestion in Progress'
        : 'Step 5 of 6 · ML Retraining in Progress';
    }
    if (effectiveStatus === 'completed') return 'Completed · Data Ingested & Models Retrained';
    if (effectiveStatus === 'error') return 'Failed · Pipeline Interrupted';
    return 'Standby';
  }, [effectiveStatus, effectiveProgress]);

  const historyUploads = historyData?.uploads ?? [];

  return (
    <div className="space-y-5 sm:space-y-6 pb-4">
      <PageHeader
        title="Upload Sales Data"
        description="Inspect CSV headers, map required columns, and trigger ETL ingestion and model retraining"
        actions={
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-ds-surface border border-ds-hairline text-xs font-semibold text-ds-text-primary"
            title="Ingestion service endpoint is available; current workflow state is shown below"
          >
            <span className="w-2 h-2 rounded-full bg-ds-blue" aria-hidden="true" />
            <span>Ingestion Service Ready</span>
          </div>
        }
      />

      {/* ── 2. Enterprise ETL Pipeline Stepper ───────────────────────── */}
      <section
        aria-label="ETL Pipeline Status"
        className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] p-5 sm:p-6 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3.5 border-b border-[#e4e4e7] dark:border-[#27272a]">
          <div>
            <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
              Enterprise ETL Pipeline
            </h2>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Current run status — steps advance only as client validation and server task events confirm them
            </p>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-center',
              effectiveStatus === 'completed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                : effectiveStatus === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                : effectiveStatus === 'queued'
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                : effectiveStatus === 'processing' || effectiveStatus === 'uploading'
                ? 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40'
                : 'bg-[#fafaf9] text-[#52525b] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]'
            )}
          >
            {stepperHeaderText}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 relative">
          {PIPELINE_STEPS.map((step, i) => {
            const visualState = getStepVisualState(i);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center text-center relative">
                <div
                  className={cn(
                    'w-10 h-10 rounded-[12px] flex items-center justify-center transition-colors duration-150 border',
                    visualState === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                      : visualState === 'action_required'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700'
                      : visualState === 'failed'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700'
                      : visualState === 'active'
                      ? 'bg-[#1e3fc8] text-white border-[#1e3fc8]'
                      : 'bg-[#fafaf9] text-[#52525b] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]'
                  )}
                >
                  {visualState === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  ) : visualState === 'action_required' ? (
                    <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                  ) : visualState === 'failed' ? (
                    <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                  ) : visualState === 'active' ? (
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <StepIcon className="w-4.5 h-4.5" aria-hidden="true" />
                  )}
                </div>

                <p
                  className={cn(
                    'text-xs mt-2 font-bold',
                    visualState === 'completed'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : visualState === 'action_required'
                      ? 'text-amber-700 dark:text-amber-300'
                      : visualState === 'failed'
                      ? 'text-rose-700 dark:text-rose-300'
                      : visualState === 'active'
                      ? 'text-[#1e3fc8] dark:text-[#60a5fa]'
                      : 'text-[#0a0a0a] dark:text-[#fafaf9]'
                  )}
                >
                  {step.label}
                </p>

                <p className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">
                  {visualState === 'action_required'
                    ? 'Action needed'
                    : visualState === 'failed'
                    ? 'Failed'
                    : visualState === 'active'
                    ? 'In progress'
                    : visualState === 'completed'
                    ? 'Complete'
                    : step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3 & 4. Drop Zone & Mapping Workspace ─────────────────────── */}
      <AnimatePresence mode="wait">
        {effectiveStatus !== 'queued' && (
          <motion.div
            key="dropzone"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFileAndStart(f);
                e.target.value = '';
              }}
            />

            {effectiveStatus === 'idle' ? (
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload sales CSV file. Press Enter or Space to browse, or drag and drop a file here."
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                className={cn(
                  'rounded-[16px] py-9 px-6 border-2 border-dashed transition-all duration-150 text-center flex flex-col items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                  isDragOver
                    ? 'border-[#1e3fc8] bg-[#eff6ff] dark:bg-[#1e3fc8]/15'
                    : 'border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] hover:border-[#1e3fc8] dark:hover:border-[#60a5fa]'
                )}
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 text-[#1e3fc8] dark:text-[#60a5fa] border border-[#bfdbfe] dark:border-[#1e3fc8]/40 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                  Drag &amp; drop your sales CSV here, or click to browse
                </h2>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1.5 font-medium max-w-xl">
                  Selecting a file inspects headers locally in your browser first. Nothing is uploaded or retrained until you confirm column mappings.
                </p>

                <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] mt-4">
                  <HardDrive className="w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
                  <span>Max size: 50 MB</span>
                  <span aria-hidden="true">·</span>
                  <span>Format: .CSV (UTF-8 / Latin-1)</span>
                  <span aria-hidden="true">·</span>
                  <span>4 required columns</span>
                </div>

                {selectionError && (
                  <div
                    role="alert"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 px-4 py-2.5 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2 max-w-lg"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>{selectionError}</span>
                  </div>
                )}
              </div>
            ) : effectiveStatus === 'completed' ? (
              <div className="rounded-[16px] py-9 px-6 border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-[14px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                  Pipeline Execution Succeeded
                </h2>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 font-medium max-w-md">
                  {state.file?.name ? `${state.file.name} was ingested, validated, and models were retrained.` : 'Dataset ingested and models retrained.'}
                </p>
                <button
                  type="button"
                  onClick={resetAll}
                  className="mt-5 min-h-[40px] px-4 rounded-[10px] border border-[#e4e4e7] dark:border-[#27272a] bg-white hover:bg-[#fafaf9] dark:bg-[#111113] dark:hover:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Upload Another File</span>
                </button>
              </div>
            ) : effectiveStatus === 'error' ? (
              <div
                role="alert"
                className="rounded-[16px] py-9 px-6 border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 text-center flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-[14px] bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-base font-bold text-rose-800 dark:text-rose-300">
                  Pipeline Processing Failed
                </h2>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1.5 font-medium max-w-lg">
                  {uploadError ||
                    taskStatus?.error ||
                    'An error occurred during ingestion or validation. Review your column mappings or select another CSV file.'}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  {state.file && detectedColumns.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null);
                        setTaskId(null);
                        setState((s) => ({ ...s, status: 'queued', progress: 0 }));
                      }}
                      className="min-h-[40px] px-4 rounded-[10px] bg-[#1e3fc8] hover:bg-[#1935a8] text-white text-xs font-semibold cursor-pointer"
                    >
                      Review Column Mappings
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={resetAll}
                    className="min-h-[40px] px-4 rounded-[10px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] text-xs font-semibold cursor-pointer"
                  >
                    Choose Another File
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[16px] py-9 px-6 border border-[#bfdbfe] dark:border-[#1e3fc8]/40 bg-[#eff6ff]/40 dark:bg-[#1e3fc8]/10 text-center flex flex-col items-center justify-center">
                {state.file && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] text-xs font-semibold mb-3">
                    <FileSpreadsheet className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
                    <span>{state.file.name}</span>
                    <span className="text-[#52525b] dark:text-[#a1a1aa] font-mono">
                      ({formatFileSize(state.file.size)})
                    </span>
                  </div>
                )}

                <Loader2 className="w-7 h-7 text-[#1e3fc8] dark:text-[#60a5fa] animate-spin mb-2" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                  {effectiveStatus === 'uploading'
                    ? 'Submitting CSV and mappings to server...'
                    : taskStatus?.message || 'Processing dataset & retraining models...'}
                </h2>
                <p className="text-xs font-mono font-semibold text-[#1e3fc8] dark:text-[#60a5fa] mt-1 tabular-nums">
                  {effectiveProgress}% reported by worker
                </p>

                <div className="w-64 sm:w-80 h-2 bg-[#e4e4e7] dark:bg-[#27272a] rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-[#1e3fc8] dark:bg-[#60a5fa] rounded-full transition-all duration-300"
                    style={{ width: `${effectiveProgress}%` }}
                  />
                </div>

                {taskId && (
                  <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-mono mt-2.5">
                    Task ID: {taskId}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Schema Alignment Confirmation Panel */}
        {effectiveStatus === 'queued' && (
          <motion.div
            key="mapping"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="rounded-[16px] border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#111113] overflow-hidden"
          >
            <div className="p-5 bg-amber-50/60 dark:bg-amber-950/25 border-b border-amber-200 dark:border-amber-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center flex-shrink-0 border border-amber-200 dark:border-amber-800/60">
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                      Schema Alignment Required
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200">
                      Step 3: Confirm before upload
                    </span>
                  </div>
                  <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 font-medium leading-relaxed max-w-2xl">
                    Selected file <strong className="text-[#0a0a0a] dark:text-[#fafaf9]">{state.file?.name}</strong> has been inspected locally. Confirming ingestion below will upload this dataset and queue ML model retraining.
                  </p>
                </div>
              </div>

              {state.file && (
                <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-xs font-semibold text-[#0a0a0a] dark:text-[#fafaf9]">
                    <FileSpreadsheet className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
                    <span>{detectedColumns.length} headers</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatFileSize(state.file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="min-h-[34px] px-3 rounded-[10px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-xs font-semibold text-[#1e3fc8] dark:text-[#60a5fa] hover:border-[#1e3fc8] cursor-pointer"
                  >
                    Replace File
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#e4e4e7] dark:border-[#27272a] pb-3">
                <div className="flex items-center gap-2">
                  {suggestedCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3fc8] dark:text-[#93c5fd] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 px-2.5 py-1 rounded-[8px] border border-[#bfdbfe] dark:border-[#1e3fc8]/40">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{suggestedCount} of {SYSTEM_COLUMNS.length} fields auto-suggested</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] bg-[#fafaf9] dark:bg-[#18181b] px-2.5 py-1 rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a]">
                      <Info className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>No automatic matches detected — select matching headers below</span>
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-bold border self-start sm:self-center',
                    allRequiredMapped
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                      : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                  )}
                >
                  <span>{mappedRequiredCount} of {requiredCount} required fields mapped</span>
                </span>
              </div>

              {duplicateSourceColumns.length > 0 && (
                <div className="p-3 rounded-[10px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    CSV column <strong>"{duplicateSourceColumns.join('", "')}"</strong> is mapped to multiple system fields. Each field should map to a distinct column.
                  </span>
                </div>
              )}

              {detectedColumns.length < 4 && (
                <div className="p-3 rounded-[10px] bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    This CSV has only <strong>{detectedColumns.length}</strong> headers. At least 4 columns (Transaction Date, Product SKU, Quantity Sold, Unit Price) are required.
                  </span>
                </div>
              )}

              <div className="space-y-2.5">
                {SYSTEM_COLUMNS.map((col) => {
                  const currentMappedVal = mappings[col.id] || '';
                  const isMapped = Boolean(currentMappedVal);
                  const sampleVal = currentMappedVal ? columnSamples[currentMappedVal] : null;
                  const isSuggested = suggestedMappings[col.id] && suggestedMappings[col.id] === currentMappedVal;
                  const isMissingAfterSubmit = hasAttemptedSubmit && col.required && !isMapped;
                  const isHelpOpen = activeHelpColumn === col.id;

                  return (
                    <div
                      key={col.id}
                      className={cn(
                        'p-3.5 rounded-[12px] border transition-colors duration-150',
                        isMapped
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/50'
                          : isMissingAfterSubmit
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                          : 'bg-white dark:bg-[#111113] border-[#e4e4e7] dark:border-[#27272a]'
                      )}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[240px_auto_1fr] items-center gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <label
                              htmlFor={`map-select-${col.id}`}
                              className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]"
                            >
                              {col.label}
                            </label>
                            {col.required ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#fafaf9] text-[#52525b] dark:bg-[#18181b] dark:text-[#a1a1aa]">
                                Optional
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label={`Field specification for ${col.label}`}
                              aria-expanded={isHelpOpen}
                              onClick={() => setActiveHelpColumn(isHelpOpen ? null : col.id)}
                              className="text-[#52525b] hover:text-[#1e3fc8] dark:text-[#a1a1aa] dark:hover:text-[#60a5fa] p-0.5 cursor-pointer"
                            >
                              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          <p className="text-[10px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">
                            {col.dataType} · {col.expectedFormat}
                          </p>
                        </div>

                        <div className="hidden md:flex items-center justify-center text-[#52525b] dark:text-[#a1a1aa]">
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <select
                            id={`map-select-${col.id}`}
                            value={currentMappedVal}
                            onChange={(e) => handleMappingChange(col.id, e.target.value)}
                            className="flex-1 min-h-[38px] px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-white dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20 cursor-pointer"
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

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isMapped && sampleVal && (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] text-[11px] font-mono border border-[#e4e4e7] dark:border-[#27272a]">
                                <span className="text-[#52525b] dark:text-[#a1a1aa] font-sans text-[10px]">Sample:</span>
                                <span className="font-semibold truncate max-w-[120px]">"{sampleVal}"</span>
                              </div>
                            )}

                            {isSuggested && (
                              <span className="text-[10px] font-semibold text-[#1e3fc8] dark:text-[#93c5fd] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 px-2 py-0.5 rounded border border-[#bfdbfe] dark:border-[#1e3fc8]/40">
                                Suggested
                              </span>
                            )}

                            {isMapped && (
                              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isHelpOpen && (
                        <div className="mt-3 p-3.5 rounded-[10px] bg-[#eff6ff]/70 dark:bg-[#1e3fc8]/10 border border-[#bfdbfe] dark:border-[#1e3fc8]/30 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                            <span>{col.label} — Specification</span>
                            <button
                              type="button"
                              aria-label="Close field specification"
                              onClick={() => setActiveHelpColumn(null)}
                              className="text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          <p className="text-[#52525b] dark:text-[#a1a1aa] text-[11px] leading-relaxed">
                            {col.purpose}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                            <div>
                              <span className="text-[#52525b] dark:text-[#a1a1aa] font-sans">Format: </span>
                              <strong className="text-[#0a0a0a] dark:text-[#fafaf9]">{col.expectedFormat}</strong>
                            </div>
                            <div>
                              <span className="text-[#52525b] dark:text-[#a1a1aa] font-sans">Example: </span>
                              <strong className="text-[#0a0a0a] dark:text-[#fafaf9]">"{col.example}"</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  {allRequiredMapped ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      All {requiredCount} required fields mapped — ready to upload and retrain
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#52525b] dark:text-[#a1a1aa] font-medium">
                      <Info className="w-4 h-4 text-amber-600" aria-hidden="true" />
                      Remaining required: {missingRequired.join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="min-h-[40px] px-4 rounded-[10px] border border-[#e4e4e7] dark:border-[#27272a] bg-white hover:bg-[#fafaf9] dark:bg-[#18181b] dark:hover:bg-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] text-xs font-semibold cursor-pointer"
                  >
                    Cancel Upload
                  </button>

                  <button
                    type="button"
                    onClick={resumePipeline}
                    disabled={!allRequiredMapped}
                    className="min-h-[40px] px-5 rounded-[10px] text-xs font-semibold text-white bg-[#1e3fc8] hover:bg-[#1935a8] transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Confirm Mapping &amp; Ingest ({mappedRequiredCount}/{requiredCount})</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. Historic Ingestion Logs ───────────────────────────────── */}
      <section
        aria-label="Recent Ingestion Logs"
        className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9]/70 dark:bg-[#18181b]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
              Recent Ingestion Logs
            </h2>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Historical upload runs from database (independent of the current pipeline state above)
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-[8px] bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] text-xs font-semibold border border-[#e4e4e7] dark:border-[#27272a] font-mono tabular-nums self-start sm:self-center">
            {historyUploads.length} recorded
          </span>
        </div>

        {historyUploads.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[#52525b] dark:text-[#a1a1aa]">
            No upload telemetry recorded yet. Select and confirm a CSV dataset above.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b]/60">
                    {['Run ID & File Name', 'Rows Processed', 'File Size', 'Upload Date & Time', 'Pipeline Status'].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-5 py-3 text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                  {historyUploads.map((f) => (
                    <tr
                      key={f.id}
                      className="hover:bg-[#fafaf9] dark:hover:bg-[#18181b]/40 transition-colors duration-150"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-[10px] bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40 flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#0a0a0a] dark:text-[#fafaf9]">{f.filename}</p>
                            <p className="text-[10px] font-mono text-[#52525b] dark:text-[#a1a1aa]">Run #{f.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-[#0a0a0a] dark:text-[#fafaf9] font-semibold tabular-nums">
                        {(f.rows_processed ?? 0).toLocaleString()} rows
                      </td>

                      <td className="px-5 py-3.5 text-xs text-[#52525b] dark:text-[#a1a1aa] font-mono tabular-nums">
                        {formatFileSize(f.file_size_bytes, f.size)}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-[#52525b] dark:text-[#a1a1aa] tabular-nums">
                        {f.date} {f.time ? `· ${f.time}` : ''}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border',
                            f.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                              : f.status === 'queued' || f.status === 'processing'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                          )}
                        >
                          {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (<768px) */}
            <div className="md:hidden divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
              {historyUploads.map((f) => (
                <div key={f.id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] break-words">
                        {f.filename}
                      </p>
                      <p className="text-[11px] font-mono text-[#52525b] dark:text-[#a1a1aa]">
                        Run #{f.id} · {formatFileSize(f.file_size_bytes, f.size)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] capitalize flex-shrink-0">
                      {f.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] tabular-nums">
                    {(f.rows_processed ?? 0).toLocaleString()} rows · {f.date} {f.time ? `· ${f.time}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
