/**
 * Admin - Settings & Preferences Page.
 *
 * State & Persistence Model:
 * - Appearance (Theme Mode, Sidebar Collapse): live browser display preferences stored
 *   in Zustand persist (`titan-scai-storage`); changes apply and persist immediately.
 * - Notification, Data & Privacy, and ML Configuration flags: local browser preferences
 *   stored in `titan_settings_toggles` and `titan_settings_selects` on Save.
 * - No backend settings API exists yet; copy states actual browser-local scope truthfully.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell,
  Shield,
  Database,
  Palette,
  Save,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  Check,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { PageHeader } from '@/components/ui/PageHeader';
import type { ThemeMode } from '@/types';

interface FormToggles {
  emailAlerts: boolean;
  lowStockAlerts: boolean;
  forecastAlerts: boolean;
  autoBackup: boolean;
  autoRetrain: boolean;
}

interface FormSelects {
  dataRetention: string;
  confidenceLevel: string;
}

const DEFAULT_TOGGLES: FormToggles = {
  emailAlerts: true,
  lowStockAlerts: true,
  forecastAlerts: false,
  autoBackup: true,
  autoRetrain: false,
};

const DEFAULT_SELECTS: FormSelects = {
  dataRetention: '1 year',
  confidenceLevel: '95%',
};

const TOGGLES_STORAGE_KEY = 'titan_settings_toggles';
const SELECTS_STORAGE_KEY = 'titan_settings_selects';

function readStoredToggles(): FormToggles {
  try {
    const raw = localStorage.getItem(TOGGLES_STORAGE_KEY);
    if (!raw) return DEFAULT_TOGGLES;
    const parsed = JSON.parse(raw) as Partial<FormToggles>;
    return {
      emailAlerts: typeof parsed.emailAlerts === 'boolean' ? parsed.emailAlerts : DEFAULT_TOGGLES.emailAlerts,
      lowStockAlerts: typeof parsed.lowStockAlerts === 'boolean' ? parsed.lowStockAlerts : DEFAULT_TOGGLES.lowStockAlerts,
      forecastAlerts: typeof parsed.forecastAlerts === 'boolean' ? parsed.forecastAlerts : DEFAULT_TOGGLES.forecastAlerts,
      autoBackup: typeof parsed.autoBackup === 'boolean' ? parsed.autoBackup : DEFAULT_TOGGLES.autoBackup,
      autoRetrain: typeof parsed.autoRetrain === 'boolean' ? parsed.autoRetrain : DEFAULT_TOGGLES.autoRetrain,
    };
  } catch {
    return DEFAULT_TOGGLES;
  }
}

function readStoredSelects(): FormSelects {
  try {
    const raw = localStorage.getItem(SELECTS_STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTS;
    const parsed = JSON.parse(raw) as Partial<FormSelects>;
    return {
      dataRetention: typeof parsed.dataRetention === 'string' ? parsed.dataRetention : DEFAULT_SELECTS.dataRetention,
      confidenceLevel: typeof parsed.confidenceLevel === 'string' ? parsed.confidenceLevel : DEFAULT_SELECTS.confidenceLevel,
    };
  } catch {
    return DEFAULT_SELECTS;
  }
}

interface SettingRowBase {
  id: string;
  label: string;
  description: string;
}

interface ThemeSettingRow extends SettingRowBase {
  type: 'theme';
}

interface ToggleSettingRow extends SettingRowBase {
  type: 'toggle';
  scope: 'immediate' | 'form';
  key: 'sidebarCollapsed' | keyof FormToggles;
}

interface SelectSettingRow extends SettingRowBase {
  type: 'select';
  key: keyof FormSelects;
  options: string[];
}

type SettingRow = ThemeSettingRow | ToggleSettingRow | SelectSettingRow;

interface SettingSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconAccent: string;
  settings: SettingRow[];
}

const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'appearance',
    title: 'Appearance',
    subtitle: 'Browser display preferences — apply and persist immediately in this browser',
    icon: Palette,
    iconAccent: 'text-[#1e3fc8] dark:text-[#60a5fa] bg-[#eff6ff] dark:bg-[#1e3a8a]/30 border-[#bfdbfe] dark:border-[#1e40af]/50',
    settings: [
      {
        id: 'theme-mode',
        label: 'Theme Mode',
        description:
          'Choose Light, Dark, or System to follow your operating system appearance. Applies immediately across all pages in this browser.',
        type: 'theme',
      },
      {
        id: 'sidebar-collapse',
        label: 'Sidebar Collapse',
        description:
          'Keep the navigation sidebar compact to maximize workspace width. Applies immediately and stays synced with the sidebar toggle.',
        type: 'toggle',
        scope: 'immediate',
        key: 'sidebarCollapsed',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Local browser preference flags — server-side email and alert delivery are not yet wired to these toggles',
    icon: Bell,
    iconAccent: 'text-[#b45309] dark:text-[#fbbf24] bg-[#fffbeb] dark:bg-[#78350f]/30 border-[#fde68a] dark:border-[#92400e]/50',
    settings: [
      {
        id: 'email-alerts',
        label: 'Email Alerts',
        description:
          'Preference flag for critical stockout email alerts. Server-side email delivery currently sends to the environment-configured recipient when triggered.',
        type: 'toggle',
        scope: 'form',
        key: 'emailAlerts',
      },
      {
        id: 'low-stock-alerts',
        label: 'Low Stock Alerts',
        description:
          'Preference flag for personal low-stock notices. Underlying inventory thresholds and alert rules are evaluated independently by the backend.',
        type: 'toggle',
        scope: 'form',
        key: 'lowStockAlerts',
      },
      {
        id: 'forecast-alerts',
        label: 'Forecast Updates',
        description:
          'Preference flag for forecast completion notices. Stored locally in this browser; automated digest delivery is not yet active.',
        type: 'toggle',
        scope: 'form',
        key: 'forecastAlerts',
      },
    ],
  },
  {
    id: 'data-privacy',
    title: 'Data & Privacy',
    subtitle: 'Local preference flags — automated retention and database backup jobs are not controlled from this screen',
    icon: Shield,
    iconAccent: 'text-[#0f766e] dark:text-[#2dd4bf] bg-[#f0fdfa] dark:bg-[#134e4a]/30 border-[#99f6e4] dark:border-[#115e59]/50',
    settings: [
      {
        id: 'data-retention',
        label: 'Data Retention',
        description:
          'Preferred historical telemetry window stored locally in this browser. Does not enforce server-side archival or data purge policies.',
        type: 'select',
        key: 'dataRetention',
        options: ['6 months', '1 year', '2 years', '5 years'],
      },
      {
        id: 'auto-backup',
        label: 'Auto-backup',
        description:
          'Preference flag for daily database snapshots stored locally in this browser. Does not schedule, trigger, or verify server backups.',
        type: 'toggle',
        scope: 'form',
        key: 'autoBackup',
      },
    ],
  },
  {
    id: 'ml-config',
    title: 'ML Configuration',
    subtitle: 'Local preference flags — active model training and prediction intervals are governed by the backend',
    icon: Database,
    iconAccent: 'text-[#1e3fc8] dark:text-[#60a5fa] bg-[#eff6ff] dark:bg-[#1e3a8a]/30 border-[#bfdbfe] dark:border-[#1e40af]/50',
    settings: [
      {
        id: 'auto-retrain',
        label: 'Auto-Retrain on Ingestion',
        description:
          'Preference flag stored locally in this browser. Sales CSV uploads currently queue background model retraining on the server by default.',
        type: 'toggle',
        scope: 'form',
        key: 'autoRetrain',
      },
      {
        id: 'confidence-level',
        label: 'Forecast Confidence Level',
        description:
          'Preferred prediction interval width stored locally in this browser. Active forecasts currently compute a fixed 95% interval from model error and forecast horizon.',
        type: 'select',
        key: 'confidenceLevel',
        options: ['90%', '95%', '99%'],
      },
    ],
  },
];

export default function SettingsPage() {
  const { theme, setTheme, sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const prefersReducedMotion = useReducedMotion();

  const [persistedToggles, setPersistedToggles] = useState<FormToggles>(readStoredToggles);
  const [persistedSelects, setPersistedSelects] = useState<FormSelects>(readStoredSelects);

  const [toggles, setToggles] = useState<FormToggles>(persistedToggles);
  const [selects, setSelects] = useState<FormSelects>(persistedSelects);

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  const toastTimerRef = useRef<number | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  const hasUnsavedChanges = useMemo(() => {
    const toggleKeys = Object.keys(toggles) as (keyof FormToggles)[];
    const selectKeys = Object.keys(selects) as (keyof FormSelects)[];
    return (
      toggleKeys.some((k) => toggles[k] !== persistedToggles[k]) ||
      selectKeys.some((k) => selects[k] !== persistedSelects[k])
    );
  }, [toggles, selects, persistedToggles, persistedSelects]);

  const showToast = (message: string, isError = false) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ message, isError });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const handleToggle = (row: ToggleSettingRow) => {
    if (row.scope === 'immediate') {
      setSidebarCollapsed(!sidebarCollapsed);
      return;
    }
    const key = row.key as keyof FormToggles;
    setSaveError(null);
    setJustSaved(false);
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectChange = (key: keyof FormSelects, value: string) => {
    setSaveError(null);
    setJustSaved(false);
    setSelects((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (isSaving || !hasUnsavedChanges) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      localStorage.setItem(TOGGLES_STORAGE_KEY, JSON.stringify(toggles));
      localStorage.setItem(SELECTS_STORAGE_KEY, JSON.stringify(selects));

      setPersistedToggles(toggles);
      setPersistedSelects(selects);
      setJustSaved(true);
      showToast('Preferences saved to this browser');

      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => {
        setJustSaved(false);
        savedTimerRef.current = null;
      }, 2200);
    } catch {
      const msg =
        'Could not write preferences to browser storage. Check storage permissions or available space and try again.';
      setSaveError(msg);
      setJustSaved(false);
      showToast('Failed to save preferences', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setTheme('system');
    setSidebarCollapsed(false);
    setToggles(DEFAULT_TOGGLES);
    setSelects(DEFAULT_SELECTS);
    setSaveError(null);
    setJustSaved(false);

    const willBeDirty =
      (Object.keys(DEFAULT_TOGGLES) as (keyof FormToggles)[]).some(
        (k) => DEFAULT_TOGGLES[k] !== persistedToggles[k]
      ) ||
      (Object.keys(DEFAULT_SELECTS) as (keyof FormSelects)[]).some(
        (k) => DEFAULT_SELECTS[k] !== persistedSelects[k]
      );

    showToast(
      willBeDirty
        ? 'Display reset to defaults immediately; preference flags staged for Save'
        : 'Display reset to System theme and expanded sidebar; preference flags already at defaults'
    );
  };

  const renderStatusBadge = () => {
    if (saveError) {
      return (
        <span
          role="status"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#fef2f2] dark:bg-[#7f1d1d]/30 border border-[#fecaca] dark:border-[#991b1b]/60 text-[11px] font-semibold text-[#991b1b] dark:text-[#fca5a5]"
        >
          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Save failed</span>
        </span>
      );
    }
    if (hasUnsavedChanges) {
      return (
        <span
          role="status"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#fffbeb] dark:bg-[#78350f]/30 border border-[#fde68a] dark:border-[#92400e]/60 text-[11px] font-semibold text-[#92400e] dark:text-[#fcd34d]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#d97706] dark:bg-[#fbbf24]" aria-hidden="true" />
          <span>Unsaved changes</span>
        </span>
      );
    }
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#f0fdf4] dark:bg-[#14532d]/30 border border-[#bbf7d0] dark:border-[#166534]/60 text-[11px] font-semibold text-[#166534] dark:text-[#86efac]"
      >
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>All saved</span>
      </span>
    );
  };

  const renderSaveButton = (variant: 'header' | 'footer') => {
    const isDisabled = isSaving || !hasUnsavedChanges;
    return (
      <button
        type="button"
        onClick={handleSave}
        disabled={isDisabled}
        aria-busy={isSaving}
        aria-label={
          isSaving
            ? 'Saving preferences'
            : hasUnsavedChanges
              ? 'Save pending preferences'
              : 'All preferences saved'
        }
        className={cn(
          'h-10 px-4 rounded-[12px] text-xs font-semibold inline-flex items-center gap-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-2',
          isDisabled
            ? 'bg-[#f4f4f5] dark:bg-[#18181b] text-[#71717a] dark:text-[#71717a] border border-[#e4e4e7] dark:border-[#27272a] cursor-not-allowed'
            : 'bg-[#1e3fc8] hover:bg-[#1a35a8] text-white border border-[#1e3fc8] shadow-xs cursor-pointer',
          variant === 'footer' && 'px-5'
        )}
      >
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : justSaved && !hasUnsavedChanges ? (
          <Check className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#4ade80]" aria-hidden="true" />
        ) : (
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        <span>
          {isSaving
            ? 'Saving...'
            : justSaved && !hasUnsavedChanges
              ? 'Saved'
              : 'Save Preferences'}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-4">
      {/* ── Toast Notification ───────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            className={cn(
              'fixed top-4 right-4 z-50 px-4 py-3 rounded-[12px] text-xs font-semibold flex items-center gap-2.5 shadow-ds-float-2 border max-w-sm',
              toast.isError
                ? 'bg-ds-red-surface text-ds-red-text border-ds-red/30'
                : 'bg-ds-surface text-ds-text-primary border-ds-hairline'
            )}
          >
            {toast.isError ? (
              <AlertCircle className="w-4 h-4 text-ds-red flex-shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-ds-green flex-shrink-0" aria-hidden="true" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title="Settings & Preferences"
        description="Browser display preferences and local configuration flags for this TITAN AI workspace"
        actions={
          <>
            {renderStatusBadge()}
            {renderSaveButton('header')}
          </>
        }
      />

      {/* ── Save Failure Banner ──────────────────────────────────────── */}
      {saveError && (
        <div
          role="alert"
          className="p-4 rounded-[14px] border border-[#fecaca] dark:border-[#991b1b] bg-[#fef2f2] dark:bg-[#450a0a]/60 text-[#991b1b] dark:text-[#fecaca] flex items-start gap-3 text-xs"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-bold">Preferences could not be saved</p>
            <p className="leading-relaxed opacity-90">{saveError} Your pending edits remain active below.</p>
          </div>
        </div>
      )}

      {/* ── 2. SETTINGS SECTIONS (4 Main Groups) ───────────────────── */}
      <div className="space-y-5">
        {SETTING_SECTIONS.map((section) => (
          <section
            key={section.id}
            aria-labelledby={`section-heading-${section.id}`}
            className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
          >
            {/* Section Header */}
            <div className="px-5 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b]/60 flex items-start sm:items-center gap-3.5">
              <div
                className={cn(
                  'w-9 h-9 rounded-[10px] border flex items-center justify-center flex-shrink-0',
                  section.iconAccent
                )}
              >
                <section.icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id={`section-heading-${section.id}`}
                  className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight"
                >
                  {section.title}
                </h2>
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 leading-relaxed">
                  {section.subtitle}
                </p>
              </div>
            </div>

            {/* Section Rows */}
            <div className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]/70">
              {section.settings.map((setting) => {
                const labelId = `setting-label-${setting.id}`;
                const descId = `setting-desc-${setting.id}`;

                const toggleChecked =
                  setting.type === 'toggle'
                    ? setting.scope === 'immediate'
                      ? sidebarCollapsed
                      : toggles[setting.key as keyof FormToggles]
                    : false;

                return (
                  <div
                    key={setting.id}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6"
                  >
                    <div className="min-w-0 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          id={labelId}
                          className="text-sm font-semibold text-[#0a0a0a] dark:text-[#fafaf9]"
                        >
                          {setting.label}
                        </span>
                        {setting.type === 'theme' && theme === 'system' && (
                          <span className="text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                            (OS: {systemPrefersDark ? 'Dark' : 'Light'})
                          </span>
                        )}
                      </div>
                      <p
                        id={descId}
                        className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-1 leading-relaxed"
                      >
                        {setting.description}
                      </p>
                    </div>

                    {/* Control: Theme Segmented Radio Group */}
                    {setting.type === 'theme' && (
                      <div
                        role="radiogroup"
                        aria-labelledby={labelId}
                        aria-describedby={descId}
                        className="inline-flex items-center gap-1 bg-[#f4f4f5] dark:bg-[#18181b] rounded-[12px] p-1 border border-[#e4e4e7] dark:border-[#27272a] self-start sm:self-center flex-shrink-0"
                      >
                        {(
                          [
                            { mode: 'light', label: 'Light', icon: Sun },
                            { mode: 'dark', label: 'Dark', icon: Moon },
                            { mode: 'system', label: 'System', icon: Monitor },
                          ] as { mode: ThemeMode; label: string; icon: React.ElementType }[]
                        ).map(({ mode, label, icon: Icon }) => {
                          const selected = theme === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setTheme(mode)}
                              className={cn(
                                'min-h-[36px] px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors duration-150 inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-1',
                                selected
                                  ? 'bg-white dark:bg-[#27272a] text-[#1e3fc8] dark:text-[#60a5fa] shadow-2xs border border-[#e4e4e7] dark:border-[#3f3f46] font-bold'
                                  : 'text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9]'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Control: Accessible Toggle Switch with Text State */}
                    {setting.type === 'toggle' && (
                      <div className="flex items-center gap-3 self-start sm:self-center flex-shrink-0">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'text-[11px] font-semibold w-6 text-right select-none',
                            toggleChecked
                              ? 'text-[#1e3fc8] dark:text-[#60a5fa]'
                              : 'text-[#71717a] dark:text-[#71717a]'
                          )}
                        >
                          {toggleChecked ? 'On' : 'Off'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={toggleChecked}
                          aria-labelledby={labelId}
                          aria-describedby={descId}
                          onClick={() => handleToggle(setting)}
                          className="min-w-[48px] min-h-[44px] inline-flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-2 rounded-[12px]"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'w-11 h-6 rounded-full relative transition-colors duration-150 block',
                              toggleChecked
                                ? 'bg-[#1e3fc8] dark:bg-[#3b82f6]'
                                : 'bg-[#d4d4d8] dark:bg-[#27272a] border border-[#a1a1aa]/50 dark:border-[#3f3f46]'
                            )}
                          >
                            <span
                              className={cn(
                                'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-150 shadow-xs block',
                                toggleChecked ? 'translate-x-[22px]' : 'translate-x-1'
                              )}
                            />
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Control: Accessible Select */}
                    {setting.type === 'select' && (
                      <div className="self-start sm:self-center flex-shrink-0">
                        <select
                          id={`select-${setting.key}`}
                          aria-labelledby={labelId}
                          aria-describedby={descId}
                          value={selects[setting.key]}
                          onChange={(e) => handleSelectChange(setting.key, e.target.value)}
                          className="min-h-[40px] px-3.5 py-2 rounded-[10px] text-xs bg-[#fafaf9] dark:bg-[#18181b] border border-[#d4d4d8] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] font-semibold focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-1 cursor-pointer"
                        >
                          {setting.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ── 3. BOTTOM ACTIONS (Synchronized with Header) ───────────── */}
      <footer className="p-5 rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-2.5 text-xs text-[#52525b] dark:text-[#a1a1aa] max-w-2xl">
          <Info className="w-4 h-4 text-[#1e3fc8] dark:text-[#60a5fa] flex-shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <span>
            Appearance choices apply immediately to this browser. Notification, retention, and ML flags are saved locally in this browser when you click Save Preferences.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-end sm:self-center flex-shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="h-10 px-4 rounded-[12px] border border-[#e4e4e7] dark:border-[#27272a] bg-white hover:bg-[#f4f4f5] text-[#0a0a0a] dark:bg-[#18181b] dark:hover:bg-[#27272a] dark:text-[#fafaf9] text-xs font-semibold transition-colors duration-150 inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-2"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>

          {renderSaveButton('footer')}
        </div>
      </footer>
    </div>
  );
}
