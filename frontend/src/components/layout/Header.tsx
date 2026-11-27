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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cycleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
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

  // Close search results when clicking outside + Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6',
        'border-b border-[#e4e4e7] dark:border-[#27272a]',
        'bg-[#fafaf9]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm'
      )}
    >
      {/* Mobile toggle & Search */}
      <div className="flex items-center gap-2.5 flex-1 max-w-md" ref={searchRef}>
        <button
          onClick={toggleSidebar}
          className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[12px] text-[#52525b] hover:text-[#0a0a0a] hover:bg-[#f1f1f3] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9] dark:hover:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] transition-colors flex-shrink-0 focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-2"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b] dark:text-[#a1a1aa] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            placeholder="Search products, forecasts, alerts..."
            aria-label="Search products, forecasts, alerts"
            className={cn(
              'w-full h-10 pl-10 pr-10 rounded-[12px] text-[13px] font-medium',
              'bg-white dark:bg-[#111113] border border-[#d4d4d8] dark:border-[#27272a]',
              'text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#71717a] dark:placeholder:text-[#a1a1aa]',
              'hover:border-[#a1a1aa] dark:hover:border-white/25',
              'focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20',
              'transition-colors duration-150'
            )}
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); setShowResults(false); }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9]"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#e4e4e7] dark:border-[#27272a] bg-[#f6f6f7] dark:bg-[#18181b] px-1.5 font-mono text-[10px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
              ⌘K
            </kbd>
          )}

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && filteredResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.14 }}
                className="absolute top-full mt-2 w-full rounded-[14px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg py-1.5 z-50 max-h-64 overflow-y-auto">
                {filteredResults.map((item, i) => (
                  <button key={i} onClick={() => handleSelect(item.path)}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#0a0a0a] dark:text-[#fafaf9] hover:bg-[#f1f1f3] dark:hover:bg-[#18181b] transition-colors flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#f6f6f7] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa] uppercase">{item.type}</span>
                  </button>
                ))}
              </motion.div>
            )}
            {showResults && searchQuery.trim().length > 0 && filteredResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.14 }}
                className="absolute top-full mt-2 w-full rounded-[14px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg p-4 z-50 text-center">
                <p className="text-xs text-[#52525b] dark:text-[#a1a1aa]">No results found for &ldquo;{searchQuery}&rdquo;</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          id="theme-toggle-button"
          aria-label="Toggle theme"
          onClick={cycleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-[12px] text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9] bg-white hover:bg-[#f1f1f3] dark:bg-[#111113] dark:hover:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] transition-colors focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-2"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="w-4 h-4" />
        </button>

        {/* WS status + Notifications */}
        <button
          aria-label="Notifications"
          onClick={() => navigate('/app/alerts')}
          className="relative w-10 h-10 flex items-center justify-center rounded-[12px] text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9] bg-white hover:bg-[#f1f1f3] dark:bg-[#111113] dark:hover:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] transition-colors focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-2"
          title={isConnected ? 'Realtime: Connected' : 'Realtime: Disconnected'}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#dc2626] border border-white dark:border-[#111113]" />
        </button>

        {/* WS live indicator */}
        <div
          title={isConnected ? 'Realtime connected' : 'Realtime disconnected — reconnecting…'}
          className={cn(
            'flex items-center gap-1.5 px-3 h-10 rounded-[12px] text-xs font-semibold cursor-default select-none border',
            isConnected
              ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] dark:bg-[#14532d]/40 dark:text-[#4ade80] dark:border-[#166534]/60'
              : 'bg-[#f6f6f7] text-[#52525b] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]',
          )}
        >
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#16a34a] dark:bg-[#4ade80]" />
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#a1a1aa]" />
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 ml-1 pl-3 border-l border-[#e4e4e7] dark:border-[#27272a]">
          <div className="w-9 h-9 rounded-[10px] bg-[#0a0a0a] dark:bg-[#18181b] border border-[#0a0a0a] dark:border-[#27272a] text-[#fafaf9] flex items-center justify-center text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] leading-none">{user?.name || 'User'}</p>
            <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-1 capitalize font-medium">{user?.role || 'viewer'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
