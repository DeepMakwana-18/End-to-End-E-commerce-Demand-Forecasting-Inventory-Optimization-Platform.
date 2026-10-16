/** ScenarioSlider — labelled range slider with live value display and semantic styling. */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SliderConfig {
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
  const { id, label, description, min, max, step, unit, icon } = config;

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const formatted = config.formatValue ? config.formatValue(value) : formatDefault(value, unit);

  // Semantic color calculation
  const isChanged = Math.abs(value - config.defaultValue) > 0.001;
  const isHigher = value > config.defaultValue;
  const isRiskMetric = unit === 'days' || unit === '×';

  const badgeStyle = !isChanged
    ? 'bg-ds-surface-sunken text-ds-text-primary border-ds-border'
    : isHigher
    ? isRiskMetric
      ? 'bg-ds-amber-surface text-ds-amber-text border-ds-amber/25'
      : 'bg-ds-green-surface text-ds-green-text border-ds-green/20'
    : isRiskMetric
    ? 'bg-ds-green-surface text-ds-green-text border-ds-green/20'
    : 'bg-ds-red-surface text-ds-red-text border-ds-red/20';

  const trackBg = !isChanged
    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
    : isHigher
    ? isRiskMetric
      ? 'bg-gradient-to-r from-amber-500 to-amber-600'
      : 'bg-gradient-to-r from-emerald-500 to-teal-600'
    : isRiskMetric
    ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
    : 'bg-gradient-to-r from-red-500 to-rose-600';

  return (
    <div className={cn('group select-none', disabled && 'opacity-50 pointer-events-none')}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="text-ds-text-muted group-hover:text-ds-blue transition-colors flex-shrink-0">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <label htmlFor={id} className="text-xs font-bold text-ds-text-primary cursor-pointer truncate block">
              {label}
            </label>
            <p className="text-[10px] text-ds-text-muted truncate mt-0.5">{description}</p>
          </div>
        </div>
        <motion.div
          key={formatted}
          initial={{ scale: 1.05, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'px-2 py-0.5 rounded-md text-xs font-bold font-sans tabular-nums border shadow-2xs flex-shrink-0',
            badgeStyle
          )}
        >
          {formatted}
        </motion.div>
      </div>

      {/* Track + thumb */}
      <div className="relative h-6 flex items-center">
        {/* Background track */}
        <div className="absolute inset-y-0 top-1/2 -translate-y-1/2 w-full h-2 bg-ds-surface-sunken rounded-full border border-ds-hairline shadow-inner" />

        {/* Filled track */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 h-2 rounded-full transition-all duration-100 shadow-xs',
            trackBg
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
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
        />

        {/* Visual thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-md border-2 border-blue-600',
            'transition-transform duration-100 group-hover:scale-110',
            'pointer-events-none'
          )}
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[10px] text-ds-text-muted font-mono font-medium">
          {unit === '%' ? `${min}%` : unit === 'days' ? `${min}d` : unit === '×' ? `${min}×` : min}
        </span>
        <span className="text-[10px] text-ds-text-muted font-mono font-medium">
          {unit === '%' ? `${max}%` : unit === 'days' ? `${max}d` : unit === '×' ? `${max}×` : max}
        </span>
      </div>
    </div>
  );
}
