/**
 * Titan AI — Reports & Exports Page (/app/reports)
 *
 * Refined with Titan AI editorial design system:
 * - Warm paper / near-black surfaces, editorial header, blue primary actions, restrained amber attention.
 * - Honest KPIs derived strictly from GET /reports (no fabricated generation times or download counts).
 * - Explicit accessible format buttons ("Generate <Template> as <Format>") with per-button loading state.
 * - Clear distinction between metadata compilation, immediate download, and deferred archival storage.
 * - Responsive desktop table + mobile stacked cards with 44px-class touch targets and reduced-motion support.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  FileDown,
  FileBarChart,
  Database,
  Upload,
  AlertCircle,
  Info,
  Layers,
  HelpCircle,
  Archive,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, systemApi } from '@/services/api';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Report } from '@/types';
import '@/styles/titan-dashboard.css';

interface ReportTypeConfig {
  id: string;
  title: string;
  desc: string;
  tag: string;
  icon: React.ElementType;
  accentClass: string;
}

const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: 'forecast',
    title: 'Demand Forecast Report',
    desc: 'Product-wise demand projections, model confidence bands, and velocity trajectories across planning horizons.',
    tag: 'ML Forecasts',
    icon: FileBarChart,
    accentClass: 'text-[#1e3fc8] dark:text-[#60a5fa] bg-[#eff6ff] dark:bg-[#1e3fc8]/15 border-[#bfdbfe] dark:border-[#1e3fc8]/30',
  },
  {
    id: 'inventory',
    title: 'Inventory Health Report',
    desc: 'Safety stock buffers, reorder thresholds, stockout exposures, and replenishment priorities for multi-echelon stock.',
    tag: 'Stock Health',
    icon: FileSpreadsheet,
    accentClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
  },
  {
    id: 'sales',
    title: 'Sales Analytics Report',
    desc: 'Historical revenue distributions, top-performing SKUs, momentum metrics, and channel-specific velocity.',
    tag: 'Revenue & Sales',
    icon: FileText,
    accentClass: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
  },
  {
    id: 'category',
    title: 'Category Performance Report',
    desc: 'Segment-level demand distributions, quarterly seasonal dynamics, and catalog mix contribution margins.',
    tag: 'Segmentation',
    icon: FileDown,
    accentClass: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/50',
  },
];

const EXPORT_FORMATS = [
  {
    key: 'CSV',
    label: 'CSV',
    icon: FileText,
    description: 'Structured comma-separated table',
    hoverClass: 'hover:border-[#1e3fc8] hover:text-[#1e3fc8] dark:hover:border-[#60a5fa] dark:hover:text-[#60a5fa]',
    iconColor: 'text-[#1e3fc8] dark:text-[#60a5fa]',
  },
  {
    key: 'Excel',
    label: 'Excel',
    icon: FileSpreadsheet,
    description: 'Workbook (.xlsx) format',
    hoverClass: 'hover:border-emerald-600 hover:text-emerald-700 dark:hover:border-emerald-400 dark:hover:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'PDF',
    label: 'PDF',
    icon: FileDown,
    description: 'Executive summary document',
    hoverClass: 'hover:border-rose-600 hover:text-rose-700 dark:hover:border-rose-400 dark:hover:text-rose-300',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
] as const;

interface ReportKPICardProps {
  title: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  tooltipText: string;
  emphasized?: boolean;
  delayMs?: number;
}

function ReportKPICard({
  title,
  value,
  sub,
  icon: Icon,
  iconColor,
  tooltipText,
  emphasized = false,
  delayMs = 0,
}: ReportKPICardProps) {
  return (
    <div
      style={{ '--reveal-delay': `${delayMs}ms` } as React.CSSProperties}
      className={cn(
        'titan-dash-reveal titan-kpi-wrap',
        emphasized && 'titan-kpi-wrap--emphasized'
      )}
    >
      <div className="titan-kpi-card rounded-[16px] p-5 border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] flex flex-col justify-between min-h-[144px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.08em] truncate">
                {title}
              </p>
              <span
                className="text-[#52525b]/70 hover:text-[#0a0a0a] dark:text-[#a1a1aa]/70 dark:hover:text-[#fafaf9] cursor-help flex-shrink-0"
                title={tooltipText}
                aria-label={tooltipText}
              >
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </div>
            <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#0a0a0a] dark:text-[#fafaf9]">
              {value}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-center flex-shrink-0">
            <Icon className={cn('w-4.5 h-4.5', iconColor)} aria-hidden="true" />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] leading-snug">
          {sub}
        </p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const prefersReducedMotion = useReducedMotion();
  const [pendingRequest, setPendingRequest] = useState<{ id: string; format: string } | null>(null);
  const [lastOutcome, setLastOutcome] = useState<{
    templateId: string;
    templateTitle: string;
    format: string;
    status: 'success' | 'error';
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const { data: reportsData, isLoading: isLoadingReports } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.getAll().then((res) => res.data),
  });

  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    },
  });

  const isEmptyOrg = Boolean(systemStatus && !systemStatus.dataset_exists);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  const generateMutation = useMutation({
    mutationFn: ({ id, format, name }: { id: string; format: string; name: string }) =>
      reportsApi.generate(id, format.toLowerCase(), name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      const rt = REPORT_TYPES.find((r) => r.id === variables.id);
      const title = rt?.title || 'Report';
      setPendingRequest(null);
      setLastOutcome({
        templateId: variables.id,
        templateTitle: title,
        format: variables.format,
        status: 'success',
        message: `${title} (${variables.format}) logged in generation history. File download is unavailable because physical artifact storage is deferred.`,
      });
      showToast(`${title} (${variables.format}) logged in history`);
    },
    onError: (err: unknown, variables) => {
      setPendingRequest(null);
      const rt = REPORT_TYPES.find((r) => r.id === variables.id);
      const title = rt?.title || 'Report';
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      const errMsg = detail || `Failed to compile ${title} (${variables.format})`;
      setLastOutcome({
        templateId: variables.id,
        templateTitle: title,
        format: variables.format,
        status: 'error',
        message: errMsg,
      });
      showToast(errMsg, true);
    },
  });

  const recentReports: Report[] = reportsData?.reports || [];
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const reportsThisMonth = recentReports.filter(
    (r) => r.date && r.date.startsWith(currentMonthPrefix)
  ).length;
  const downloadableCount = recentReports.filter(
    (r) => r.size && r.size !== 'N/A' && r.status === 'completed'
  ).length;
  const deferredCount = recentReports.filter(
    (r) => !r.size || r.size === 'N/A'
  ).length;

  const handleGenerate = (id: string, format: string) => {
    if (pendingRequest !== null) return;
    if (isEmptyOrg) {
      showToast('Upload a dataset before compiling reports', true);
      return;
    }
    setPendingRequest({ id, format });
    const reportType = REPORT_TYPES.find((r) => r.id === id);
    const name = `${reportType?.title || 'Report'} - ${new Date().toLocaleDateString()}`;
    generateMutation.mutate({ id, format, name });
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-4">
      {/* ── Toast Notification ───────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            className={cn(
              'fixed top-4 right-4 z-50 px-4 py-3 rounded-[12px] text-xs font-semibold flex items-center gap-2.5 shadow-ds-float-2 border max-w-sm',
              toast.isError
                ? 'bg-ds-red-surface text-ds-red-text border-ds-red/30'
                : 'bg-ds-surface text-ds-text-primary border-ds-hairline'
            )}
          >
            {toast.isError ? (
              <AlertCircle className="w-4 h-4 text-ds-red flex-shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-ds-green flex-shrink-0" aria-hidden="true" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title="Reports & Exports"
        description="Compile analytics report requests in CSV, Excel, or PDF formats and review generation history"
        actions={
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-ds-surface border border-ds-hairline text-xs font-semibold text-ds-text-primary"
            title="Report metadata API is ready; physical file storage is deferred"
          >
            <span className="w-2 h-2 rounded-full bg-ds-green" aria-hidden="true" />
            <span>Export Engine Ready</span>
          </div>
        }
      />

      {/* ── 2. Data Availability Banner ──────────────────────────────── */}
      {isEmptyOrg && (
        <div
          role="alert"
          className="p-4 sm:p-5 rounded-[16px] border border-amber-300/80 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center flex-shrink-0 text-amber-700 dark:text-amber-400">
              <Database className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                  Dataset Required for Report Compilation
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                  Prerequisite
                </span>
              </div>
              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 font-medium leading-relaxed max-w-2xl">
                This workspace does not have an active sales or inventory dataset. Upload data before compiling report records.
              </p>
            </div>
          </div>
          <Link
            to="/upload"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-[10px] bg-[#1e3fc8] hover:bg-[#1935a8] text-white text-xs font-semibold transition-colors self-start sm:self-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            Go to Data Upload
          </Link>
        </div>
      )}

      {/* ── 3. Honest KPI Summary Strip ──────────────────────────────── */}
      <section aria-label="Report Telemetry Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKPICard
          title="Reports Logged"
          value={isLoadingReports ? '—' : String(recentReports.length)}
          sub={
            recentReports.length > 0
              ? `Records returned from generation log (max 50)`
              : 'No compilation records logged'
          }
          icon={FileText}
          iconColor="text-[#1e3fc8] dark:text-[#60a5fa]"
          tooltipText="Count of report records returned by GET /reports (capped at 50 most recent rows)"
          emphasized={true}
          delayMs={30}
        />

        <ReportKPICard
          title="This Month"
          value={isLoadingReports ? '—' : String(reportsThisMonth)}
          sub={`Compiled in ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`}
          icon={Calendar}
          iconColor="text-emerald-600 dark:text-emerald-400"
          tooltipText="Report records whose created date falls in the current calendar month"
          delayMs={60}
        />

        <ReportKPICard
          title="Archived Files"
          value={isLoadingReports ? '—' : String(downloadableCount)}
          sub={
            deferredCount > 0
              ? `${deferredCount} ${deferredCount === 1 ? 'record' : 'records'} storage-deferred`
              : 'Persistent file storage pending'
          }
          icon={Archive}
          iconColor="text-amber-600 dark:text-amber-400"
          tooltipText="Number of logged reports with a stored file size ready for archive download"
          delayMs={90}
        />

        <ReportKPICard
          title="Templates & Formats"
          value={`${REPORT_TYPES.length} × ${EXPORT_FORMATS.length}`}
          sub="4 analytics templates · CSV, Excel, PDF"
          icon={Layers}
          iconColor="text-sky-600 dark:text-sky-400"
          tooltipText="Supported report templates and export formats"
          delayMs={120}
        />
      </section>

      {/* ── 4. Generate New Report (Templates + Formats) ─────────────── */}
      <section aria-label="Generate New Report" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
              Generate New Report
            </h2>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Step 1: Choose an analytics template. Step 2: Select a format to log a compilation request.
            </p>
          </div>
          <span className="text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
            Requests log metadata immediately; binary file archival is deferred
          </span>
        </div>

        {/* Inline Request Outcome Banner */}
        <AnimatePresence>
          {lastOutcome && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={cn(
                'p-3.5 rounded-[12px] border text-xs flex items-start justify-between gap-3',
                lastOutcome.status === 'error'
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
                  : 'bg-[#eff6ff]/70 dark:bg-[#1e3fc8]/10 border-[#bfdbfe] dark:border-[#1e3fc8]/30 text-[#0a0a0a] dark:text-[#fafaf9]'
              )}
            >
              <div className="flex items-start gap-2.5">
                {lastOutcome.status === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <Info className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa] flex-shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <p className="font-medium leading-relaxed">{lastOutcome.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setLastOutcome(null)}
                className="text-[11px] font-semibold text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9] cursor-pointer flex-shrink-0"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_TYPES.map((rt) => {
            const isCardPending = pendingRequest?.id === rt.id;

            return (
              <div
                key={rt.id}
                className={cn(
                  'p-5 rounded-[16px] bg-white dark:bg-[#111113] border transition-all duration-150 flex flex-col justify-between min-h-[196px]',
                  isCardPending
                    ? 'border-[#1e3fc8] dark:border-[#60a5fa] ring-1 ring-[#1e3fc8]/20'
                    : 'border-[#e4e4e7] dark:border-[#27272a] hover:border-[#0a0a0a]/40 dark:hover:border-[#fafaf9]/30'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 border',
                          rt.accentClass
                        )}
                      >
                        <rt.icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] truncate">
                          {rt.title}
                        </h3>
                        <p className="text-[11px] font-semibold text-[#52525b] dark:text-[#a1a1aa]">
                          Analytics Template
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#fafaf9] dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a] flex-shrink-0">
                      {rt.tag}
                    </span>
                  </div>

                  <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium leading-relaxed">
                    {rt.desc}
                  </p>
                </div>

                {/* Format Export Buttons */}
                <div className="pt-3.5 mt-4 border-t border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]">
                    Compile as:
                  </span>
                  <div className="flex items-center flex-wrap gap-2">
                    {EXPORT_FORMATS.map((fmt) => {
                      const isThisLoading =
                        pendingRequest?.id === rt.id && pendingRequest?.format === fmt.key;
                      const isDisabled = isEmptyOrg || pendingRequest !== null;
                      const FmtIcon = fmt.icon;

                      return (
                        <button
                          key={fmt.key}
                          type="button"
                          onClick={() => handleGenerate(rt.id, fmt.key)}
                          disabled={isDisabled}
                          aria-busy={isThisLoading}
                          aria-label={`Generate ${rt.title} as ${fmt.label}`}
                          title={
                            isEmptyOrg
                              ? 'Upload a dataset to compile reports'
                              : isThisLoading
                              ? `Compiling ${rt.title} (${fmt.label})...`
                              : `Compile ${rt.title} (${fmt.description})`
                          }
                          className={cn(
                            'min-h-[44px] sm:min-h-[34px] px-3 rounded-[10px] border text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
                            isThisLoading
                              ? 'bg-[#eff6ff] dark:bg-[#1e3fc8]/20 border-[#1e3fc8] text-[#1e3fc8] dark:text-[#60a5fa]'
                              : 'bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] border-[#e4e4e7] dark:border-[#27272a]',
                            !isDisabled && fmt.hoverClass,
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                        >
                          {isThisLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                              <span>Compiling...</span>
                            </>
                          ) : (
                            <>
                              <FmtIcon className={cn('w-3.5 h-3.5', fmt.iconColor)} aria-hidden="true" />
                              <span>{fmt.label}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 5. Recent Reports & Generation Log ───────────────────────── */}
      <section
        aria-label="Recent Reports and Generation Log"
        className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9]/70 dark:bg-[#18181b]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                Recent Reports &amp; Generation Log
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-[#111113] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a]">
                Retention: 50 records
              </span>
            </div>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium">
              Logged compilation metadata. Physical file downloads remain disabled while archival storage is deferred.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] text-xs font-semibold font-mono tabular-nums self-start sm:self-center">
            {recentReports.length} {recentReports.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {isLoadingReports ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1e3fc8] mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa]">
              Loading report history...
            </p>
          </div>
        ) : recentReports.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-11 h-11 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa] flex items-center justify-center mb-3 border border-[#e4e4e7] dark:border-[#27272a]">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1">
              No Reports Logged Yet
            </h3>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] max-w-sm">
              Select any template and format above to compile your first report record.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b]/60">
                    {['Report Name', 'Type', 'Format', 'Size', 'Generated', 'Status', 'Archive File'].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-3 text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                  {recentReports.map((r) => {
                    const isStorageDeferred = !r.size || r.size === 'N/A' || r.status === 'completed';
                    const isGenerating = r.status === 'generating';
                    const isFailed = r.status === 'failed';

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-[#fafaf9] dark:hover:bg-[#18181b]/40 transition-colors duration-150"
                      >
                        <td className="px-4 py-3.5 text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#52525b] dark:text-[#a1a1aa] flex-shrink-0" aria-hidden="true" />
                            <span className="truncate max-w-[260px]" title={r.name}>
                              {r.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] uppercase">
                            {r.type}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase border',
                              r.format.toLowerCase() === 'csv' && 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40',
                              r.format.toLowerCase() === 'excel' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
                              r.format.toLowerCase() === 'pdf' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                            )}
                          >
                            {r.format}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-[#52525b] dark:text-[#a1a1aa] font-mono tabular-nums">
                          {r.size && r.size !== 'N/A' ? (
                            r.size
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 cursor-help"
                              title="No binary file size recorded because physical file storage is deferred"
                            >
                              <span>N/A</span>
                              <Info className="w-3 h-3" aria-hidden="true" />
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-xs text-[#52525b] dark:text-[#a1a1aa] tabular-nums whitespace-nowrap">
                          {r.date || '—'}
                        </td>

                        <td className="px-4 py-3.5">
                          {isGenerating ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
                              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                              Generating
                            </span>
                          ) : isFailed ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50">
                              <AlertCircle className="w-3 h-3" aria-hidden="true" />
                              Failed
                            </span>
                          ) : isStorageDeferred ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#fafaf9] text-[#52525b] border border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a] cursor-help"
                              title="Metadata logged in database; persistent file storage is deferred"
                            >
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              Storage Deferred
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
                              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                              Ready
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            disabled={true}
                            aria-label={`Download ${r.name} unavailable: file archival storage is deferred`}
                            title="File download unavailable — persistent object storage is deferred"
                            className="inline-flex items-center gap-1.5 text-[11px] h-8 px-2.5 rounded-[8px] border font-medium border-[#e4e4e7] bg-[#fafaf9] text-[#52525b] dark:bg-[#18181b] dark:border-[#27272a] dark:text-[#a1a1aa] opacity-65 cursor-not-allowed"
                          >
                            <Download className="w-3 h-3" aria-hidden="true" />
                            <span>Unavailable</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (<768px) */}
            <div className="md:hidden divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
              {recentReports.map((r) => {
                const isGenerating = r.status === 'generating';
                const isFailed = r.status === 'failed';

                return (
                  <div key={r.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] break-words">
                          {r.name}
                        </p>
                        <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5 tabular-nums">
                          {r.date || '—'} · Size: {r.size && r.size !== 'N/A' ? r.size : 'N/A'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] flex-shrink-0">
                        {r.format}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                        {isGenerating ? 'Generating' : isFailed ? 'Failed' : 'Storage Deferred'}
                      </span>
                      <button
                        type="button"
                        disabled={true}
                        aria-label={`Download ${r.name} unavailable: file archival storage is deferred`}
                        className="inline-flex items-center gap-1.5 text-[11px] min-h-[36px] px-3 rounded-[8px] border font-medium border-[#e4e4e7] bg-[#fafaf9] text-[#52525b] dark:bg-[#18181b] dark:border-[#27272a] dark:text-[#a1a1aa] opacity-65 cursor-not-allowed"
                      >
                        <Download className="w-3 h-3" aria-hidden="true" />
                        <span>Download Deferred</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
