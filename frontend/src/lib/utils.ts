/** Utility function for merging class names with Tailwind CSS. */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency values */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format large numbers with K/M/B suffixes */
export function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

/** Format percentage */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Get severity color class */
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: 'text-accent-400',
    medium: 'text-warning-400',
    high: 'text-orange-400',
    critical: 'text-danger-400',
  };
  return colors[severity] || 'text-surface-400';
}

/** Get severity bg color class */
export function getSeverityBg(severity: string): string {
  const colors: Record<string, string> = {
    low: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
    medium: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    critical: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  };
  return colors[severity] || 'bg-surface-700/50 text-surface-400';
}
