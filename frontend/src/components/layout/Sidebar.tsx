/** Premium enterprise sidebar with glassmorphism effects. */

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, user, logout } = useAppStore();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const width = isMobile ? (sidebarCollapsed ? 0 : 260) : (sidebarCollapsed ? 72 : 260);

  return (
    <>
      {isMobile && !sidebarCollapsed && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-ds-scrim z-30 md:hidden"
        />
      )}
      <motion.aside
        initial={false}
        animate={{ width }}
        transition={{ duration: 0.3, ease: [0.28, 0.11, 0.32, 1] }}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 flex flex-col',
          'border-r border-[#e4e4e7] dark:border-[#27272a]',
          'bg-white dark:bg-[#111113]',
          'overflow-hidden'
        )}
      >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[#e4e4e7] dark:border-[#27272a] flex-shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden text-[#0a0a0a] dark:text-[#fafaf9]">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <TitanMark size={28} decorative />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
                className="whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#0a0a0a] dark:text-[#fafaf9]">TITAN AI</h1>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#f1f1f3] text-[#52525b] border border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]">v2.4</span>
                </div>
                <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium">Supply Chain Intelligence</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        <div className="mb-4">
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#52525b] dark:text-[#a1a1aa]">
              Main Menu
            </p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/app'}
              title={sidebarCollapsed ? item.label : undefined}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-[12px] text-[13px] font-medium transition-colors duration-150',
                  'group relative focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-[-2px]',
                  isActive
                    ? 'bg-[#0a0a0a] text-[#fafaf9] font-semibold dark:bg-[#18181b] dark:text-[#fafaf9] dark:border dark:border-[#27272a]'
                    : 'text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] hover:bg-[#f1f1f3] dark:hover:bg-[#18181b]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-[#f59e0b]"
                    />
                  )}
                  <item.icon className={cn(
                    'w-4 h-4 flex-shrink-0 transition-colors',
                    isActive ? 'text-[#fafaf9]' : 'text-[#52525b] dark:text-[#a1a1aa] group-hover:text-[#0a0a0a] dark:group-hover:text-[#fafaf9]'
                  )} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Admin section */}
        {(user?.role === 'super_admin' || user?.role === 'org_admin' || user?.role === 'analyst') && (
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#52525b] dark:text-[#a1a1aa]">
                Administration
              </p>
            )}
            {adminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-[12px] text-[13px] font-medium transition-colors duration-150',
                    'group relative focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-[-2px]',
                    isActive
                      ? 'bg-[#0a0a0a] text-[#fafaf9] font-semibold dark:bg-[#18181b] dark:text-[#fafaf9] dark:border dark:border-[#27272a]'
                      : 'text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] hover:bg-[#f1f1f3] dark:hover:bg-[#18181b]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-[#f59e0b]"
                      />
                    )}
                    <item.icon className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-[#fafaf9]' : 'text-[#52525b] dark:text-[#a1a1aa] group-hover:text-[#0a0a0a] dark:group-hover:text-[#fafaf9]'
                    )} />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.14 }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-2.5 border-t border-[#e4e4e7] dark:border-[#27272a] space-y-1">
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full min-h-[44px] flex items-center justify-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9] hover:bg-[#f1f1f3] dark:hover:bg-[#18181b] transition-colors focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-[-2px]"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>

        {/* User / Logout */}
        <button
          onClick={logout}
          aria-label="Sign Out"
          className="w-full min-h-[44px] flex items-center justify-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] hover:text-[#991b1b] hover:bg-[#fee2e2] dark:hover:text-[#fda4af] dark:hover:bg-[#7f1d1d]/30 transition-colors focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-[-2px]"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
