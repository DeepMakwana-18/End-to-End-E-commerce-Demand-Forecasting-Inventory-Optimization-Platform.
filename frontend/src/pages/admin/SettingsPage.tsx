/** Admin - Settings Page. */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Bell, Shield, Database, Palette, Save, CheckCircle2 } from 'lucide-react';
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
    } catch (e) {}
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
    } catch (e) {}
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
    
    showToast('✅ Settings saved successfully');
  };

  const settingSections = [
    {
      title: 'Appearance', icon: Palette, settings: [
        { label: 'Theme', description: 'Choose your preferred color scheme', type: 'theme' as const },
        { label: 'Sidebar Collapse', description: 'Start with collapsed sidebar by default', type: 'toggle' as const, key: 'sidebarCollapsed' },
      ],
    },
    {
      title: 'Notifications', icon: Bell, settings: [
        { label: 'Email Alerts', description: 'Receive critical alerts via email', type: 'toggle' as const, key: 'emailAlerts' },
        { label: 'Low Stock Alerts', description: 'Notify when stock drops below safety level', type: 'toggle' as const, key: 'lowStockAlerts' },
        { label: 'Forecast Updates', description: 'Notify when new forecasts are generated', type: 'toggle' as const, key: 'forecastAlerts' },
      ],
    },
    {
      title: 'Data & Privacy', icon: Shield, settings: [
        { label: 'Data Retention', description: 'How long to keep historical data', type: 'select' as const, key: 'dataRetention', options: ['6 months', '1 year', '2 years', '5 years'] },
        { label: 'Auto-backup', description: 'Automatic daily database backups', type: 'toggle' as const, key: 'autoBackup' },
      ],
    },
    {
      title: 'ML Configuration', icon: Database, settings: [
        { label: 'Auto-Retrain', description: 'Automatically retrain models on new data uploads', type: 'toggle' as const, key: 'autoRetrain' },
        { label: 'Confidence Level', description: 'Default forecast confidence interval', type: 'select' as const, key: 'confidenceLevel', options: ['90%', '95%', '99%'] },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl glass-card !bg-accent-500/10 !border-accent-500/30 text-accent-400 text-sm font-medium flex items-center gap-2 shadow-2xl">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Settings</h1>
        <p className="text-sm text-surface-500 mt-1">Platform configuration and preferences</p>
      </motion.div>

      {settingSections.map((section, si) => (
        <motion.div key={section.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + si * 0.05 }} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-surface-800/50 flex items-center gap-3">
            <section.icon className="w-5 h-5 text-surface-400" />
            <h3 className="text-sm font-semibold text-surface-200">{section.title}</h3>
          </div>
          <div className="divide-y divide-surface-800/30">
            {section.settings.map((setting) => (
              <div key={setting.label} className="px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-200">{setting.label}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{setting.description}</p>
                </div>
                {setting.type === 'theme' && (
                  <div className="flex items-center gap-1 bg-surface-800/60 rounded-xl p-1 border border-surface-700/50">
                    {(['dark', 'light', 'system'] as ThemeMode[]).map(t => (
                      <button key={t} onClick={() => setTheme(t)}
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                          theme === t ? 'gradient-primary text-white shadow-sm' : 'text-surface-400 hover:text-surface-200')}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                {setting.type === 'toggle' && setting.key && (
                  <button onClick={() => handleToggle(setting.key!)}
                    className={cn('w-11 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                      toggles[setting.key!] ? 'bg-primary-500' : 'bg-surface-700/50 border border-surface-600/50')}>
                    <div className={cn('w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm',
                      toggles[setting.key!] ? 'translate-x-[22px]' : 'translate-x-1')} />
                  </button>
                )}
                {setting.type === 'select' && setting.key && (
                  <select
                    value={selects[setting.key!] || setting.options?.[0]}
                    onChange={(e) => setSelects(prev => ({ ...prev, [setting.key!]: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg text-xs bg-surface-800/60 border border-surface-700/50 text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500/30">
                    {setting.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold gradient-primary text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-shadow">
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </motion.div>
    </div>
  );
}
