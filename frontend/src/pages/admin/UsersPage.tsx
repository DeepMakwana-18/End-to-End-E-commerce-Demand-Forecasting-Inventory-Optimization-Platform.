/**
 * Admin - User Management Page.
 *
 * Light Mode Refinement: Enterprise admin interface, Apple Modern styling,
 * high-contrast table headers, distinct role badges, clear status indicators,
 * accessible search input, and responsive action menus.
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  MoreVertical,
  Mail,
  Calendar,
  X,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  UserX,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  created: string;
}

const initialUsers: User[] = [
  { id: 1, name: 'Admin User', email: 'admin@demandforecaster.com', role: 'admin', status: 'active', lastLogin: '2 hours ago', created: '2026-01-15' },
  { id: 2, name: 'Sarah Chen', email: 'sarah.chen@company.com', role: 'manager', status: 'active', lastLogin: '1 day ago', created: '2026-02-20' },
  { id: 3, name: 'James Wilson', email: 'james.w@company.com', role: 'analyst', status: 'active', lastLogin: '3 hours ago', created: '2026-03-10' },
  { id: 4, name: 'Maria Garcia', email: 'maria.g@company.com', role: 'analyst', status: 'active', lastLogin: '5 hours ago', created: '2026-03-15' },
  { id: 5, name: 'Robert Kim', email: 'robert.k@company.com', role: 'viewer', status: 'inactive', lastLogin: '2 weeks ago', created: '2026-04-01' },
  { id: 6, name: 'Emily Taylor', email: 'emily.t@company.com', role: 'viewer', status: 'active', lastLogin: '1 hour ago', created: '2026-04-10' },
];

// Consistent, accessible role badges:
// Admin: blue/indigo | Manager: purple | Analyst: teal | Viewer: slate
const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40',
  manager: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  analyst: 'bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  editor: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  viewer: 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

interface UserKPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  surfaceGradient: string;
  borderColor: string;
  delay?: number;
}

function UserKPICard({
  title,
  value,
  change,
  changeLabel = 'vs prior period',
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  surfaceGradient,
  borderColor,
  delay = 0,
}: UserKPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.28, 0.11, 0.32, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'p-5 relative overflow-hidden group cursor-default h-full flex flex-col justify-between min-h-[136px] rounded-2xl',
        'bg-white dark:bg-ds-surface border shadow-2xs hover:shadow-md transition-all duration-200',
        borderColor
      )}
    >
      {/* Subtle tinted gradient surface overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity',
          surfaceGradient
        )}
      />

      <div className="flex items-start justify-between relative z-10 w-full gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-ds-text-muted uppercase tracking-wider mb-2 truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-[26px] font-bold font-sans tabular-nums tracking-tight text-slate-900 dark:text-ds-text-primary leading-none">
            {value}
          </p>

          {change !== undefined ? (
            <div className="flex items-center gap-1.5 mt-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums border shadow-2xs bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-ds-green-surface dark:text-ds-green-text dark:border-ds-green/20">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                +{change.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500 dark:text-ds-text-muted font-medium truncate">
                {changeLabel}
              </span>
            </div>
          ) : sub ? (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-ds-border-control" />
              <span className="text-xs font-medium text-slate-500 dark:text-ds-text-muted truncate">
                {sub}
              </span>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 border',
            iconBg
          )}
        >
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('df_users');
    if (saved) return JSON.parse(saved);
    return initialUsers;
  });

  useEffect(() => {
    localStorage.setItem('df_users', JSON.stringify(users));
  }, [users]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'viewer' });
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;
    const user: User = {
      id: Date.now(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: 'active',
      lastLogin: 'Never',
      created: new Date().toISOString().split('T')[0],
    };
    setUsers([...users, user]);
    setNewUser({ name: '', email: '', role: 'viewer' });
    setShowAddModal(false);
    showToast(`User "${user.name}" created successfully`);
  };

  const handleToggleStatus = (id: number) => {
    setUsers(
      users.map((u) =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
      )
    );
    setMenuOpen(null);
    showToast('User status updated');
  };

  const handleDeleteUser = (id: number) => {
    const user = users.find((u) => u.id === id);
    setUsers(users.filter((u) => u.id !== id));
    setMenuOpen(null);
    showToast(`User "${user?.name}" removed`);
  };

  const activeCount = users.filter((u) => u.status === 'active').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* ── Toast Notification ───────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-emerald-50/95 text-emerald-800 border border-emerald-200/90 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800/60 text-xs font-semibold flex items-center gap-2.5 shadow-xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add User Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="p-6 w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-ds-text">
                      Add New User
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Create platform account credentials
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-ds-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    type="email"
                    placeholder="alex@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-ds-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Platform Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-ds-text focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  >
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="analyst">Analyst (Simulations &amp; Reports)</option>
                    <option value="manager">Manager (Inventory &amp; Approvals)</option>
                    <option value="admin">Admin (Full Control)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleAddUser}
                    disabled={!newUser.name || !newUser.email}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm &amp; Add User
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. PAGE HEADER (with Subtle Blue/Indigo Accent) ───────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
        {/* Subtle decorative blue-to-indigo gradient glow */}
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 inline-block" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-ds-text tracking-tight">
                User Management
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-ds-text-secondary mt-0.5 ml-3.5 font-medium">
              Manage platform users, roles, and operational permissions
            </p>
          </div>
        </div>

        {/* Premium Primary Action: Add User Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="relative h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 text-white shadow-2xs transition-all duration-150 active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1"
        >
          <UserPlus className="w-3.5 h-3.5 text-white" />
          <span>Add User</span>
        </button>
      </motion.div>

      {/* ── 2. KPI CARDS (Blue, Emerald, Indigo, Teal) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users - Blue */}
        <UserKPICard
          title="Total Users"
          value={String(users.length)}
          sub="All registered accounts"
          icon={Users}
          iconBg="bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40"
          iconColor="text-blue-600 dark:text-blue-400"
          surfaceGradient="from-blue-500/10 via-white to-transparent dark:from-blue-950/20 dark:via-ds-surface dark:to-transparent"
          borderColor="border-slate-200/90 dark:border-ds-border hover:border-blue-300/80 dark:hover:border-blue-700/60"
          delay={0}
        />

        {/* Active Users - Emerald */}
        <UserKPICard
          title="Active Users"
          value={String(activeCount)}
          sub={`${Math.round((activeCount / Math.max(1, users.length)) * 100)}% active rate`}
          icon={Users}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
          surfaceGradient="from-emerald-500/10 via-white to-transparent dark:from-emerald-950/20 dark:via-ds-surface dark:to-transparent"
          borderColor="border-slate-200/90 dark:border-ds-border hover:border-emerald-300/80 dark:hover:border-emerald-700/60"
          delay={0.05}
        />

        {/* Admin Users - Indigo */}
        <UserKPICard
          title="Admin Users"
          value={String(adminCount)}
          sub="Full platform permissions"
          icon={Shield}
          iconBg="bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/40"
          iconColor="text-indigo-600 dark:text-indigo-400"
          surfaceGradient="from-indigo-500/10 via-white to-transparent dark:from-indigo-950/20 dark:via-ds-surface dark:to-transparent"
          borderColor="border-slate-200/90 dark:border-ds-border hover:border-indigo-300/80 dark:hover:border-indigo-700/60"
          delay={0.1}
        />

        {/* New This Month - Teal */}
        <UserKPICard
          title="New This Month"
          value="2"
          change={100}
          changeLabel="growth velocity"
          icon={UserPlus}
          iconBg="bg-teal-50 dark:bg-teal-950/50 border-teal-100 dark:border-teal-900/40"
          iconColor="text-teal-600 dark:text-teal-400"
          surfaceGradient="from-teal-500/10 via-white to-transparent dark:from-teal-950/20 dark:via-ds-surface dark:to-transparent"
          borderColor="border-slate-200/90 dark:border-ds-border hover:border-teal-300/80 dark:hover:border-teal-700/60"
          delay={0.15}
        />
      </div>

      {/* ── 3. USER TABLE ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden"
      >
        {/* Table Top Bar: Title & Search */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-slate-100 dark:border-ds-border bg-gradient-to-r from-slate-50/70 via-white to-white dark:from-ds-surface-sunken/40 dark:via-ds-surface dark:to-ds-surface flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-ds-text-primary tracking-tight">
              All Platform Users
            </h3>
            <p className="text-xs text-slate-500 dark:text-ds-text-muted mt-0.5 font-medium">
              Showing {filteredUsers.length} of {users.length} registered accounts
            </p>
          </div>

          {/* Search Input with high contrast & accessible focus ring */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-ds-surface-sunken border border-slate-200/90 dark:border-ds-border text-slate-900 dark:text-ds-text placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[680px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-ds-border bg-slate-50/80 dark:bg-ds-surface-sunken/50">
                {['User', 'Role', 'Status', 'Last Login', 'Created', ''].map((h, idx) => (
                  <th
                    key={h || `header-${idx}`}
                    className="px-5 py-3 text-[11px] font-bold text-slate-600 dark:text-ds-text-secondary uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No users found matching &ldquo;{searchTerm}&rdquo;
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 + i * 0.02 }}
                    className="border-b border-slate-100/80 dark:border-ds-border/40 even:bg-slate-50/30 dark:even:bg-ds-surface-sunken/20 hover:bg-blue-50/40 dark:hover:bg-ds-surface-sunken/50 transition-colors"
                  >
                    {/* User Identity (Avatar, Name, Email) */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40 flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-ds-text leading-tight">
                            {u.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-ds-text-secondary flex items-center gap-1 mt-0.5 font-medium">
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge (Admin: blue/indigo, Manager: purple, Analyst: teal, Viewer: slate) */}
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-2xs',
                          roleBadgeStyles[u.role] || roleBadgeStyles.viewer
                        )}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Status Badge (Active: green accent, Inactive: neutral gray) */}
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border shadow-2xs',
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                            : 'bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            u.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          )}
                        />
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-ds-text-secondary font-medium tabular-nums">
                      {u.lastLogin}
                    </td>

                    {/* Created Date */}
                    <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-ds-text-secondary font-medium tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {u.created}
                      </span>
                    </td>

                    {/* Row Action Menu */}
                    <td className="px-5 py-3.5 text-right relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                        className="w-8 h-8 rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {menuOpen === u.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-5 top-full mt-1 w-44 bg-white dark:bg-slate-900 py-1 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden"
                          >
                            <button
                              onClick={() => handleToggleStatus(u.id)}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition"
                            >
                              {u.status === 'active' ? (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Deactivate Account</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Activate Account</span>
                                </>
                              )}
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-800 my-0.5" />
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete User</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
