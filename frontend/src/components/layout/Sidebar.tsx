/** Premium enterprise sidebar with glassmorphism effects. */

import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, Package, BarChart3, PieChart,
  FileText, Settings, ChevronLeft, ChevronRight, Bell,
  Upload, Users, Activity, Boxes, LogOut,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Forecasting', icon: TrendingUp, path: '/forecasting' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Products', icon: Boxes, path: '/products' },
  { label: 'Categories', icon: PieChart, path: '/categories' },
  { label: 'Reports', icon: FileText, path: '/reports' },
  { label: 'Alerts', icon: Bell, path: '/alerts' },
];

const adminItems = [
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Upload Data', icon: Upload, path: '/admin/upload' },
  { label: 'ML Pipeline', icon: Activity, path: '/admin/pipeline' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, user, logout } = useAppStore();
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col',
        'border-r border-surface-800/50',
        'bg-surface-950/80 backdrop-blur-xl',
        'overflow-hidden'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-surface-800/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
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
                <h1 className="text-sm font-bold text-surface-50 tracking-tight">Titan AI</h1>
                <p className="text-[10px] text-surface-500 font-medium">Supply Chain Intelligence</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <div className="mb-4">
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-surface-500">
              Main Menu
            </p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  'hover:bg-surface-800/60 group relative',
                  isActive
                    ? 'bg-primary-500/10 text-primary-400 shadow-sm'
                    : 'text-surface-400 hover:text-surface-200'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary-400' : 'text-surface-500 group-hover:text-surface-300'
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
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-surface-500">
                Administration
              </p>
            )}
            {adminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    'hover:bg-surface-800/60 group relative',
                    isActive
                      ? 'bg-primary-500/10 text-primary-400 shadow-sm'
                      : 'text-surface-400 hover:text-surface-200'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary-500"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn(
                      'w-5 h-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-primary-400' : 'text-surface-500 group-hover:text-surface-300'
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
      <div className="p-2 border-t border-surface-800/50">
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition-all"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>

        {/* User / Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all mt-1"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
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
  );
}
