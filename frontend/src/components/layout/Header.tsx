/** Premium top header with search, notifications, and user menu. */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Sun, Moon, Monitor, X, Wifi, WifiOff, Menu } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';
import { TitanMark } from '@/components/ui/TitanMark';
import type { ThemeMode } from '@/types';

const themeOptions: { value: ThemeMode; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

const searchableItems = [
  { label: 'Executive Dashboard', path: '/app', type: 'page' },
  { label: 'Demand Forecasting', path: '/app/forecasting', type: 'page' },
  { label: 'Scenarios', path: '/app/scenarios', type: 'page' },
  { label: 'Anomalies', path: '/app/anomalies', type: 'page' },
  { label: 'Inventory Optimization', path: '/app/inventory', type: 'page' },
  { label: 'Product Analytics', path: '/app/products', type: 'page' },
  { label: 'Category Analytics', path: '/app/categories', type: 'page' },
  { label: 'Reports & Exports', path: '/app/reports', type: 'page' },
  { label: 'Alert Center', path: '/app/alerts', type: 'page' },
  { label: 'User Management', path: '/app/admin/users', type: 'admin' },
  { label: 'Upload Data', path: '/app/admin/upload', type: 'admin' },
  { label: 'ML Pipeline', path: '/app/admin/pipeline', type: 'admin' },
  { label: 'Settings', path: '/app/admin/settings', type: 'admin' },
];

export function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { user, theme, setTheme, toggleSidebar, copilotOpen, setCopilotOpen } = useAppStore();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchDialogRef = useRef<HTMLDivElement>(null);
  const searchOpenerRef = useRef<HTMLElement | null>(null);

  const cycleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const ThemeIcon = themeOptions.find((t) => t.value === theme)?.icon || Moon;

  const canViewAdmin =
    user?.role === 'super_admin' || user?.role === 'org_admin' || user?.role === 'analyst';

  const filteredResults = searchQuery.trim().length > 0
    ? searchableItems.filter(
        (item) =>
          (item.type !== 'admin' || canViewAdmin) &&
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const openMobileSearch = useCallback((opener?: HTMLElement | null) => {
    if (copilotOpen) setCopilotOpen(false);
    searchOpenerRef.current = opener ?? (document.activeElement as HTMLElement | null);
    setMobileSearchOpen(true);
  }, [copilotOpen, setCopilotOpen]);

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
    setShowResults(false);
    requestAnimationFrame(() => {
      const opener = searchOpenerRef.current;
      if (opener && opener.isConnected && opener.offsetParent !== null) {
        opener.focus();
      } else if (mobileSearchTriggerRef.current && mobileSearchTriggerRef.current.offsetParent !== null) {
        mobileSearchTriggerRef.current.focus();
      } else if (searchInputRef.current && searchInputRef.current.offsetParent !== null) {
        searchInputRef.current.focus();
      }
    });
  }, []);

  const handleSelect = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setShowResults(false);
    if (mobileSearchOpen) {
      setMobileSearchOpen(false);
    }
  };

  // Focus mobile search input when dialog opens; hand off to inline input if resized >=768px
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const id = requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus();
    });
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSearchOpen(false);
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileSearchOpen]);

  // Trap Tab focus inside the mobile search dialog
  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !mobileSearchDialogRef.current) return;
    const focusables = Array.from(
      mobileSearchDialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Close search results when clicking outside + Cmd/Ctrl+K shortcut + Escape dismissal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (copilotOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          openMobileSearch(document.activeElement as HTMLElement | null);
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'Escape') {
        if (mobileSearchOpen) {
          closeMobileSearch();
        } else if (showResults) {
          setShowResults(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [copilotOpen, mobileSearchOpen, showResults, openMobileSearch, closeMobileSearch]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 h-16 flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8',
          'border-b border-ds-hairline',
          'bg-ds-surface/95 backdrop-blur-sm'
        )}
      >
        {/* Mobile toggle & Search */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1 max-w-md min-w-0" ref={searchRef}>
          <button
            type="button"
            onClick={onToggleSidebar ?? toggleSidebar}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[10px] text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-sunken border border-ds-hairline transition-colors flex-shrink-0 focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Compact search trigger (<768px so 640-767px header controls never collide) */}
          <button
            ref={mobileSearchTriggerRef}
            type="button"
            onClick={(e) => openMobileSearch(e.currentTarget)}
            aria-label="Search pages, forecasts, alerts"
            aria-expanded={mobileSearchOpen}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-[10px] text-ds-text-secondary hover:text-ds-text-primary bg-ds-surface hover:bg-ds-surface-sunken border border-ds-hairline transition-colors flex-shrink-0 focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Desktop / tablet inline search (>=768px) */}
          <div className="hidden md:block relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-secondary pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              placeholder="Search pages, forecasts, alerts..."
              aria-label="Search pages, forecasts, alerts"
              className={cn(
                'w-full h-10 pl-10 pr-10 rounded-[10px] text-[13px] font-medium',
                'bg-ds-surface-sunken border border-ds-hairline',
                'text-ds-text-primary placeholder:text-ds-text-secondary',
                'hover:border-ds-border-strong',
                'focus:outline-none focus:bg-ds-surface focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20',
                'transition-colors duration-150'
              )}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setShowResults(false); }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-ds-text-secondary hover:text-ds-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 items-center gap-1 rounded border border-ds-hairline bg-ds-surface px-1.5 font-mono text-[10px] font-medium text-ds-text-secondary">
                ⌘K
              </kbd>
            )}

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showResults && filteredResults.length > 0 && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.14 }}
                  className="absolute top-full mt-2 w-full rounded-[12px] bg-ds-surface border border-ds-hairline shadow-ds-float-2 py-1.5 z-50 max-h-64 overflow-y-auto">
                  {filteredResults.map((item) => (
                    <button type="button" key={item.path} onClick={() => handleSelect(item.path)}
                      className="w-full text-left px-4 py-2.5 text-sm text-ds-text-primary hover:bg-ds-surface-sunken transition-colors flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-ds-surface-sunken border border-ds-hairline text-ds-text-secondary uppercase">{item.type}</span>
                    </button>
                  ))}
                </motion.div>
              )}
              {showResults && searchQuery.trim().length > 0 && filteredResults.length === 0 && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.14 }}
                  className="absolute top-full mt-2 w-full rounded-[12px] bg-ds-surface border border-ds-hairline shadow-ds-float-2 p-4 z-50 text-center">
                  <p className="text-xs text-ds-text-secondary">No results found for &ldquo;{searchQuery}&rdquo;</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* AI Copilot trigger in header at all widths (eliminates floating trigger overlap) */}
          <button
            id="header-copilot-trigger"
            type="button"
            onClick={() => {
              if (mobileSearchOpen) setMobileSearchOpen(false);
              setCopilotOpen(true);
            }}
            aria-label="Open AI Copilot"
            title="AI Supply Chain Analyst"
            className="h-10 w-10 xl:w-auto xl:px-3 flex items-center justify-center gap-2 rounded-[10px] bg-ds-blue hover:bg-ds-blue-strong text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2"
          >
            <TitanMark size={18} decorative />
            <span className="hidden xl:inline text-xs font-semibold">Copilot</span>
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            id="theme-toggle-button"
            aria-label="Toggle theme"
            onClick={cycleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-[10px] text-ds-text-secondary hover:text-ds-text-primary bg-ds-surface hover:bg-ds-surface-sunken border border-ds-hairline transition-colors focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2"
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="w-4 h-4" />
          </button>

          {/* Alerts shortcut */}
          <button
            type="button"
            aria-label="Alerts"
            onClick={() => navigate('/app/alerts')}
            className="relative w-10 h-10 flex items-center justify-center rounded-[10px] text-ds-text-secondary hover:text-ds-text-primary bg-ds-surface hover:bg-ds-surface-sunken border border-ds-hairline transition-colors focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2"
            title="Alert Center"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* WS live indicator */}
          <div
            role="status"
            aria-label={isConnected ? 'Realtime connected' : 'Realtime disconnected'}
            title={isConnected ? 'Realtime connected' : 'Realtime disconnected — reconnecting…'}
            className={cn(
              'flex items-center gap-1.5 px-2.5 sm:px-3 h-10 rounded-[10px] text-xs font-semibold cursor-default select-none border',
              isConnected
                ? 'bg-ds-green-surface text-ds-green-text border-ds-green/25'
                : 'bg-ds-surface-sunken text-ds-text-secondary border-ds-hairline',
            )}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-ds-green" aria-hidden="true" />
                <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Live</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-ds-gray-400" aria-hidden="true" />
                <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-2.5 ml-0.5 sm:ml-1 pl-2 sm:pl-3 border-l border-ds-hairline">
            <div className="w-9 h-9 rounded-[10px] bg-ds-blue-surface border border-ds-blue/20 text-ds-blue-on-surface flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block min-w-0 max-w-[110px]">
              <p className="text-xs font-bold text-ds-text-primary leading-none truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-ds-text-secondary mt-1 capitalize font-medium truncate">{user?.role || 'viewer'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Narrow-screen Search Dialog (<768px) */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.14 }}
            className="fixed inset-0 z-50 md:hidden bg-ds-scrim flex items-start justify-center p-4 pt-16"
            onClick={closeMobileSearch}
          >
            <motion.div
              ref={mobileSearchDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Search navigation"
              onKeyDown={handleDialogKeyDown}
              initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.14 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[12px] bg-ds-surface border border-ds-hairline shadow-ds-float-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 p-3 border-b border-ds-hairline">
                <Search className="w-4 h-4 text-ds-text-secondary flex-shrink-0" aria-hidden="true" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pages, forecasts, alerts..."
                  aria-label="Search pages, forecasts, alerts"
                  className="flex-1 h-9 bg-transparent text-sm text-ds-text-primary placeholder:text-ds-text-secondary focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="w-8 h-8 flex items-center justify-center rounded-md text-ds-text-secondary hover:text-ds-text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeMobileSearch}
                  aria-label="Close search"
                  className="px-2.5 h-8 rounded-[8px] text-xs font-medium text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-sunken border border-ds-hairline"
                >
                  Esc
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto py-1.5">
                {(searchQuery.trim().length > 0 ? filteredResults : searchableItems.filter((item) => item.type !== 'admin' || canViewAdmin)).length > 0 ? (
                  (searchQuery.trim().length > 0
                    ? filteredResults
                    : searchableItems.filter((item) => item.type !== 'admin' || canViewAdmin)
                  ).map((item) => (
                    <button
                      type="button"
                      key={item.path}
                      onClick={() => handleSelect(item.path)}
                      className="w-full text-left px-4 py-2.5 text-sm text-ds-text-primary hover:bg-ds-surface-sunken transition-colors flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-ds-surface-sunken border border-ds-hairline text-ds-text-secondary uppercase">
                        {item.type}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-xs text-center text-ds-text-secondary">
                    No results found for &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
