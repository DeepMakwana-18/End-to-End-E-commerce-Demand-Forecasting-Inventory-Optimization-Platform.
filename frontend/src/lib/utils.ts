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
  const s = severity?.toLowerCase();
  if (s === 'critical') return 'text-rose-600 dark:text-rose-400';
  if (s === 'high') return 'text-orange-600 dark:text-orange-400';
  if (s === 'medium') return 'text-amber-600 dark:text-amber-400';
  if (s === 'low') return 'text-blue-600 dark:text-blue-400';
  return 'text-slate-500 dark:text-ds-text-muted';
}

/** Get severity bg color class */
export function getSeverityBg(severity: string): string {
  const s = severity?.toLowerCase();
  if (s === 'critical') {
    return 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30';
  }
  if (s === 'high') {
    return 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA] dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-500/30';
  }
  if (s === 'medium') {
    return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30';
  }
  return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30';
}
