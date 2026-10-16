/** ScenarioBuilder — central panel: controls + scenario types + sliders + run button. */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, ChevronDown, ChevronUp,
  Megaphone, DollarSign, Truck, ShieldCheck, Layers
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

const DEFAULT_PARAMS: ScenarioParameters = {
  marketing_spend_pct: 0,
  price_change_pct: 0,
  lead_time_days: 14,
  safety_stock_multiplier: 1.0,
  avg_unit_value: 50,
};

interface Props {
  onRun: (name: string, type: ScenarioType, params: ScenarioParameters, weeks: number) => Promise<void>;
  isRunning: boolean;
  disabled?: boolean;
}

export function ScenarioBuilder({ onRun, isRunning, disabled }: Props) {
  const [name, setName] = useState('New What-If Scenario');
  const [scenarioType, setScenarioType] = useState<ScenarioType>('custom');
  const [params, setParams] = useState<ScenarioParameters>({ ...DEFAULT_PARAMS });
  const [horizonWeeks, setHorizonWeeks] = useState(12);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [avgUnitValue, setAvgUnitValue] = useState(50);

  const handleSlider = (key: keyof ScenarioParameters, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setParams({ ...DEFAULT_PARAMS });
    setAvgUnitValue(50);
    setHorizonWeeks(12);
  };

  const handleRun = async () => {
    await onRun(name, scenarioType, { ...params, avg_unit_value: avgUnitValue }, horizonWeeks);
  };

  // Dirty check: any param differs from default
  const isDirty =
    params.marketing_spend_pct !== 0 ||
    params.price_change_pct !== 0 ||
    params.lead_time_days !== 14 ||
    params.safety_stock_multiplier !== 1.0;

  return (
    <div className="card-apple flex flex-col h-full bg-white dark:bg-surface-900 border border-ds-border-strong shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-ds-hairline bg-ds-surface-sunken/40">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-sm font-bold text-ds-text-heading">Scenario Builder</h2>
          {isDirty && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-ds-amber-surface text-ds-amber-text border border-ds-amber/25 font-bold">
              MODIFIED
            </span>
          )}
        </div>

        {/* Name input */}
        <div className="space-y-1">
          <label htmlFor="scenario-name" className="text-[10px] font-bold uppercase tracking-wider text-ds-text-muted block">
            Scenario Name
          </label>
          <input
            id="scenario-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              'w-full bg-white dark:bg-surface-800 border border-ds-border-strong rounded-xl px-3.5 py-2',
              'text-sm text-ds-text-primary placeholder:text-ds-text-muted font-semibold',
              'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
              'shadow-2xs transition-all duration-150'
            )}
            placeholder="Scenario name..."
            maxLength={80}
          />
        </div>
      </div>

      {/* Scenario Type Selection */}
      <div className="px-4 py-3.5 border-b border-ds-hairline bg-ds-surface-sunken/20">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ds-text-muted mb-2.5">
          Scenario Archetype
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {SCENARIO_TYPE_OPTIONS.map((opt) => {
            const isSelected = scenarioType === opt.value;
            return (
              <button
                key={opt.value}
                id={`scenario-type-${opt.value}`}
                onClick={() => setScenarioType(opt.value)}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 border',
                  isSelected
                    ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 border-blue-400 dark:border-blue-500/50 shadow-xs ring-1 ring-blue-500/20'
                    : 'bg-white dark:bg-surface-800/60 border-ds-hairline hover:bg-ds-surface-sunken hover:border-ds-border'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors',
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-ds-border-strong bg-white dark:bg-surface-700'
                    )}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-bold truncate', isSelected ? 'text-ds-blue-text' : 'text-ds-text-primary')}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-ds-text-muted truncate">{opt.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders Area */}
      <div className="px-4 py-4 flex flex-col gap-4 flex-1 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ds-text-muted">
          Scenario Variables
        </p>
        {SLIDER_CONFIGS.map((cfg) => (
          <ScenarioSlider
            key={cfg.id}
            config={cfg as unknown as SliderConfig}
            value={params[cfg.id as keyof ScenarioParameters] as number}
            onChange={(v) => handleSlider(cfg.id as keyof ScenarioParameters, v)}
            disabled={isRunning || disabled}
          />
        ))}

        {/* Advanced Options Drawer */}
        <div className="pt-2 border-t border-ds-hairline">
          <button
            id="advanced-toggle"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-ds-text-secondary hover:text-ds-blue transition-colors py-1"
          >
            {advancedOpen ? <ChevronUp className="w-3.5 h-3.5 text-ds-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-ds-blue" />}
            <span>Advanced Configuration</span>
          </button>
          <AnimatePresence>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-col gap-3 p-3 rounded-xl bg-ds-surface-sunken/60 border border-ds-hairline">
                  <div>
                    <label className="text-xs font-bold text-ds-text-primary mb-1 block">
                      Forecast Horizon (weeks)
                    </label>
                    <ScenarioSlider
                      config={{
                        id: 'horizon_weeks',
                        label: 'Horizon Duration',
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
                    <label htmlFor="avg-unit-value" className="text-xs font-bold text-ds-text-primary mb-1 block">
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
                        'w-full bg-white dark:bg-surface-800 border border-ds-border-strong rounded-xl px-3 py-2',
                        'text-xs font-bold text-ds-text-primary focus:outline-none focus:border-blue-500',
                        'focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all duration-150'
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
      <div className="p-4 border-t border-ds-hairline bg-ds-surface-sunken/30 flex gap-2.5">
        <button
          id="reset-scenario"
          onClick={handleReset}
          disabled={!isDirty || isRunning}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150',
            'border shadow-2xs',
            isDirty && !isRunning
              ? 'border-ds-border bg-white hover:bg-ds-surface-sunken text-ds-text-primary'
              : 'border-ds-hairline bg-ds-surface-sunken text-ds-text-muted opacity-40 cursor-not-allowed'
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
        <button
          id="run-scenario"
          onClick={handleRun}
          disabled={isRunning || disabled || !name.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
            'text-xs font-bold transition-all duration-150 shadow-sm',
            isRunning || disabled
              ? 'bg-ds-surface-sunken text-ds-text-muted border border-ds-hairline cursor-not-allowed'
              : 'btn-apple btn-apple-primary'
          )}
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running Simulation…</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Run Simulation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
