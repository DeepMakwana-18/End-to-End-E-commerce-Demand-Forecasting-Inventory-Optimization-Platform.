/** Premium enterprise sidebar with glassmorphism effects. */

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, Package, BarChart3, PieChart,
  FileText, Settings, ChevronLeft, ChevronRight, Bell,
  Upload, Users, Activity, Boxes, LogOut, FlaskConical, ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

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
          'border-r border-ds-hairline',
          'bg-ds-sidebar-surface backdrop-blur-2xl',
          'overflow-hidden shadow-sm'
        )}
      >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-ds-hairline flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap"
              >
                <h1 className="text-sm font-bold text-ds-text-primary tracking-tight">Titan AI</h1>
                <p className="text-[10px] text-ds-text-muted font-medium">Supply Chain Intelligence</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <div className="mb-4">
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-ds-text-muted">
              Main Menu
            </p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all duration-200',
                  'group relative',
                  isActive
                    ? 'bg-ds-blue-surface text-ds-blue-on-surface shadow-sm'
                    : 'text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-alt/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-ds-blue"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-ds-blue' : 'text-ds-gray-500 group-hover:text-ds-text-primary'
                  )} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
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
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-ds-text-muted">
                Administration
              </p>
            )}
            {adminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all duration-200',
                    'group relative',
                    isActive
                      ? 'bg-ds-blue-surface text-ds-blue-on-surface shadow-sm'
                      : 'text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-alt/60'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-ds-blue"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn(
                      'w-5 h-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-ds-blue' : 'text-ds-gray-500 group-hover:text-ds-text-primary'
                    )} />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
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
      <div className="p-2 border-t border-ds-hairline space-y-1">
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-full text-sm font-medium text-ds-text-muted hover:text-ds-text-primary hover:bg-ds-surface-alt/60 transition-all"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>

        {/* User / Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-full text-sm font-medium text-ds-text-muted hover:text-ds-red hover:bg-ds-red-surface transition-all"
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
