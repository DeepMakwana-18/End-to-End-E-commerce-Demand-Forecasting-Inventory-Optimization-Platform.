/** Premium top header with search, notifications, and user menu. */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Sun, Moon, Monitor, X, Wifi, WifiOff, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/types';

const themeOptions: { value: ThemeMode; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

const searchableItems = [
  { label: 'Executive Dashboard', path: '/', type: 'page' },
  { label: 'Demand Forecasting', path: '/forecasting', type: 'page' },
  { label: 'Inventory Optimization', path: '/inventory', type: 'page' },
  { label: 'Product Analytics', path: '/products', type: 'page' },
  { label: 'Category Analytics', path: '/categories', type: 'page' },
  { label: 'Reports & Exports', path: '/reports', type: 'page' },
  { label: 'Alert Center', path: '/alerts', type: 'page' },
  { label: 'User Management', path: '/admin/users', type: 'admin' },
  { label: 'Upload Data', path: '/admin/upload', type: 'admin' },
  { label: 'ML Pipeline', path: '/admin/pipeline', type: 'admin' },
  { label: 'Settings', path: '/admin/settings', type: 'admin' },
  { label: 'Wireless Headphones', path: '/products', type: 'product' },
  { label: 'Smart Watch Pro', path: '/products', type: 'product' },
  { label: 'USB-C Hub', path: '/products', type: 'product' },
  { label: 'Bluetooth Speaker', path: '/products', type: 'product' },
  { label: 'Mechanical Keyboard', path: '/products', type: 'product' },
];

export function Header() {
  const { user, theme, setTheme, toggleSidebar } = useAppStore();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const cycleTheme = () => {
    const themes: ThemeMode[] = ['dark', 'light', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const ThemeIcon = themeOptions.find((t) => t.value === theme)?.icon || Moon;

  const filteredResults = searchQuery.trim().length > 0
    ? searchableItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSelect = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setShowResults(false);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6',
        'border-b border-slate-200/90 dark:border-ds-hairline',
        'backdrop-blur-xl bg-white/95 dark:bg-ds-surface/90 shadow-[0_1px_4px_rgba(15,23,42,0.03)]'
      )}
    >
      {/* Mobile toggle & Search */}
      <div className="flex items-center gap-2.5 flex-1 max-w-md" ref={searchRef}>
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-ds-text-secondary dark:hover:text-ds-text-primary dark:hover:bg-ds-surface-sunken border border-slate-200 dark:border-ds-hairline transition-colors flex-shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-ds-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            placeholder="Search products, forecasts, alerts..."
            className={cn(
              'w-full h-10 pl-10 pr-10 rounded-full text-xs font-medium',
              'bg-slate-50/90 dark:bg-ds-surface-sunken border border-slate-200/90 dark:border-ds-hairline',
              'text-slate-900 dark:text-ds-text-primary placeholder:text-slate-400 dark:placeholder:text-ds-text-muted',
              'hover:border-slate-300 dark:hover:border-ds-border-strong focus:bg-white',
              'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
              'transition-all duration-200 shadow-2xs'
            )}
          />
          {searchQuery ? (
            <button onClick={() => { setSearchQuery(''); setShowResults(false); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ds-text-muted hover:text-ds-text-primary">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded-md border border-ds-hairline bg-ds-surface-alt px-1.5 font-mono text-[10px] font-medium text-ds-text-muted">
              ⌘K
            </kbd>
          )}

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && filteredResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="absolute top-full mt-2 w-full glass-card shadow-2xl py-2 z-50 max-h-64 overflow-y-auto">
                {filteredResults.map((item, i) => (
                  <button key={i} onClick={() => handleSelect(item.path)}
                    className="w-full text-left px-4 py-2.5 text-sm text-ds-text-secondary hover:bg-ds-blue-surface hover:text-ds-blue-on-surface transition flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ds-surface-sunken text-ds-text-muted uppercase">{item.type}</span>
                  </button>
                ))}
              </motion.div>
            )}
            {showResults && searchQuery.trim().length > 0 && filteredResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="absolute top-full mt-2 w-full glass-card shadow-2xl p-4 z-50 text-center">
                <p className="text-xs text-ds-text-muted">No results found for "{searchQuery}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2.5">
        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={cycleTheme}
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-ds-text-muted dark:hover:text-ds-text-primary bg-slate-50 hover:bg-slate-100 dark:bg-ds-surface-alt/60 dark:hover:bg-ds-surface-alt border border-slate-200/80 dark:border-ds-hairline shadow-2xs transition-all"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="w-4 h-4" />
        </motion.button>

        {/* WS status + Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/alerts')}
          className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-ds-text-muted dark:hover:text-ds-text-primary bg-slate-50 hover:bg-slate-100 dark:bg-ds-surface-alt/60 dark:hover:bg-ds-surface-alt border border-slate-200/80 dark:border-ds-hairline shadow-2xs transition-all"
          title={isConnected ? 'Realtime: Connected' : 'Realtime: Disconnected'}
        >
          <Bell className="w-4 h-4" />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white dark:border-ds-canvas animate-pulse" />
        </motion.button>

        {/* WS live indicator */}
        <motion.div
          title={isConnected ? 'Realtime connected' : 'Realtime disconnected — reconnecting…'}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-default select-none border',
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-ds-green-surface dark:text-ds-green-text dark:border-ds-green/20'
              : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-ds-surface-sunken dark:text-ds-text-muted',
          )}
        >
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-ds-green" />
              <span className="hidden sm:inline">Live</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}
        </motion.div>

        {/* User avatar */}
        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-slate-200/80 dark:border-ds-hairline">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-900 dark:text-ds-text-primary leading-none">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-400 dark:text-ds-text-muted mt-1 capitalize font-medium">{user?.role || 'viewer'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
