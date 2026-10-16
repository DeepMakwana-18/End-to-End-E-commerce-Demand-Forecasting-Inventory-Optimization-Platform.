/**
 * AnomalyDetectPanel — Section 2 (upgraded)
 * Detection Control Center with:
 *  - Lookback preset selector (4/8/12/26/52/104/260/520 weeks)
 *  - Comprehensive Sweep mode
 *  - Scan result display: duration, anomalies found, confidence score
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanSearch, ChevronDown, ChevronUp, CheckCircle2,
  Flame, AlertTriangle, Info, Clock, Shield, Layers,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalyDetectRequest, AnomalyDetectResponse } from '@/types/anomaly';

const LOOKBACK_OPTIONS = [
  { value: 4, label: '4 weeks', sublabel: '1 month' },
  { value: 8, label: '8 weeks', sublabel: '2 months' },
  { value: 12, label: '12 weeks', sublabel: '3 months' },
  { value: 26, label: '26 weeks', sublabel: '6 months' },
  { value: 52, label: '52 weeks', sublabel: '1 year' },
  { value: 104, label: '104 weeks', sublabel: '2 years' },
  { value: 260, label: '260 weeks', sublabel: '5 years' },
  { value: 520, label: '520 weeks', sublabel: '10 years' },
];

function getConfidenceScore(result: AnomalyDetectResponse): number {
  if (result.detected === 0) return 0;
  const critWeight = result.critical * 3 + result.medium * 2 + result.low;
  const maxPossible = result.detected * 3;
  return maxPossible > 0 ? Math.min(99, Math.round(60 + (critWeight / maxPossible) * 39)) : 60;
}

interface Props {
  onDetect: (req: AnomalyDetectRequest) => Promise<AnomalyDetectResponse | null>;
  isRunning: boolean;
}

export function AnomalyDetectPanel({ onDetect, isRunning }: Props) {
  const [open, setOpen] = useState(false);
  const [lookback, setLookback] = useState(12);
  const [threshLow, setThreshLow] = useState(2.0);
  const [threshMed, setThreshMed] = useState(3.0);
  const [threshCrit, setThreshCrit] = useState(4.0);
  const [sweep, setSweep] = useState(false);
  const [lastResult, setLastResult] = useState<AnomalyDetectResponse | null>(null);

  const handleRun = async () => {
    const result = await onDetect({
      lookback_weeks: lookback,
      z_threshold_low: threshLow,
      z_threshold_medium: threshMed,
      z_threshold_critical: threshCrit,
      comprehensive_sweep: sweep,
    });
    if (result) setLastResult(result);
  };

  const selectedOption = LOOKBACK_OPTIONS.find((o) => o.value === lookback) ?? LOOKBACK_OPTIONS[2];
  const confidence = lastResult ? getConfidenceScore(lastResult) : null;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs">
      {/* Header (always visible) */}
      <button
        id="detect-panel-toggle"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50/90 via-indigo-50/30 to-white dark:bg-none dark:bg-ds-surface-sunken/60 hover:from-slate-100/90 hover:to-indigo-50/50 transition-all border-b border-transparent data-[open=true]:border-slate-200/80 dark:data-[open=true]:border-ds-border"
        data-open={open}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xs">
            <ScanSearch className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-surface-100">Detection Control Center</span>
              {lastResult && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-accent-500/15 dark:border-accent-500/20 dark:text-accent-400 font-semibold shadow-2xs">
                  Last: {lastResult.detected} found
                </span>
              )}
              {sweep && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-primary-500/15 dark:border-primary-500/20 dark:text-primary-400 font-semibold flex items-center gap-1 shadow-2xs">
                  <Layers className="w-2.5 h-2.5" />
                  Sweep Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-surface-400 hidden sm:block">
              Configure rolling z-score baseline windows, sigma thresholds, and deep sweeps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hidden sm:inline">
            {open ? 'Hide Controls' : 'Configure Scanner'}
          </span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-surface-800 flex items-center justify-center text-slate-600 dark:text-surface-300">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 border-t border-slate-200/80 dark:border-surface-800/50 space-y-5 bg-white dark:bg-transparent">

              {/* Lookback Selector */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-surface-400 block mb-2">
                  Lookback Window Baseline
                </label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {LOOKBACK_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      id={`lookback-${opt.value}`}
                      onClick={() => setLookback(opt.value)}
                      disabled={sweep}
                      className={cn(
                        'flex flex-col items-center py-2.5 px-1.5 rounded-xl border text-center transition-all duration-200 shadow-2xs',
                        lookback === opt.value && !sweep
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold ring-1 ring-indigo-400/30 dark:bg-primary-500/15 dark:border-primary-500/40 dark:text-primary-300'
                          : 'bg-white dark:bg-surface-900/60 border-slate-200/90 dark:border-surface-700/40 text-slate-600 dark:text-surface-400 hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-900',
                        sweep && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <span className="text-xs font-bold font-mono">{opt.value}w</span>
                      <span className="text-[9px] mt-0.5 leading-tight opacity-80">{opt.sublabel}</span>
                    </button>
                  ))}
                </div>
                {!sweep && (
                  <p className="text-[11px] text-slate-500 dark:text-surface-400 mt-2">
                    Scanning last <span className="text-indigo-600 dark:text-primary-400 font-semibold">{selectedOption.label} ({selectedOption.sublabel})</span> of historical data as the anomaly baseline.
                  </p>
                )}
              </div>

              {/* Threshold Inputs */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-surface-400 block mb-2">
                  Sigma (σ) Detection Thresholds
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'thresh-low', label: 'Low Severity Threshold', value: threshLow, set: setThreshLow, color: 'text-blue-700 dark:text-primary-400', icon: Info },
                    { id: 'thresh-med', label: 'Medium Severity Threshold', value: threshMed, set: setThreshMed, color: 'text-amber-700 dark:text-warning-400', icon: AlertTriangle },
                    { id: 'thresh-crit', label: 'Critical Severity Threshold', value: threshCrit, set: setThreshCrit, color: 'text-rose-600 dark:text-danger-400', icon: Flame },
                  ].map(({ id, label, value, set, color, icon: Icon }) => (
                    <div key={id} className="p-3 rounded-xl border border-slate-200/80 dark:border-surface-700/40 bg-slate-50/40 dark:bg-surface-900/40">
                      <label htmlFor={id} className={cn('text-[11px] font-semibold block mb-1.5 flex items-center gap-1.5', color)}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id={id}
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={value}
                          onChange={(e) => set(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900/60 border border-slate-200/90 dark:border-surface-700/60 rounded-xl text-sm text-slate-900 dark:text-surface-100 font-mono shadow-2xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                        />
                        <span className="text-xs text-slate-500 font-mono font-semibold flex-shrink-0">σ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comprehensive Sweep Mode */}
              <div className={cn(
                'rounded-xl border p-4 transition-all duration-200',
                sweep
                  ? 'bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white dark:bg-none dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-500/30 shadow-2xs'
                  : 'bg-slate-50/60 dark:bg-ds-surface-sunken/40 border-slate-200/90 dark:border-ds-border'
              )}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="sweep-toggle"
                    checked={sweep}
                    onChange={(e) => setSweep(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-surface-700 text-indigo-600 focus:ring-indigo-500/50 flex-shrink-0 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="sweep-toggle" className="text-sm font-bold text-slate-900 dark:text-surface-200 select-none cursor-pointer flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600 dark:text-primary-400" />
                      Comprehensive Sweep Mode
                    </label>
                    <p className="text-xs text-slate-600 dark:text-surface-400 mt-1 leading-relaxed">
                      Executes detection across <span className="text-indigo-600 dark:text-primary-400 font-semibold">all 8 lookback windows</span> (4w → 520w), 
                      aggregates all findings, deduplicates by highest z-score, and retains maximum severity results.
                      Guarantees no anomaly is missed regardless of baseline.
                    </p>
                    {sweep && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {[4, 8, 12, 26, 52, 104, 260, 520].map((w) => (
                          <span key={w} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-primary-500/15 text-indigo-700 dark:text-primary-400 font-mono font-medium border border-indigo-200/80 dark:border-primary-500/20 shadow-2xs">
                            {w}w
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Run Button */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  id="run-detection-btn"
                  onClick={handleRun}
                  disabled={isRunning}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-2xs',
                    isRunning
                      ? 'bg-slate-200 text-slate-400 dark:bg-surface-800 dark:text-surface-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-xs hover:shadow-sm hover:scale-[1.005]'
                  )}
                >
                  {isRunning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {sweep ? 'Sweeping all baselines…' : 'Scanning…'}
                    </>
                  ) : (
                    <>
                      {sweep ? <Zap className="w-4 h-4" /> : <ScanSearch className="w-4 h-4" />}
                      {sweep ? 'Run Comprehensive Sweep' : 'Run Anomaly Scan'}
                    </>
                  )}
                </button>
              </div>

              {/* Last Result Summary */}
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-surface-800/40"
                >
                  {/* Scan Stats Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-surface-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Completed in <span className="text-slate-900 dark:text-surface-200 font-semibold font-mono">{lastResult.computation_seconds.toFixed(2)}s</span>
                    </span>
                    <span className="text-slate-300 dark:text-surface-700">·</span>
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                      Confidence: <span className="text-indigo-600 dark:text-primary-400 font-semibold">{confidence}%</span>
                    </span>
                    <span className="text-slate-300 dark:text-surface-700">·</span>
                    <span>
                      <span className="text-emerald-600 dark:text-accent-400 font-semibold font-mono">{lastResult.detected}</span> anomalies in window
                    </span>
                  </div>

                  {/* Result Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { label: 'Critical', value: lastResult.critical, icon: Flame, color: 'text-rose-600 dark:text-danger-400', bg: 'bg-rose-50 dark:bg-danger-500/10', border: 'border-rose-200 dark:border-danger-500/20' },
                      { label: 'Medium', value: lastResult.medium, icon: AlertTriangle, color: 'text-amber-700 dark:text-warning-400', bg: 'bg-amber-50 dark:bg-warning-500/10', border: 'border-amber-200 dark:border-warning-500/20' },
                      { label: 'Low', value: lastResult.low, icon: Info, color: 'text-blue-700 dark:text-primary-400', bg: 'bg-blue-50 dark:bg-primary-500/10', border: 'border-blue-200 dark:border-primary-500/20' },
                      { label: 'Total', value: lastResult.detected, icon: CheckCircle2, color: 'text-emerald-700 dark:text-accent-400', bg: 'bg-emerald-50 dark:bg-accent-500/10', border: 'border-emerald-200 dark:border-accent-500/20' },
                    ].map(({ label, value, icon: Icon, color, bg, border }) => (
                      <div key={label} className={cn('border rounded-xl p-3 text-center shadow-2xs', bg, border)}>
                        <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
                        <p className={cn('text-lg font-bold font-mono leading-none my-1', color)}>{value}</p>
                        <p className="text-[11px] text-slate-500 dark:text-surface-400 uppercase font-medium">{label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
