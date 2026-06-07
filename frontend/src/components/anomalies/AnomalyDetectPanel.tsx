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
    <div className="glass-card overflow-hidden border border-surface-700/30">
      {/* Header (always visible) */}
      <button
        id="detect-panel-toggle"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-800/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <ScanSearch className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-surface-100">Detection Control Center</span>
          {lastResult && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 border border-accent-500/20 text-accent-400 font-semibold">
              Last: {lastResult.detected} found
            </span>
          )}
          {sweep && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/20 text-primary-400 font-semibold flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" />
              Sweep Active
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
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
            <div className="px-4 pb-4 border-t border-surface-800/50 pt-4 space-y-4">

              {/* Lookback Selector */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 block mb-2">
                  Lookback Window
                </label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                  {LOOKBACK_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      id={`lookback-${opt.value}`}
                      onClick={() => setLookback(opt.value)}
                      disabled={sweep}
                      className={cn(
                        'flex flex-col items-center py-2 px-1 rounded-xl border text-center transition-all duration-200',
                        lookback === opt.value && !sweep
                          ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
                          : 'bg-surface-900/60 border-surface-700/40 text-surface-500 hover:border-surface-600/60 hover:text-surface-300',
                        sweep && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <span className="text-xs font-bold font-mono">{opt.value}w</span>
                      <span className="text-[8px] mt-0.5 leading-tight">{opt.sublabel}</span>
                    </button>
                  ))}
                </div>
                {!sweep && (
                  <p className="text-[10px] text-surface-600 mt-1.5">
                    Scanning last <span className="text-primary-400 font-semibold">{selectedOption.label} ({selectedOption.sublabel})</span> of data as the anomaly baseline.
                  </p>
                )}
              </div>

              {/* Threshold Inputs */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 block mb-2">
                  Sigma (σ) Detection Thresholds
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'thresh-low', label: 'Low', value: threshLow, set: setThreshLow, color: 'text-primary-400', icon: Info },
                    { id: 'thresh-med', label: 'Medium', value: threshMed, set: setThreshMed, color: 'text-warning-400', icon: AlertTriangle },
                    { id: 'thresh-crit', label: 'Critical', value: threshCrit, set: setThreshCrit, color: 'text-danger-400', icon: Flame },
                  ].map(({ id, label, value, set, color, icon: Icon }) => (
                    <div key={id}>
                      <label htmlFor={id} className={cn('text-[10px] font-medium block mb-1 flex items-center gap-1', color)}>
                        <Icon className="w-2.5 h-2.5" />
                        {label}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id={id}
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={value}
                          onChange={(e) => set(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-surface-900/60 border border-surface-700/60 rounded-lg text-sm text-surface-100 font-mono focus:outline-none focus:border-primary-500/60 transition-all"
                        />
                        <span className="text-[10px] text-surface-600 font-mono flex-shrink-0">σ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comprehensive Sweep Mode */}
              <div className={cn(
                'rounded-xl border p-3 transition-all duration-200',
                sweep ? 'bg-primary-500/8 border-primary-500/30' : 'bg-surface-900/40 border-surface-700/40'
              )}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="sweep-toggle"
                    checked={sweep}
                    onChange={(e) => setSweep(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-surface-700 bg-surface-900/60 text-primary-500 focus:ring-primary-500/50 flex-shrink-0"
                  />
                  <div>
                    <label htmlFor="sweep-toggle" className="text-sm font-semibold text-surface-200 select-none cursor-pointer flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary-400" />
                      Comprehensive Sweep Mode
                    </label>
                    <p className="text-[10px] text-surface-500 mt-1 leading-relaxed">
                      Executes detection across <span className="text-primary-400 font-semibold">all 8 lookback windows</span> (4w → 520w), 
                      aggregates all findings, deduplicates by highest z-score, and retains maximum severity results.
                      Guarantees no anomaly is missed regardless of baseline.
                    </p>
                    {sweep && (
                      <div className="flex items-center gap-3 mt-2">
                        {[4, 8, 12, 26, 52, 104, 260, 520].map((w) => (
                          <span key={w} className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-400 font-mono border border-primary-500/20">
                            {w}w
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Run Button */}
              <div className="flex items-center gap-3">
                <button
                  id="run-detection-btn"
                  onClick={handleRun}
                  disabled={isRunning}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                    isRunning
                      ? 'bg-surface-800 text-surface-500 cursor-not-allowed'
                      : 'gradient-primary text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/35 hover:scale-[1.01]'
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
                  className="space-y-3 pt-2 border-t border-surface-800/40"
                >
                  {/* Scan Stats Row */}
                  <div className="flex items-center gap-3 text-[10px] text-surface-500">
                    <Clock className="w-3 h-3" />
                    <span>Completed in <span className="text-surface-300 font-semibold font-mono">{lastResult.computation_seconds.toFixed(2)}s</span></span>
                    <span className="mx-1">·</span>
                    <Shield className="w-3 h-3" />
                    <span>Confidence: <span className="text-primary-400 font-semibold">{confidence}%</span></span>
                    <span className="mx-1">·</span>
                    <span><span className="text-accent-400 font-semibold font-mono">{lastResult.detected}</span> anomalies in window</span>
                  </div>

                  {/* Result Cards */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Critical', value: lastResult.critical, icon: Flame, color: 'text-danger-400', bg: 'bg-danger-500/10', border: 'border-danger-500/20' },
                      { label: 'Medium', value: lastResult.medium, icon: AlertTriangle, color: 'text-warning-400', bg: 'bg-warning-500/10', border: 'border-warning-500/20' },
                      { label: 'Low', value: lastResult.low, icon: Info, color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
                      { label: 'Total', value: lastResult.detected, icon: CheckCircle2, color: 'text-accent-400', bg: 'bg-accent-500/10', border: 'border-accent-500/20' },
                    ].map(({ label, value, icon: Icon, color, bg, border }) => (
                      <div key={label} className={cn('border rounded-xl p-2.5 text-center', bg, border)}>
                        <Icon className={cn('w-3.5 h-3.5 mx-auto mb-1', color)} />
                        <p className={cn('text-lg font-black font-mono', color)}>{value}</p>
                        <p className="text-[10px] text-surface-600">{label}</p>
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
