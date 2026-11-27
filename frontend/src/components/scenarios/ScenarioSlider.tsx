/** ScenarioSlider — labelled range slider with accessible focus ring and Titan styling. */

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

  const isChanged = Math.abs(value - config.defaultValue) > 0.001;
  const isHigher = value > config.defaultValue;
  const isRiskMetric = unit === 'days' || unit === '×';

  const badgeStyle = !isChanged
    ? 'bg-[#fafaf9] text-[#0a0a0a] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#fafaf9] dark:border-[#27272a]'
    : isHigher
      ? isRiskMetric
        ? 'bg-[#fffbeb] text-[#92400e] border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
        : 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60'
      : isRiskMetric
        ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60'
        : 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5] dark:border-[#991b1b]/60';

  const trackBg = !isChanged
    ? 'bg-[#1e3fc8] dark:bg-[#60a5fa]'
    : isHigher
      ? isRiskMetric
        ? 'bg-[#d97706] dark:bg-[#f59e0b]'
        : 'bg-[#16a34a] dark:bg-[#4ade80]'
      : isRiskMetric
        ? 'bg-[#16a34a] dark:bg-[#4ade80]'
        : 'bg-[#dc2626] dark:bg-[#f87171]';

  return (
    <div className={cn('group select-none py-1', disabled && 'opacity-50 pointer-events-none')}>
      <div className="flex items-start justify-between mb-2 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="p-1.5 rounded-[8px] bg-[#f1f1f3] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa] flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <label htmlFor={id} className="text-xs sm:text-[13px] font-bold text-[#0a0a0a] dark:text-[#fafaf9] cursor-pointer truncate block">
              {label}
            </label>
            <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] truncate mt-0.5 leading-tight">{description}</p>
          </div>
        </div>
        <div
          className={cn(
            'px-2.5 py-0.5 rounded-[8px] text-xs font-bold font-mono tabular-nums border flex-shrink-0',
            badgeStyle
          )}
        >
          {formatted}
        </div>
      </div>

      {/* Track + thumb */}
      <div className="relative h-7 flex items-center">
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-[#e4e4e7] dark:bg-[#27272a] rounded-full" />

        {/* Filled track */}
        <div
          className={cn('absolute top-1/2 -translate-y-1/2 h-2 rounded-full', trackBg)}
          style={{ width: `${pct}%` }}
        />

        {/* Native range input (keyboard & pointer accessible) */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="peer absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
          aria-label={label}
        />

        {/* Visual thumb with keyboard focus-visible ring */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-[#fafaf9] border-2 border-[#0a0a0a] dark:border-[#1e3fc8] shadow-sm',
            'transition-transform duration-150 pointer-events-none',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[#1e3fc8] peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-[#111113]',
            'group-hover:scale-110'
          )}
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between mt-0.5 px-0.5">
        <span className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-mono font-medium">
          {unit === '%' ? `${min}%` : unit === 'days' ? `${min}d` : unit === '×' ? `${min}×` : min}
        </span>
        <span className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-mono font-medium">
          {unit === '%' ? `${max}%` : unit === 'days' ? `${max}d` : unit === '×' ? `${max}×` : max}
        </span>
      </div>
    </div>
  );
}
