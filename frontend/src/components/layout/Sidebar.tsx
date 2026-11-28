/** TITAN AI Sidebar Navigation */

import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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

interface SidebarProps {
  isMobile: boolean;
  collapsed: boolean;
  width: number;
  onToggle: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({ isMobile, collapsed, width, onToggle, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAppStore();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const tooltipTimerRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Lock background scroll on mobile while drawer is open and allow Escape to close
  useEffect(() => {
    if (!isMobile || collapsed) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, collapsed, onCloseMobile]);

  // Keep active route visible inside the scroll container without unnecessary jumps
  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    const activeEl = navEl.querySelector<HTMLElement>('[aria-current="page"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [location.pathname, collapsed]);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current !== null) window.clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const isCollapsedDesktop = !isMobile && collapsed;
  const [expandedReady, setExpandedReady] = useState(!isCollapsedDesktop);
  const [prevCollapsed, setPrevCollapsed] = useState(isCollapsedDesktop);

  if (prevCollapsed !== isCollapsedDesktop) {
    setPrevCollapsed(isCollapsedDesktop);
    setExpandedReady(isCollapsedDesktop ? false : Boolean(prefersReducedMotion));
  }

  // Reveal expanded labels only after width clears (~110ms)
  useEffect(() => {
    if (isCollapsedDesktop || prefersReducedMotion || expandedReady) return;
    const timer = window.setTimeout(() => setExpandedReady(true), 110);
    return () => window.clearTimeout(timer);
  }, [isCollapsedDesktop, prefersReducedMotion, expandedReady]);

  const showLabels = !isCollapsedDesktop && expandedReady;

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
    if (isMobile && !collapsed) {
      onCloseMobile();
    }
  };

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
          'flex items-center min-h-[40px] py-2 rounded-[10px] text-[13px] transition-colors duration-120 motion-reduce:transition-none',
          'group relative focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-[-2px]',
          isCollapsedDesktop ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-ds-sidebar-active text-ds-sidebar-active-text border border-ds-sidebar-active-border font-semibold'
            : 'font-medium text-ds-text-secondary border border-transparent hover:text-ds-text-primary hover:bg-ds-surface-sunken'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-ds-sidebar-active-indicator"
            />
          )}
          <item.icon
            aria-hidden="true"
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-colors motion-reduce:transition-none',
              isActive
                ? 'text-ds-sidebar-active-text'
                : 'text-ds-text-secondary group-hover:text-ds-text-primary'
            )}
          />
          {showLabels && (
            <span className="truncate whitespace-nowrap">
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {isMobile && !collapsed && (
        <div
          aria-hidden="true"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-ds-scrim z-30 md:hidden"
        />
      )}

      {/* Fixed Collapsed-Rail Tooltip (never clipped by sidebar or scroll container) */}
      {tooltip && isCollapsedDesktop && (
        <div
          role="tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
          className="fixed -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-[8px] bg-ds-ink text-ds-text-inverse dark:bg-[#18181b] dark:text-[#fafaf9] text-xs font-medium shadow-md pointer-events-none whitespace-nowrap border border-ds-hairline"
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
        aria-hidden={isMobile && collapsed ? true : undefined}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 flex flex-col',
          'border-r border-ds-hairline',
          'bg-ds-sidebar-surface',
          'overflow-hidden'
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'flex items-center h-16 border-b border-ds-hairline flex-shrink-0',
            isCollapsedDesktop ? 'justify-center px-2' : 'justify-between px-3.5 gap-2'
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden text-ds-text-primary min-w-0">
            <div className="flex items-center justify-center flex-shrink-0 w-9 h-9">
              <TitanMark size={28} decorative />
            </div>
            {showLabels && (
              <div className="whitespace-nowrap min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-ds-text-primary">
                    TITAN AI
                  </h1>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-ds-surface-sunken text-ds-text-secondary border border-ds-hairline">
                    v2.4
                  </span>
                </div>
                <p className="text-[11px] text-ds-text-secondary font-medium">
                  Supply Chain Intelligence
                </p>
              </div>
            )}
          </div>

          {!isCollapsedDesktop && (
            <button
              type="button"
              onClick={() => {
                hideTooltip();
                onToggle();
              }}
              aria-expanded={!collapsed}
              aria-label="Collapse sidebar"
              className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-sunken transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-1"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Dedicated Expand Control in Collapsed Rail (prevents clipping & main-panel overlap) */}
        {isCollapsedDesktop && (
          <div className="py-1.5 flex items-center justify-center border-b border-ds-hairline flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                hideTooltip();
                onToggle();
              }}
              onMouseEnter={(e) => showTooltip(e.currentTarget, 'Expand sidebar')}
              onMouseLeave={hideTooltip}
              onFocus={(e) => showTooltip(e.currentTarget, 'Expand sidebar')}
              onBlur={hideTooltip}
              aria-expanded={false}
              aria-label="Expand sidebar"
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-sunken transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-1"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Scrollable Navigation (thin scrollbar appears only when content exceeds height) */}
        <nav
          ref={navRef}
          aria-label="Primary Navigation"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain titan-sidebar-scroll py-2.5 px-2.5 scroll-pt-2.5 scroll-pb-2.5 space-y-3"
        >
          <div className="space-y-0.5">
            {showLabels && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ds-text-secondary whitespace-nowrap overflow-hidden">
                Main Menu
              </p>
            )}
            {navItems.map(renderNavLink)}
          </div>

          {canViewAdmin && (
            <div className="space-y-0.5">
              {showLabels ? (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ds-text-secondary whitespace-nowrap overflow-hidden">
                  Administration
                </p>
              ) : isCollapsedDesktop ? (
                <div
                  aria-hidden="true"
                  className="mx-3 my-1.5 border-t border-ds-hairline"
                />
              ) : null}
              {adminItems.map(renderNavLink)}
            </div>
          )}
        </nav>

        {/* Fixed Bottom Sign Out */}
        <div className="p-2.5 border-t border-ds-hairline flex-shrink-0">
          <button
            type="button"
            onClick={logout}
            onMouseEnter={(e) => showTooltip(e.currentTarget, 'Sign Out')}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(e.currentTarget, 'Sign Out')}
            onBlur={hideTooltip}
            aria-label="Sign Out"
            className={cn(
              'w-full min-h-[40px] flex items-center rounded-[10px] text-xs font-semibold text-ds-text-secondary hover:text-ds-red-text hover:bg-ds-red-surface transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-[-2px]',
              isCollapsedDesktop ? 'justify-center px-0' : 'justify-center gap-2.5 px-3 py-2'
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {showLabels && (
              <span className="whitespace-nowrap">Sign Out</span>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
