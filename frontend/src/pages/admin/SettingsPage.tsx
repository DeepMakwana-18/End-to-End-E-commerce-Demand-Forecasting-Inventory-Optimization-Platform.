/** Admin - Settings Page (Refined Design System Standard). */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Shield, Database, Palette, Save, CheckCircle2, Sun, Moon, Monitor, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import type { ThemeMode } from '@/types';

export default function SettingsPage() {
  const { theme, setTheme } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('titan_settings_toggles');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore JSON parse error
    }
    return {
      sidebarCollapsed: false,
      emailAlerts: true,
      lowStockAlerts: true,
      forecastAlerts: false,
      autoBackup: true,
      autoRetrain: false,
    };
  });
  
  const [selects, setSelects] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('titan_settings_selects');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore JSON parse error
    }
    return {
      dataRetention: '1 year',
      confidenceLevel: '95%',
    };
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = (key: string) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    localStorage.setItem('titan_settings_toggles', JSON.stringify(toggles));
    localStorage.setItem('titan_settings_selects', JSON.stringify(selects));
    
    if (toggles.sidebarCollapsed !== undefined) {
      useAppStore.getState().setSidebarCollapsed(toggles.sidebarCollapsed);
    }
    
    showToast('Settings saved successfully');
  };

  const settingSections = [
    {
      title: 'Appearance',
      icon: Palette,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800/40',
      description: 'Customize UI theme, visual density, and navigation state',
      settings: [
        { label: 'Theme Mode', description: 'Choose your preferred appearance interface', type: 'theme' as const },
        { label: 'Sidebar Collapse', description: 'Start with collapsed sidebar by default', type: 'toggle' as const, key: 'sidebarCollapsed' },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/40',
      description: 'Operational alerts, inventory health pings, and model notices',
      settings: [
        { label: 'Email Alerts', description: 'Receive critical alerts via email', type: 'toggle' as const, key: 'emailAlerts' },
        { label: 'Low Stock Alerts', description: 'Notify when stock drops below safety level', type: 'toggle' as const, key: 'lowStockAlerts' },
        { label: 'Forecast Updates', description: 'Notify when new forecasts are generated', type: 'toggle' as const, key: 'forecastAlerts' },
      ],
    },
    {
      title: 'Data & Privacy',
      icon: Shield,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-800/40',
      description: 'Data retention schedules, automated snapshots, and compliance',
      settings: [
        { label: 'Data Retention', description: 'How long to keep historical transaction data', type: 'select' as const, key: 'dataRetention', options: ['6 months', '1 year', '2 years', '5 years'] },
        { label: 'Auto-backup', description: 'Automatic daily database backups and snapshots', type: 'toggle' as const, key: 'autoBackup' },
      ],
    },
    {
      title: 'ML Configuration',
      icon: Database,
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-50 border-teal-200/80 dark:bg-teal-950/40 dark:border-teal-800/40',
      description: 'Model retraining parameters and forecast confidence thresholds',
      settings: [
        { label: 'Auto-Retrain', description: 'Automatically retrain models on new data uploads', type: 'toggle' as const, key: 'autoRetrain' },
        { label: 'Confidence Level', description: 'Default forecast confidence interval', type: 'select' as const, key: 'confidenceLevel', options: ['90%', '95%', '99%'] },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Toast notification */}
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

      {/* ── Page Header ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-blue-500/15 to-teal-500/15 border border-indigo-200/80 dark:border-indigo-800/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shadow-2xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
              Settings &amp; Preferences
            </h1>
            <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5">
              Platform appearance, alert triggers, data retention and ML configurations
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="btn-apple btn-apple-primary px-5 py-2.5 text-xs font-semibold shadow-2xs self-start sm:self-auto flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Preferences</span>
        </button>
      </motion.div>

      {/* ── Settings Sections ─────────────────────────────────────── */}
      <div className="space-y-5">
        {settingSections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + si * 0.05, duration: 0.3 }}
            className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-ds-border bg-slate-50/60 dark:bg-ds-surface-sunken/40 flex items-center gap-3">
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

            <div className="divide-y divide-slate-100 dark:divide-ds-border/40">
              {section.settings.map((setting) => (
                <div key={setting.label} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 pr-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-ds-text-primary">
                      {setting.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5">
                      {setting.description}
                    </p>
                  </div>

                  {setting.type === 'theme' && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-ds-surface-sunken rounded-xl p-1 border border-slate-200/80 dark:border-ds-border">
                      {([
                        { mode: 'light', label: 'Light', icon: Sun },
                        { mode: 'dark', label: 'Dark', icon: Moon },
                        { mode: 'system', label: 'System', icon: Monitor },
                      ] as { mode: ThemeMode; label: string; icon: React.ElementType }[]).map(({ mode: t, label, icon: Icon }) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5',
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

                  {setting.type === 'toggle' && setting.key && (
                    <button
                      onClick={() => handleToggle(setting.key!)}
                      role="switch"
                      aria-checked={toggles[setting.key!]}
                      className={cn(
                        'w-11 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/25 cursor-pointer flex-shrink-0',
                        toggles[setting.key!]
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-slate-200 dark:bg-ds-surface-sunken border border-slate-300 dark:border-ds-border'
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

                  {setting.type === 'select' && setting.key && (
                    <select
                      value={selects[setting.key!] || setting.options?.[0]}
                      onChange={(e) => setSelects(prev => ({ ...prev, [setting.key!]: e.target.value }))}
                      className="px-3.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-ds-surface-sunken border border-slate-200/90 dark:border-ds-border text-slate-800 dark:text-ds-text-primary font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {setting.options?.map(o => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Save Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="pt-2 flex justify-end"
      >
        <button
          onClick={handleSave}
          className="btn-apple btn-apple-primary px-6 py-3 text-xs font-semibold shadow-xs flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </motion.div>
    </div>
  );
}
