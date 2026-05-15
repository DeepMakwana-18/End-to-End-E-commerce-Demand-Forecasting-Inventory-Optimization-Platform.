/** Premium top header with search, notifications, and user menu. */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Sun, Moon, Monitor, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
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
  const { user, theme, setTheme } = useAppStore();
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
        'sticky top-0 z-30 h-16 flex items-center justify-between px-6',
        'border-b border-surface-800/50',
        'bg-surface-950/60 backdrop-blur-xl'
      )}
    >
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            placeholder="Search products, forecasts, alerts..."
            className={cn(
              'w-full pl-10 pr-10 py-2.5 rounded-xl text-sm',
              'bg-surface-800/50 border border-surface-700/50',
              'text-surface-200 placeholder:text-surface-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50',
              'transition-all duration-200'
            )}
          />
          {searchQuery ? (
            <button onClick={() => { setSearchQuery(''); setShowResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-surface-600 bg-surface-800 px-1.5 font-mono text-[10px] font-medium text-surface-400">
              ⌘K
            </kbd>
          )}

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && filteredResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="absolute top-full mt-2 w-full glass-card py-2 z-50 max-h-64 overflow-y-auto">
                {filteredResults.map((item, i) => (
                  <button key={i} onClick={() => handleSelect(item.path)}
                    className="w-full text-left px-4 py-2.5 text-sm text-surface-300 hover:bg-surface-800/60 hover:text-primary-400 transition flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800/80 text-surface-500 uppercase">{item.type}</span>
                  </button>
                ))}
              </motion.div>
            )}
            {showResults && searchQuery.trim().length > 0 && filteredResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="absolute top-full mt-2 w-full glass-card p-4 z-50 text-center">
                <p className="text-xs text-surface-500">No results found for "{searchQuery}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={cycleTheme}
          className="p-2.5 rounded-xl text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition-all"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="w-5 h-5" />
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/alerts')}
          className="relative p-2.5 rounded-xl text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition-all"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-danger-500 border-2 border-surface-950 animate-pulse" />
        </motion.button>

        {/* User avatar */}
        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-surface-800/50">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-primary-500/10">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-surface-200 leading-none">{user?.name || 'User'}</p>
            <p className="text-[11px] text-surface-500 mt-0.5 capitalize">{user?.role || 'viewer'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
