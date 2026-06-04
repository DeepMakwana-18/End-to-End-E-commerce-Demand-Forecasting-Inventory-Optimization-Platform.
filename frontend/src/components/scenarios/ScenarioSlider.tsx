/** ScenarioSlider — labelled range slider with live value display. */

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SliderConfig {
  id: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  formatValue?: (v: number) => string;
  color?: string;
  icon?: React.ReactNode;
}

interface Props {
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function formatDefault(v: number, unit: string) {
  if (unit === '%') return `${v > 0 ? '+' : ''}${v.toFixed(0)}%`;
  if (unit === 'days') return `${v.toFixed(0)}d`;
  if (unit === '×') return `${v.toFixed(2)}×`;
  return `${v}`;
}

export function ScenarioSlider({ config, value, onChange, disabled }: Props) {
  const { id, label, description, min, max, step, unit, color = 'primary', icon } = config;

  const pct = ((value - min) / (max - min)) * 100;
  const formatted = config.formatValue ? config.formatValue(value) : formatDefault(value, unit);

  // Semantic colour based on value direction
  const valueColor =
    value > config.defaultValue
      ? unit === 'days' || unit === '×'
        ? 'text-warning-400'
        : 'text-accent-400'
      : value < config.defaultValue
      ? unit === 'days' || unit === '×'
        ? 'text-accent-400'
        : 'text-danger-400'
      : 'text-surface-300';

  const trackColor =
    value > config.defaultValue
      ? unit === 'days' || unit === '×'
        ? 'from-warning-500 to-warning-400'
        : 'from-accent-600 to-accent-400'
      : value < config.defaultValue
      ? unit === 'days' || unit === '×'
        ? 'from-accent-600 to-accent-400'
        : 'from-danger-600 to-danger-400'
      : 'from-primary-600 to-primary-400';

  return (
    <div className={cn('group', disabled && 'opacity-50 pointer-events-none')}>
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-surface-400 group-hover:text-primary-400 transition-colors">
              {icon}
            </span>
          )}
          <div>
            <label htmlFor={id} className="text-sm font-semibold text-surface-100 cursor-pointer">
              {label}
            </label>
            <p className="text-xs text-surface-500 mt-0.5">{description}</p>
          </div>
        </div>
        <motion.div
          key={formatted}
          initial={{ scale: 1.15, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'text-sm font-bold font-mono tabular-nums min-w-[4rem] text-right',
            valueColor
          )}
        >
          {formatted}
        </motion.div>
      </div>

      {/* Track + thumb */}
      <div className="relative h-6 flex items-center">
        {/* Background track */}
        <div className="absolute inset-y-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-surface-800 rounded-full" />

        {/* Filled track */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r transition-all duration-150',
            trackColor
          )}
          style={{ width: `${pct}%` }}
        />

        {/* Native range input (invisible but interactive) */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: 10 }}
        />

        {/* Visual thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg',
            'transition-transform duration-150 group-hover:scale-110',
            'bg-gradient-to-br pointer-events-none',
            trackColor
          )}
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-surface-600">
          {unit === '%' ? `${min}%` : unit === 'days' ? `${min}d` : unit === '×' ? `${min}×` : min}
        </span>
        <span className="text-[10px] text-surface-600">
          {unit === '%' ? `${max}%` : unit === 'days' ? `${max}d` : unit === '×' ? `${max}×` : max}
        </span>
      </div>
    </div>
  );
}
