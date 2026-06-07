/** Shared anomaly UI primitives — badges, icons, labels. */

import { cn } from '@/lib/utils';
import type { AnomalyType, AnomalySeverity } from '@/types/anomaly';
import {
  TrendingUp, TrendingDown, Package, BarChart2,
  Flame, AlertTriangle, Info,
} from 'lucide-react';

// ── Severity config ───────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  { label: string; icon: any; color: string; bg: string; border: string; glow: string }
> = {
  critical: {
    label: 'Critical',
    icon: Flame,
    color: 'text-danger-400',
    bg: 'bg-danger-500/10',
    border: 'border-danger-500/30',
    glow: 'shadow-danger-500/20',
  },
  medium: {
    label: 'Medium',
    icon: AlertTriangle,
    color: 'text-warning-400',
    bg: 'bg-warning-500/10',
    border: 'border-warning-500/30',
    glow: 'shadow-warning-500/20',
  },
  low: {
    label: 'Low',
    icon: Info,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/30',
    glow: 'shadow-primary-500/20',
  },
};

// ── Type config ───────────────────────────────────────────────────────

export const TYPE_CONFIG: Record<
  AnomalyType,
  { label: string; icon: any; color: string; bg: string }
> = {
  demand_spike: {
    label: 'Demand Spike',
    icon: TrendingUp,
    color: 'text-accent-400',
    bg: 'bg-accent-500/10',
  },
  demand_drop: {
    label: 'Demand Drop',
    icon: TrendingDown,
    color: 'text-danger-400',
    bg: 'bg-danger-500/10',
  },
  inventory_shock: {
    label: 'Inventory Shock',
    icon: Package,
    color: 'text-warning-400',
    bg: 'bg-warning-500/10',
  },
  forecast_miss: {
    label: 'Forecast Miss',
    icon: BarChart2,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
  },
};

// ── SeverityBadge ─────────────────────────────────────────────────────

export function SeverityBadge({ severity }: { severity: AnomalySeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
        cfg.color, cfg.bg, cfg.border
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────

export function TypeBadge({ type }: { type: AnomalyType }) {
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold',
        cfg.color, cfg.bg
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}
