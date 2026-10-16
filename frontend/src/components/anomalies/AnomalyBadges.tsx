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
    color: 'text-ds-red-text',
    bg: 'bg-ds-red-surface',
    border: 'border-ds-red/30',
    glow: 'shadow-ds-red/20',
  },
  medium: {
    label: 'Medium',
    icon: AlertTriangle,
    color: 'text-ds-orange-text',
    bg: 'bg-ds-orange-surface',
    border: 'border-ds-orange/30',
    glow: 'shadow-ds-orange/20',
  },
  low: {
    label: 'Low',
    icon: Info,
    color: 'text-ds-blue-on-surface',
    bg: 'bg-ds-blue-surface',
    border: 'border-ds-blue/30',
    glow: 'shadow-ds-blue/20',
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
    color: 'text-ds-green-text',
    bg: 'bg-ds-green-surface',
  },
  demand_drop: {
    label: 'Demand Drop',
    icon: TrendingDown,
    color: 'text-ds-red-text',
    bg: 'bg-ds-red-surface',
  },
  inventory_shock: {
    label: 'Inventory Shock',
    icon: Package,
    color: 'text-ds-orange-text',
    bg: 'bg-ds-orange-surface',
  },
  forecast_miss: {
    label: 'Forecast Miss',
    icon: BarChart2,
    color: 'text-ds-blue-on-surface',
    bg: 'bg-ds-blue-surface',
  },
};

// ── SeverityBadge ─────────────────────────────────────────────────────

export function SeverityBadge({ severity }: { severity: AnomalySeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
        cfg.color, cfg.bg, cfg.border
      )}
    >
      <Icon className="w-3 h-3" />
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
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-ds-hairline',
        cfg.color, cfg.bg
      )}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}
