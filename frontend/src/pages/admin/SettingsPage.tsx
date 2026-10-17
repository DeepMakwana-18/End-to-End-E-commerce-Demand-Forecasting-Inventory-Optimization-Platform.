/**
 * Admin - Settings & Preferences Page.
 *
 * Titan AI Page 13 Refinements:
 * - Approved Titan AI page header container with icon, gradient accent, and unified save status
 * - Synchronized Save Preferences actions (top and bottom) with dirty-state tracking (Unsaved Changes indicator)
 * - Clear operational descriptions for Data Retention, Auto-backup, Auto-Retrain, and Forecast Confidence
 * - High-contrast theme segmented control (Light / Dark / System) and accessible switch toggles
 * - Reset to platform defaults capability
 * - Bottom clearance (pb-28 sm:pb-32) avoiding overlap with floating AI assistant
 * - Full Light and Dark mode styling consistency
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Shield,
  Database,
  Palette,
  Save,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Sliders,
  RotateCcw,
  Check,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import type { ThemeMode } from '@/types';

interface ToggleSettings {
  sidebarCollapsed: boolean;
  emailAlerts: boolean;
  lowStockAlerts: boolean;
  forecastAlerts: boolean;
  autoBackup: boolean;
  autoRetrain: boolean;
  [key: string]: boolean;
}

interface SelectSettings {
  dataRetention: string;
  confidenceLevel: string;
  [key: string]: string;
}

const DEFAULT_TOGGLES: ToggleSettings = {
  sidebarCollapsed: false,
  emailAlerts: true,
  lowStockAlerts: true,
  forecastAlerts: false,
  autoBackup: true,
  autoRetrain: false,
};

const DEFAULT_SELECTS: SelectSettings = {
  dataRetention: '1 year',
  confidenceLevel: '95%',
};

export default function SettingsPage() {
  const { theme, setTheme, sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Load initial persisted settings from localStorage
  const [persistedToggles, setPersistedToggles] = useState<ToggleSettings>(() => {
    try {
      const saved = localStorage.getItem('titan_settings_toggles');
      if (saved) return { ...DEFAULT_TOGGLES, ...JSON.parse(saved) };
    } catch {
      // ignore JSON parse error
    }
    return DEFAULT_TOGGLES;
  });

  const [persistedSelects, setPersistedSelects] = useState<SelectSettings>(() => {
    try {
      const saved = localStorage.getItem('titan_settings_selects');
      if (saved) return { ...DEFAULT_SELECTS, ...JSON.parse(saved) };
    } catch {
      // ignore JSON parse error
    }
    return DEFAULT_SELECTS;
  });

  // Current working state
  const [toggles, setToggles] = useState<ToggleSettings>(persistedToggles);
  const [selects, setSelects] = useState<SelectSettings>(persistedSelects);

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const togglesChanged = Object.keys(toggles).some(
      (k) => toggles[k] !== persistedToggles[k]
    );
    const selectsChanged = Object.keys(selects).some(
      (k) => selects[k] !== persistedSelects[k]
    );
    return togglesChanged || selectsChanged;
  }, [toggles, selects, persistedToggles, persistedSelects]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = (key: string) => {
    setToggles((prev) => {
      const nextVal = !prev[key];
      // If toggling sidebar, update live store immediately for responsive preview
      if (key === 'sidebarCollapsed') {
        setSidebarCollapsed(nextVal);
      }
      return { ...prev, [key]: nextVal };
    });
  };

  const handleSelectChange = (key: string, value: string) => {
    setSelects((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('titan_settings_toggles', JSON.stringify(toggles));
      localStorage.setItem('titan_settings_selects', JSON.stringify(selects));

      setPersistedToggles(toggles);
      setPersistedSelects(selects);

      if (toggles.sidebarCollapsed !== sidebarCollapsed) {
        setSidebarCollapsed(toggles.sidebarCollapsed);
      }

      setJustSaved(true);
      showToast('Preferences successfully saved');
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      showToast('Error saving preferences to local storage');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setToggles(DEFAULT_TOGGLES);
    setSelects(DEFAULT_SELECTS);
    setTheme('system');
    setSidebarCollapsed(false);
    showToast('Preferences reset to platform defaults (click Save to persist)');
  };

  const settingSections = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800/40',
      description: 'Customize application theme, display density, and navigation states',
      settings: [
        {
          label: 'Theme Mode',
          description: 'Select your preferred visual style (Light, Dark, or System automatic)',
          type: 'theme' as const,
        },
        {
          label: 'Sidebar Collapse',
          description: 'Keep navigation sidebar compact by default to maximize dashboard workspace',
          type: 'toggle' as const,
          key: 'sidebarCollapsed',
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/40',
      description: 'Operational alert triggers, inventory health notices, and forecast updates',
      settings: [
        {
          label: 'Email Alerts',
          description: 'Send high-severity stockout notifications and pipeline failures to admin email',
          type: 'toggle' as const,
          key: 'emailAlerts',
        },
        {
          label: 'Low Stock Alerts',
          description: 'Trigger automated warning when SKU units dip below calculated safety stock threshold',
          type: 'toggle' as const,
          key: 'lowStockAlerts',
        },
        {
          label: 'Forecast Updates',
          description: 'Receive notification upon successful completion of weekly ML forecast inference runs',
          type: 'toggle' as const,
          key: 'forecastAlerts',
        },
      ],
    },
    {
      id: 'data-privacy',
      title: 'Data & Privacy',
      icon: Shield,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-800/40',
      description: 'Data retention policies, automated database snapshots, and telemetry governance',
      settings: [
        {
          label: 'Data Retention',
          description: 'Historical telemetry storage window preference for audit logging and archival compliance',
          type: 'select' as const,
          key: 'dataRetention',
          options: ['6 months', '1 year', '2 years', '5 years'],
          badge: 'Policy Setting',
        },
        {
          label: 'Auto-backup',
          description: 'Flag for automated daily database snapshot creation and disaster recovery synchronization',
          type: 'toggle' as const,
          key: 'autoBackup',
        },
      ],
    },
    {
      id: 'ml-config',
      title: 'ML Configuration',
      icon: Database,
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-50 border-teal-200/80 dark:bg-teal-950/40 dark:border-teal-800/40',
      description: 'Demand forecasting hyperparameters and prediction uncertainty bounds',
      settings: [
        {
          label: 'Auto-Retrain on Ingestion',
          description: 'Automatically trigger background ML model retraining when new sales CSVs are uploaded',
          type: 'toggle' as const,
          key: 'autoRetrain',
        },
        {
          label: 'Forecast Confidence Level',
          description: 'Statistical prediction interval applied when rendering forecast uncertainty bands (±z·σ)',
          type: 'select' as const,
          key: 'confidenceLevel',
          options: ['90%', '95%', '99%'],
          badge: 'Statistical Hyperparameter',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl pb-28 sm:pb-32">
      {/* ── Toast notification ───────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2.5 shadow-xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. PAGE HEADER (Titan AI Standard Design System) ───────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden gap-4"
      >
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-blue-600 inline-block" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-ds-text tracking-tight">
                Settings &amp; Preferences
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-0.5 ml-3.5 font-medium">
              Platform appearance, alert triggers, data governance, and ML configurations
            </p>
          </div>
        </div>

        {/* Top Save Controls with Dirty State Indicator */}
        <div className="relative flex items-center gap-2.5 self-start sm:self-center">
          {hasUnsavedChanges ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved Changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              All Saved
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'h-9 px-4.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer',
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : justSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : justSaved ? 'Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </motion.div>

      {/* ── 2. SETTINGS SECTIONS (4 Main Groups) ───────────────────── */}
      <div className="space-y-5">
        {settingSections.map((section, si) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + si * 0.05, duration: 0.3 }}
            className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
          >
            {/* Section Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-ds-border bg-gradient-to-r from-slate-50/70 via-white to-white dark:bg-none dark:from-ds-surface-sunken/40 dark:via-ds-surface dark:to-ds-surface flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center shadow-2xs', section.iconBg)}>
                <section.icon className={cn('w-4 h-4', section.iconColor)} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
                  {section.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5">
                  {section.description}
                </p>
              </div>
            </div>

            {/* Section Setting Rows */}
            <div className="divide-y divide-slate-100 dark:divide-ds-border/40">
              {section.settings.map((setting) => (
                <div key={setting.label} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-ds-text-primary">
                        {setting.label}
                      </p>
                      {'badge' in setting && setting.badge && (
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                          {setting.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5 leading-relaxed">
                      {setting.description}
                    </p>
                  </div>

                  {/* Setting: Theme Segmented Control */}
                  {setting.type === 'theme' && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-ds-surface-sunken rounded-xl p-1 border border-slate-200/80 dark:border-ds-border self-start sm:self-center">
                      {(
                        [
                          { mode: 'light', label: 'Light', icon: Sun },
                          { mode: 'dark', label: 'Dark', icon: Moon },
                          { mode: 'system', label: 'System', icon: Monitor },
                        ] as { mode: ThemeMode; label: string; icon: React.ElementType }[]
                      ).map(({ mode: t, label, icon: Icon }) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          type="button"
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer',
                            theme === t
                              ? 'bg-white dark:bg-ds-surface text-blue-700 dark:text-blue-400 shadow-2xs border border-slate-200/60 dark:border-ds-border font-bold'
                              : 'text-slate-500 dark:text-ds-text-secondary hover:text-slate-900 dark:hover:text-ds-text-primary'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Setting: Toggle Switch */}
                  {setting.type === 'toggle' && 'key' in setting && setting.key && (
                    <button
                      onClick={() => handleToggle(setting.key!)}
                      type="button"
                      role="switch"
                      aria-checked={toggles[setting.key!]}
                      aria-label={setting.label}
                      className={cn(
                        'w-11 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/25 cursor-pointer flex-shrink-0 self-start sm:self-center',
                        toggles[setting.key!]
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-xs',
                          toggles[setting.key!] ? 'translate-x-[22px]' : 'translate-x-1'
                        )}
                      />
                    </button>
                  )}

                  {/* Setting: Select Dropdown */}
                  {setting.type === 'select' && 'key' in setting && setting.key && (
                    <div className="self-start sm:self-center flex-shrink-0">
                      <select
                        id={`select-${setting.key}`}
                        value={selects[setting.key!] || setting.options?.[0]}
                        onChange={(e) => handleSelectChange(setting.key!, e.target.value)}
                        className="px-3.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-ds-text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
                      >
                        {setting.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── 3. BOTTOM ACTIONS (Synchronized with Header) ───────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>
            Preferences are saved locally in your active session and applied across Titan AI workflows.
          </span>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
          <button
            onClick={handleResetDefaults}
            type="button"
            className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            type="button"
            className={cn(
              'h-9 px-5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer',
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : justSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : justSaved ? 'Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
