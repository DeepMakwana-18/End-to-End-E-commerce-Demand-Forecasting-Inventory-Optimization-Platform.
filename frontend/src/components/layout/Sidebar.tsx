/** TITAN AI Sidebar Navigation */

import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, Package, PieChart,
  FileText, Settings, ChevronLeft, ChevronRight, Bell,
  Upload, Users, Activity, Boxes, LogOut, FlaskConical, ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TitanMark } from '@/components/ui/TitanMark';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/app' },
  { label: 'Forecasting', icon: TrendingUp, path: '/app/forecasting' },
  { label: 'Scenarios', icon: FlaskConical, path: '/app/scenarios' },
  { label: 'Anomalies', icon: ShieldAlert, path: '/app/anomalies' },
  { label: 'Inventory', icon: Package, path: '/app/inventory' },
  { label: 'Products', icon: Boxes, path: '/app/products' },
  { label: 'Categories', icon: PieChart, path: '/app/categories' },
  { label: 'Reports', icon: FileText, path: '/app/reports' },
  { label: 'Alerts', icon: Bell, path: '/app/alerts' },
];

const adminItems = [
  { label: 'Users', icon: Users, path: '/app/admin/users' },
  { label: 'Upload Data', icon: Upload, path: '/app/admin/upload' },
  { label: 'ML Pipeline', icon: Activity, path: '/app/admin/pipeline' },
  { label: 'Settings', icon: Settings, path: '/app/admin/settings' },
];

interface TooltipState {
  label: string;
  top: number;
  left: number;
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, user, logout } = useAppStore();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const tooltipTimerRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Lock background scroll on mobile while drawer is open and allow Escape to close
  useEffect(() => {
    if (!isMobile || sidebarCollapsed) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarCollapsed(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, sidebarCollapsed, setSidebarCollapsed]);

  // Keep active route visible inside the scroll container without unnecessary jumps
  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    const activeEl = navEl.querySelector<HTMLElement>('[aria-current="page"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [location.pathname, sidebarCollapsed]);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current !== null) window.clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const isCollapsedDesktop = !isMobile && sidebarCollapsed;

  const showTooltip = (el: HTMLElement, label: string) => {
    if (!isCollapsedDesktop) return;
    if (tooltipTimerRef.current !== null) window.clearTimeout(tooltipTimerRef.current);
    const rect = el.getBoundingClientRect();
    tooltipTimerRef.current = window.setTimeout(() => {
      setTooltip({
        label,
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
    }, 120);
  };

  const hideTooltip = () => {
    if (tooltipTimerRef.current !== null) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    setTooltip(null);
  };

  const handleNavClick = () => {
    hideTooltip();
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  };

  const width = isMobile ? (sidebarCollapsed ? 0 : 260) : (sidebarCollapsed ? 72 : 260);
  const canViewAdmin =
    user?.role === 'super_admin' || user?.role === 'org_admin' || user?.role === 'analyst';

  const renderNavLink = (item: { label: string; icon: React.ElementType; path: string }) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/app'}
      onClick={handleNavClick}
      onMouseEnter={(e) => showTooltip(e.currentTarget, item.label)}
      onMouseLeave={hideTooltip}
      onFocus={(e) => showTooltip(e.currentTarget, item.label)}
      onBlur={hideTooltip}
      aria-label={item.label}
      className={({ isActive }) =>
        cn(
          'flex items-center min-h-[40px] py-2 rounded-[12px] text-[13px] transition-colors duration-150 motion-reduce:transition-none',
          'group relative focus-visible:outline-2 focus-visible:outline-[#1e3fc8] dark:focus-visible:outline-[#60a5fa] focus-visible:outline-offset-[-2px]',
          isCollapsedDesktop ? 'justify-center px-0' : 'gap-3 px-3.5',
          isActive
            ? 'bg-[#0a0a0a] text-[#fafaf9] font-semibold dark:bg-[#18181b] dark:text-[#fafaf9] dark:border dark:border-[#27272a]'
            : 'font-medium text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] hover:bg-[#f1f1f3] dark:hover:text-[#e4e4e7] dark:hover:bg-[#18181b]/55'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#f59e0b]"
            />
          )}
          <item.icon
            aria-hidden="true"
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-colors motion-reduce:transition-none',
              isActive
                ? 'text-[#fafaf9]'
                : 'text-[#52525b] dark:text-[#a1a1aa] group-hover:text-[#0a0a0a] dark:group-hover:text-[#e4e4e7]'
            )}
          />
          <AnimatePresence>
            {!isCollapsedDesktop && (
              <motion.span
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.14 }}
                className="truncate"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {isMobile && !sidebarCollapsed && (
        <div
          aria-hidden="true"
          onClick={toggleSidebar}
          className="fixed inset-0 bg-ds-scrim z-30 md:hidden"
        />
      )}

      {/* Fixed Collapsed-Rail Tooltip (never clipped by sidebar or scroll container) */}
      {tooltip && isCollapsedDesktop && (
        <div
          role="tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
          className="fixed -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-[8px] bg-[#0a0a0a] text-[#fafaf9] dark:bg-[#18181b] dark:text-[#fafaf9] text-xs font-medium shadow-md pointer-events-none whitespace-nowrap border border-[#27272a]"
        >
          {tooltip.label}
        </div>
      )}

      <motion.aside
        initial={false}
        animate={{ width }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.2,
          ease: [0.28, 0.11, 0.32, 1],
        }}
        aria-hidden={isMobile && sidebarCollapsed ? true : undefined}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 flex flex-col',
          'border-r border-[#e4e4e7] dark:border-[#27272a]',
          'bg-white dark:bg-[#111113]',
          'overflow-hidden'
        )}
      >
        {/* Brand Header + Top Collapse Toggle (40x40px hit target) */}
        <div
          className={cn(
            'flex items-center justify-between h-16 border-b border-[#e4e4e7] dark:border-[#27272a] flex-shrink-0',
            isCollapsedDesktop ? 'px-1 gap-0.5' : 'px-3.5 gap-2'
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden text-[#0a0a0a] dark:text-[#fafaf9] min-w-0">
            <div
              className={cn(
                'flex items-center justify-center flex-shrink-0',
                isCollapsedDesktop ? 'w-6 h-6' : 'w-9 h-9'
              )}
            >
              <TitanMark size={isCollapsedDesktop ? 20 : 28} decorative />
            </div>
            <AnimatePresence>
              {!isCollapsedDesktop && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, x: -8 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
                  className="whitespace-nowrap min-w-0"
                >
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#0a0a0a] dark:text-[#fafaf9]">
                      TITAN AI
                    </h1>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#f1f1f3] text-[#52525b] border border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]">
                      v2.4
                    </span>
                  </div>
                  <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium">
                    Supply Chain Intelligence
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => {
              hideTooltip();
              toggleSidebar();
            }}
            onMouseEnter={(e) => showTooltip(e.currentTarget, 'Expand sidebar')}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(e.currentTarget, 'Expand sidebar')}
            onBlur={hideTooltip}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] hover:bg-[#f1f1f3] dark:hover:bg-[#18181b]/70 transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1e3fc8] dark:focus-visible:outline-[#60a5fa] focus-visible:outline-offset-1"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation (scrollbar visually hidden, wheel/trackpad/touch/keyboard active) */}
        <nav
          ref={navRef}
          aria-label="Primary Navigation"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain titan-sidebar-scroll-hidden py-3 px-2.5 scroll-pt-3 scroll-pb-3 space-y-3"
        >
          <div className="space-y-0.5">
            {!isCollapsedDesktop && (
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#52525b] dark:text-[#a1a1aa]">
                Main Menu
              </p>
            )}
            {navItems.map(renderNavLink)}
          </div>

          {canViewAdmin && (
            <div className="space-y-0.5">
              {!isCollapsedDesktop ? (
                <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#52525b] dark:text-[#a1a1aa]">
                  Administration
                </p>
              ) : (
                <div
                  aria-hidden="true"
                  className="mx-3 my-2 border-t border-[#e4e4e7] dark:border-[#27272a]"
                />
              )}
              {adminItems.map(renderNavLink)}
            </div>
          )}
        </nav>

        {/* Fixed Bottom Sign Out */}
        <div className="p-2.5 border-t border-[#e4e4e7] dark:border-[#27272a] flex-shrink-0">
          <button
            type="button"
            onClick={logout}
            onMouseEnter={(e) => showTooltip(e.currentTarget, 'Sign Out')}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(e.currentTarget, 'Sign Out')}
            onBlur={hideTooltip}
            aria-label="Sign Out"
            className="w-full min-h-[40px] flex items-center justify-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] hover:text-[#991b1b] hover:bg-[#fee2e2] dark:hover:text-[#fda4af] dark:hover:bg-[#7f1d1d]/30 transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1e3fc8] dark:focus-visible:outline-[#60a5fa] focus-visible:outline-offset-[-2px]"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <AnimatePresence>
              {!isCollapsedDesktop && (
                <motion.span
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
