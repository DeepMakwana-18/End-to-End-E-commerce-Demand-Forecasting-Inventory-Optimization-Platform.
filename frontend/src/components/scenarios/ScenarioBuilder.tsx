/** ScenarioBuilder — left-column assumption builder with dirty & unsimulated state tracking. */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Play, RotateCcw, ChevronDown, ChevronUp,
  Megaphone, DollarSign, Truck, ShieldCheck, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScenarioSlider, type SliderConfig } from './ScenarioSlider';
import type { ScenarioParameters, ScenarioType } from '@/types/scenario';

const SCENARIO_TYPE_OPTIONS: { value: ScenarioType; label: string; desc: string }[] = [
  { value: 'demand_shock', label: 'Demand Shock', desc: 'Sudden demand spike or drop' },
  { value: 'price_change', label: 'Price Change', desc: 'Price elasticity simulation' },
  { value: 'supply_disruption', label: 'Supply Disruption', desc: 'Lead time or supply constraint' },
  { value: 'seasonal_shift', label: 'Seasonal Shift', desc: 'Shift seasonality curve' },
  { value: 'custom', label: 'Custom Parameter Set', desc: 'Free-form multi-variable configuration' },
];

const SLIDER_CONFIGS = [
  {
    id: 'marketing_spend_pct',
    label: 'Marketing Spend',
    description: 'Change in marketing budget vs baseline',
    min: -100,
    max: 200,
    step: 5,
    defaultValue: 0,
    unit: '%' as const,
    icon: <Megaphone className="w-4 h-4" />,
  },
  {
    id: 'price_change_pct',
    label: 'Price Change',
    description: 'Product price adjustment vs current pricing',
    min: -50,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: '%' as const,
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    id: 'lead_time_days',
    label: 'Lead Time',
    description: 'Supplier lead time in calendar days',
    min: 1,
    max: 90,
    step: 1,
    defaultValue: 14,
    unit: 'days' as const,
    icon: <Truck className="w-4 h-4" />,
  },
  {
    id: 'safety_stock_multiplier',
    label: 'Safety Stock Buffer',
    description: 'Multiplier on current safety stock level',
    min: 0.1,
    max: 3.0,
    step: 0.05,
    defaultValue: 1.0,
    unit: '×' as const,
    icon: <ShieldCheck className="w-4 h-4" />,
  },
] as const;

const DEFAULT_SCENARIO_PARAMS: ScenarioParameters = {
  marketing_spend_pct: 0,
  price_change_pct: 0,
  lead_time_days: 14,
  safety_stock_multiplier: 1.0,
  avg_unit_value: 50,
};

export interface BuilderSnapshot {
  params: ScenarioParameters;
  horizonWeeks: number;
}

interface Props {
  onRun: (name: string, type: ScenarioType, params: ScenarioParameters, weeks: number) => Promise<void>;
  isRunning: boolean;
  disabled?: boolean;
  lastSimulatedSnapshot?: BuilderSnapshot | null;
  onUnsimulatedChange?: (hasChanges: boolean) => void;
}

export function ScenarioBuilder({ onRun, isRunning, disabled, lastSimulatedSnapshot, onUnsimulatedChange }: Props) {
  const [name, setName] = useState('New What-If Scenario');
  const [scenarioType, setScenarioType] = useState<ScenarioType>('custom');
  const [params, setParams] = useState<ScenarioParameters>({ ...DEFAULT_SCENARIO_PARAMS });
  const [horizonWeeks, setHorizonWeeks] = useState(12);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [avgUnitValue, setAvgUnitValue] = useState(50);
  const prefersReducedMotion = useReducedMotion();

  const handleSlider = (key: keyof ScenarioParameters, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setParams({ ...DEFAULT_SCENARIO_PARAMS });
    setAvgUnitValue(50);
    setHorizonWeeks(12);
  };

  const handleRun = async () => {
    if (isRunning) return;
    await onRun(name, scenarioType, { ...params, avg_unit_value: avgUnitValue }, horizonWeeks);
  };

  // Dirty check: any param differs from default
  const isDirty =
    params.marketing_spend_pct !== 0 ||
    params.price_change_pct !== 0 ||
    params.lead_time_days !== 14 ||
    params.safety_stock_multiplier !== 1.0 ||
    avgUnitValue !== 50 ||
    horizonWeeks !== 12;

  // Check if current builder inputs differ from the last displayed simulation
  const hasUnsimulatedChanges = Boolean(
    lastSimulatedSnapshot && (
      Math.abs((lastSimulatedSnapshot.params.marketing_spend_pct ?? 0) - params.marketing_spend_pct) > 0.001 ||
      Math.abs((lastSimulatedSnapshot.params.price_change_pct ?? 0) - params.price_change_pct) > 0.001 ||
      Math.abs((lastSimulatedSnapshot.params.lead_time_days ?? 14) - params.lead_time_days) > 0.001 ||
      Math.abs((lastSimulatedSnapshot.params.safety_stock_multiplier ?? 1.0) - params.safety_stock_multiplier) > 0.001 ||
      Math.abs((lastSimulatedSnapshot.params.avg_unit_value ?? 50) - avgUnitValue) > 0.001 ||
      lastSimulatedSnapshot.horizonWeeks !== horizonWeeks
    )
  );

  useEffect(() => {
    onUnsimulatedChange?.(hasUnsimulatedChanges);
  }, [hasUnsimulatedChanges, onUnsimulatedChange]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[16px] overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#e4e4e7] dark:border-[#27272a]">
        <div className="flex items-center justify-between gap-2.5 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[10px] bg-[#0a0a0a] dark:bg-[#fafaf9] text-[#fafaf9] dark:text-[#0a0a0a] flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">Scenario Builder</h2>
              <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] truncate">
                Editable assumptions for next simulation
              </p>
            </div>
          </div>

          {hasUnsimulatedChanges ? (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#fffbeb] text-[#92400e] border border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 font-bold uppercase tracking-wider flex-shrink-0">
              Changes not simulated
            </span>
          ) : isDirty ? (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40 font-bold uppercase tracking-wider flex-shrink-0">
              Modified
            </span>
          ) : null}
        </div>

        {/* Name input */}
        <div className="space-y-1.5">
          <label htmlFor="scenario-name" className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] block">
            Scenario Name
          </label>
          <input
            id="scenario-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              'w-full bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-[10px] px-3.5 py-2',
              'text-sm text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#52525b] dark:placeholder:text-[#a1a1aa] font-semibold',
              'focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20 transition-colors duration-150'
            )}
            placeholder="e.g. Q3 Demand Shock Simulation..."
            maxLength={80}
          />
        </div>
      </div>

      {/* Scenario Archetype Selection */}
      <div className="p-4 sm:p-5 border-b border-[#e4e4e7] dark:border-[#27272a]">
        <div className="mb-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Scenario Archetype
          </p>
          <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">
            Select a predefined archetype or custom parameter set
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SCENARIO_TYPE_OPTIONS.map((opt) => {
            const isSelected = scenarioType === opt.value;
            const isCustom = opt.value === 'custom';
            return (
              <button
                key={opt.value}
                type="button"
                id={`scenario-type-${opt.value}`}
                aria-pressed={isSelected}
                onClick={() => setScenarioType(opt.value)}
                className={cn(
                  'flex items-center justify-between gap-2.5 p-3 rounded-[10px] text-left transition-colors duration-150 border cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-1',
                  isCustom ? 'sm:col-span-2' : '',
                  isSelected
                    ? 'bg-ds-sidebar-active text-ds-sidebar-active-text border-ds-blue/40 ring-1 ring-ds-blue/30'
                    : 'bg-ds-surface-sunken border-ds-hairline hover:border-ds-border-strong'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0',
                      isSelected
                        ? 'border-ds-blue bg-ds-blue'
                        : 'border-ds-border-control bg-ds-surface'
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      'text-xs font-semibold truncate',
                      isSelected ? 'text-ds-sidebar-active-text' : 'text-ds-text-primary'
                    )}>
                      {opt.label}
                    </p>
                    <p className={cn(
                      'text-[11px] truncate',
                      isSelected ? 'text-ds-sidebar-active-text/80' : 'text-ds-text-secondary'
                    )}>
                      {opt.desc}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders Area */}
      <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52525b] dark:text-[#a1a1aa]">
            Scenario Variables
          </p>
          <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-0.5">
            Adjust levers to simulate operational or market shifts
          </p>
        </div>

        <div className="space-y-4 pt-1">
          {SLIDER_CONFIGS.map((cfg) => (
            <ScenarioSlider
              key={cfg.id}
              config={cfg as unknown as SliderConfig}
              value={params[cfg.id as keyof ScenarioParameters] as number}
              onChange={(v) => handleSlider(cfg.id as keyof ScenarioParameters, v)}
              disabled={isRunning || disabled}
            />
          ))}
        </div>

        {/* Advanced Options Drawer */}
        <div className="pt-3 border-t border-[#e4e4e7] dark:border-[#27272a]">
          <button
            id="advanced-toggle"
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] hover:text-[#1e3fc8] dark:hover:text-[#60a5fa] transition-colors py-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] rounded-md"
          >
            {advancedOpen
              ? <ChevronUp className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" />
              : <ChevronDown className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa]" />}
            <span>Advanced Configuration</span>
          </button>
          <AnimatePresence>
            {advancedOpen && (
              <motion.div
                initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-col gap-3.5 p-3.5 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a]">
                  <div>
                    <ScenarioSlider
                      config={{
                        id: 'horizon_weeks',
                        label: 'Forecast Horizon (weeks)',
                        description: 'Simulation forecast range',
                        min: 4,
                        max: 52,
                        step: 4,
                        defaultValue: 12,
                        unit: 'days',
                        icon: null,
                        formatValue: (v) => `${v}w`,
                      }}
                      value={horizonWeeks}
                      onChange={setHorizonWeeks}
                      disabled={isRunning || disabled}
                    />
                  </div>
                  <div>
                    <label htmlFor="avg-unit-value" className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1 block">
                      Average Unit Revenue ($)
                    </label>
                    <input
                      id="avg-unit-value"
                      type="number"
                      min={0}
                      max={10000}
                      step={1}
                      value={avgUnitValue}
                      onChange={(e) => setAvgUnitValue(parseFloat(e.target.value) || 0)}
                      className={cn(
                        'w-full bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] rounded-[10px] px-3 py-2',
                        'text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] focus:outline-none focus:border-[#1e3fc8]',
                        'focus:ring-2 focus:ring-[#1e3fc8]/20 transition-colors duration-150'
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 sm:p-5 border-t border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] flex items-center gap-3">
        <button
          id="reset-scenario"
          type="button"
          onClick={handleReset}
          disabled={!isDirty || isRunning}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-xs font-bold transition-colors duration-150 border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]',
            isDirty && !isRunning
              ? 'border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] hover:bg-[#f1f1f3] dark:hover:bg-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9]'
              : 'border-[#e4e4e7] dark:border-[#27272a] bg-[#f1f1f3] dark:bg-[#111113] text-[#52525b] dark:text-[#a1a1aa] opacity-50 cursor-not-allowed'
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
        <button
          id="run-scenario"
          type="button"
          onClick={handleRun}
          disabled={isRunning || disabled || !name.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px]',
            'text-sm font-semibold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1e3fc8]',
            isRunning || disabled || !name.trim()
              ? 'bg-[#e4e4e7] dark:bg-[#27272a] text-[#52525b] dark:text-[#a1a1aa] cursor-not-allowed'
              : 'bg-[#1e3fc8] hover:bg-[#1935a8] text-white'
          )}
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running Simulation…</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Simulation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
