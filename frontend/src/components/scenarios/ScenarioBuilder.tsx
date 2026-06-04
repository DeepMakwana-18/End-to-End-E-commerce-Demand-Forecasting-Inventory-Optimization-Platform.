/** ScenarioBuilder — right-hand panel: controls + run button. */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, Save, ChevronDown, ChevronUp,
  Megaphone, DollarSign, Truck, ShieldCheck, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScenarioSlider } from './ScenarioSlider';
import type { ScenarioParameters, ScenarioType } from '@/types/scenario';

const SCENARIO_TYPE_OPTIONS: { value: ScenarioType; label: string; desc: string }[] = [
  { value: 'demand_shock', label: 'Demand Shock', desc: 'Sudden demand spike or drop' },
  { value: 'price_change', label: 'Price Change', desc: 'Price elasticity simulation' },
  { value: 'supply_disruption', label: 'Supply Disruption', desc: 'Lead time or supply constraint' },
  { value: 'seasonal_shift', label: 'Seasonal Shift', desc: 'Shift seasonality curve' },
  { value: 'custom', label: 'Custom', desc: 'Free-form parameter set' },
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
    <div className="glass-card flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-surface-800/60">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-sm font-bold text-surface-50">Scenario Builder</h2>
          {isDirty && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/20 font-medium">
              MODIFIED
            </span>
          )}
        </div>

        {/* Name */}
        <input
          id="scenario-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(
            'w-full bg-surface-900/60 border border-surface-700/60 rounded-xl px-3 py-2',
            'text-sm text-surface-100 placeholder-surface-500 font-medium',
            'focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20',
            'transition-all duration-200'
          )}
          placeholder="Scenario name..."
          maxLength={80}
        />
      </div>

      {/* Scenario Type */}
      <div className="px-4 py-3 border-b border-surface-800/60">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 mb-2">
          Scenario Type
        </p>
        <div className="grid grid-cols-1 gap-1">
          {SCENARIO_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              id={`scenario-type-${opt.value}`}
              onClick={() => setScenarioType(opt.value)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150',
                scenarioType === opt.value
                  ? 'bg-primary-500/15 border border-primary-500/30 text-primary-300'
                  : 'hover:bg-surface-800/50 border border-transparent text-surface-400 hover:text-surface-200'
              )}
            >
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  scenarioType === opt.value ? 'bg-primary-400' : 'bg-surface-600'
                )}
              />
              <div>
                <span className="text-xs font-semibold">{opt.label}</span>
                <span className="text-[10px] text-surface-500 ml-1.5">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="px-4 py-4 flex flex-col gap-5 flex-1 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500">
          Scenario Variables
        </p>
        {SLIDER_CONFIGS.map((cfg) => (
          <ScenarioSlider
            key={cfg.id}
            config={cfg as any}
            value={params[cfg.id as keyof ScenarioParameters] as number}
            onChange={(v) => handleSlider(cfg.id as keyof ScenarioParameters, v)}
            disabled={isRunning || disabled}
          />
        ))}

        {/* Advanced */}
        <div>
          <button
            id="advanced-toggle"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
          >
            {advancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Advanced Options
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
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-medium text-surface-400 mb-1 block">
                      Forecast Horizon (weeks)
                    </label>
                    <ScenarioSlider
                      config={{
                        id: 'horizon_weeks',
                        label: 'Horizon',
                        description: 'How many weeks to forecast',
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
                    <label htmlFor="avg-unit-value" className="text-xs font-medium text-surface-400 mb-1 block">
                      Avg Unit Value ($)
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
                        'w-full bg-surface-900/60 border border-surface-700/60 rounded-lg px-3 py-2',
                        'text-sm text-surface-100 focus:outline-none focus:border-primary-500/60',
                        'focus:ring-1 focus:ring-primary-500/20 transition-all duration-200'
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-surface-800/60 flex gap-2">
        <button
          id="reset-scenario"
          onClick={handleReset}
          disabled={!isDirty || isRunning}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
            'border border-surface-700/60 text-surface-400',
            isDirty && !isRunning
              ? 'hover:border-surface-600 hover:text-surface-200 hover:bg-surface-800/50'
              : 'opacity-40 cursor-not-allowed'
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          id="run-scenario"
          onClick={handleRun}
          disabled={isRunning || disabled || !name.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
            'text-sm font-bold transition-all duration-200',
            isRunning || disabled
              ? 'bg-surface-800 text-surface-500 cursor-not-allowed'
              : 'gradient-primary text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.01]'
          )}
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running Simulation…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Simulation
            </>
          )}
        </button>
      </div>
    </div>
  );
}
