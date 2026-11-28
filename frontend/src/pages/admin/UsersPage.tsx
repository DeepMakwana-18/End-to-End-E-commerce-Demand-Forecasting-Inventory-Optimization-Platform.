/**
 * Titan AI — User Management Page (/app/admin/users)
 *
 * Refined with Titan AI editorial design system:
 * - Warm paper / near-black surfaces, editorial header, blue primary actions, semantic status badges.
 * - Truthful KPIs computed strictly from GET /users (no hardcoded "New This Month 2" or fake "+100%").
 * - Clarifies account enablement ("Active" = enabled access) vs sign-in history ("Last Login: Never").
 * - Accessible row actions ("Actions for <Name>") with Escape/outside-click dismissal, self-action guards,
 *   pending states, and authoritative server error handling (no silent localStorage fake-success fallbacks).
 * - Accessible Add User modal with form validation, server error placement, Escape handling, and focus management.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  UserCheck,
  UserX,
  Trash2,
  HelpCircle,
  Clock,
  RotateCcw,
  Check,
  Lock,
  Edit2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/services/api';
import { useAppStore } from '@/stores/appStore';
import { PageHeader } from '@/components/ui/PageHeader';
import '@/styles/titan-dashboard.css';

interface UserModel {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  hasSignedIn: boolean;
  created: string;
  createdMonthKey: string;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full platform administration: models, configuration, users & security logs',
  org_admin: 'Full platform administration: models, configuration, users & security logs',
  super_admin: 'Global system administration: all tenants & infrastructure settings',
  manager: 'Operational management: inventory rules, approvals & threshold updates',
  analyst: 'Analytics execution: demand forecasting, scenario engine & report compiling',
  viewer: 'Read-only access: view dashboards, inventory summaries & predictions',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40',
  org_admin: 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40',
  super_admin: 'bg-[#eff6ff] text-[#1e3fc8] border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40',
  manager: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  analyst: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/50',
  viewer: 'bg-[#fafaf9] text-[#52525b] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]',
};

const formatRoleLabel = (role: string) => {
  if (role === 'org_admin' || role === 'super_admin') return 'Admin';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
};

interface UserKPICardProps {
  title: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  tooltipText: string;
  emphasized?: boolean;
  delayMs?: number;
}

function UserKPICard({
  title,
  value,
  sub,
  icon: Icon,
  iconColor,
  tooltipText,
  emphasized = false,
  delayMs = 0,
}: UserKPICardProps) {
  return (
    <div
      style={{ '--reveal-delay': `${delayMs}ms` } as React.CSSProperties}
      className={cn(
        'titan-dash-reveal titan-kpi-wrap',
        emphasized && 'titan-kpi-wrap--emphasized'
      )}
    >
      <div className="titan-kpi-card rounded-[16px] p-5 border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] flex flex-col justify-between min-h-[144px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.08em] truncate">
                {title}
              </p>
              <span
                className="text-[#52525b]/70 hover:text-[#0a0a0a] dark:text-[#a1a1aa]/70 dark:hover:text-[#fafaf9] cursor-help flex-shrink-0"
                title={tooltipText}
                aria-label={tooltipText}
              >
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </div>
            <p className="text-2xl sm:text-[28px] font-extrabold font-sans tabular-nums tracking-tight leading-none text-[#0a0a0a] dark:text-[#fafaf9]">
              {value}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-center flex-shrink-0">
            <Icon className={cn('w-4.5 h-4.5', iconColor)} aria-hidden="true" />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] leading-snug">
          {sub}
        </p>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const currentUser = useAppStore((s) => s.user);
  const canManageUsers =
    !currentUser ||
    ['admin', 'org_admin', 'super_admin'].includes((currentUser.role || '').toLowerCase());

  const menuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'viewer', password: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  // Real backend query for tenant users
  const {
    data: apiUsers,
    isLoading,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
    staleTime: 30_000,
  });

  const users: UserModel[] = useMemo(() => {
    if (!apiUsers || !Array.isArray(apiUsers)) return [];
    return apiUsers.map((u) => {
      const createdIso = u.created_at ? new Date(u.created_at) : null;
      const createdValid = createdIso && !Number.isNaN(createdIso.getTime());
      const createdDateStr = createdValid ? createdIso.toISOString().split('T')[0] : '—';
      const createdMonthKey = createdValid
        ? `${createdIso.getFullYear()}-${String(createdIso.getMonth() + 1).padStart(2, '0')}`
        : '';

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.is_active ? 'active' : 'inactive',
        lastLogin: u.last_login_at
          ? new Date(u.last_login_at).toLocaleDateString()
          : 'Never',
        hasSignedIn: Boolean(u.last_login_at),
        created: createdDateStr,
        createdMonthKey,
      };
    });
  }, [apiUsers]);

  // Close menus & modals on Escape or outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
        setConfirmingDeleteId(null);
        setEditingRoleId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpenId !== null) {
          setMenuOpenId(null);
          setConfirmingDeleteId(null);
          setEditingRoleId(null);
        } else if (showAddModal) {
          setShowAddModal(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpenId, showAddModal]);

  useEffect(() => {
    if (showAddModal) {
      window.setTimeout(() => nameInputRef.current?.focus(), 40);
    }
  }, [showAddModal]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all') {
        const normalizedRole =
          u.role === 'org_admin' || u.role === 'super_admin' ? 'admin' : u.role;
        if (normalizedRole.toLowerCase() !== roleFilter.toLowerCase()) return false;
      }
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesRole = u.role.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchTerm]);

  // Authoritative Mutations (no silent fake-success fallbacks)
  const createMutation = useMutation({
    mutationFn: (data: { name: string; email: string; role: string; password?: string }) =>
      usersApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', role: 'viewer', password: '' });
      setFormError(null);
      showToast(`User "${res.data.name}" created successfully`);
    },
    onError: (err: unknown) => {
      const msg = getApiErrorMessage(err, 'Failed to create user account.');
      setFormError(msg);
      showToast(msg, true);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => usersApi.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setMenuOpenId(null);
      showToast('Account access status updated');
    },
    onError: (err: unknown) => {
      const msg = getApiErrorMessage(err, 'Could not update account status.');
      showToast(msg, true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmingDeleteId(null);
      setMenuOpenId(null);
      showToast('User removed from organization');
    },
    onError: (err: unknown) => {
      const msg = getApiErrorMessage(err, 'Could not delete user account.');
      setConfirmingDeleteId(null);
      showToast(msg, true);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      usersApi.update(id, { role: role as 'viewer' | 'analyst' | 'org_admin' | 'super_admin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingRoleId(null);
      setMenuOpenId(null);
      showToast('User role updated');
    },
    onError: (err: unknown) => {
      const msg = getApiErrorMessage(err, 'Could not update user role.');
      showToast(msg, true);
    },
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newUser.name.trim();
    const trimmedEmail = newUser.email.trim();

    if (!trimmedName) {
      setFormError('Full name is required.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Enter a valid email address.');
      return;
    }

    setFormError(null);
    const roleToSend = newUser.role === 'admin' ? 'org_admin' : newUser.role;
    createMutation.mutate({
      name: trimmedName,
      email: trimmedEmail,
      role: roleToSend,
      password: newUser.password || 'TitanSecure2026!',
    });
  };

  const activeCount = users.filter((u) => u.status === 'active').length;
  const enabledPct = users.length > 0 ? Math.round((activeCount / users.length) * 100) : 0;
  const adminCount = users.filter(
    (u) => u.role === 'admin' || u.role === 'org_admin' || u.role === 'super_admin'
  ).length;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const newThisMonthCount = users.filter((u) => u.createdMonthKey === currentMonthKey).length;

  const activeFilterCount =
    (roleFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const isRowMutating =
    toggleStatusMutation.isPending ||
    deleteMutation.isPending ||
    updateRoleMutation.isPending;

  return (
    <div className="space-y-5 sm:space-y-6 pb-4">
      {/* ── Toast Notification ───────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.16 }}
            className={cn(
              'fixed top-4 right-4 z-50 px-4 py-3 rounded-[12px] text-xs font-semibold flex items-center gap-2.5 shadow-lg border max-w-sm',
              toast.isError
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
                : 'bg-white text-[#0a0a0a] border-[#e4e4e7] dark:bg-[#111113] dark:text-[#fafaf9] dark:border-[#27272a]'
            )}
          >
            {toast.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add User Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-user-modal-title"
              initial={prefersReducedMotion ? false : { scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="p-6 w-full max-w-md rounded-[16px] bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e4e4e7] dark:border-[#27272a]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-[#eff6ff] dark:bg-[#1e3fc8]/20 text-[#1e3fc8] dark:text-[#60a5fa] flex items-center justify-center border border-[#bfdbfe] dark:border-[#1e3fc8]/40">
                    <UserPlus className="w-4.5 h-4.5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="add-user-modal-title" className="text-base font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
                      Add New User
                    </h2>
                    <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-medium">
                      Provision platform account &amp; assign role permissions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close Add User dialog"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#52525b] hover:text-[#0a0a0a] hover:bg-[#fafaf9] dark:text-[#a1a1aa] dark:hover:bg-[#18181b] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleAddUser} noValidate className="space-y-4">
                {formError && (
                  <div
                    role="alert"
                    className="p-3 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="add-user-name" className="block text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1.5">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    id="add-user-name"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-[10px] text-xs bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#52525b] dark:placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20"
                  />
                </div>

                <div>
                  <label htmlFor="add-user-email" className="block text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1.5">
                    Email Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="add-user-email"
                    required
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="alex@company.com"
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-[10px] text-xs bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#52525b] dark:placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20"
                  />
                </div>

                <div>
                  <label htmlFor="add-user-role" className="block text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1.5">
                    Platform Role &amp; Permissions
                  </label>
                  <select
                    id="add-user-role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-[10px] text-xs bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20"
                  >
                    <option value="viewer">Viewer — Read-only dashboards &amp; reports</option>
                    <option value="analyst">Analyst — Demand forecasts, reports &amp; simulations</option>
                    <option value="manager">Manager — Inventory approvals &amp; reorder points</option>
                    <option value="admin">Admin — Full organization control &amp; user management</option>
                  </select>
                  <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa] mt-1.5 leading-snug">
                    {ROLE_DESCRIPTIONS[newUser.role] || 'Assigned platform capabilities'}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="add-user-password"
                    className="block text-xs font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1.5 flex items-center justify-between"
                  >
                    <span>Initial Temporary Password</span>
                    <span className="text-[10px] font-normal text-[#52525b] dark:text-[#a1a1aa]">
                      Optional (defaults to initial key)
                    </span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] dark:text-[#a1a1aa]" aria-hidden="true" />
                    <input
                      id="add-user-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Leave blank for default temporary password"
                      className="w-full min-h-[40px] pl-9 pr-3.5 py-2 rounded-[10px] text-xs bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#52525b] dark:placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-1/3 min-h-[42px] rounded-[10px] text-xs font-semibold text-[#0a0a0a] dark:text-[#fafaf9] bg-[#fafaf9] hover:bg-[#e4e4e7]/60 dark:bg-[#18181b] dark:hover:bg-[#27272a] border border-[#e4e4e7] dark:border-[#27272a] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 min-h-[42px] rounded-[10px] text-xs font-semibold text-white bg-[#1e3fc8] hover:bg-[#1935a8] transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        <span>Creating User...</span>
                      </>
                    ) : (
                      <span>Confirm &amp; Add User</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title="User Management"
        description="Manage organization accounts, role-based access control, and sign-in enablement"
        actions={
          canManageUsers ? (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setShowAddModal(true);
              }}
              className="min-h-[40px] sm:min-h-[38px] px-4 rounded-[10px] text-xs font-semibold inline-flex items-center gap-2 text-white bg-ds-blue hover:bg-ds-blue-strong transition-colors focus-visible:outline-2 focus-visible:outline-ds-blue focus-visible:outline-offset-2 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add User</span>
            </button>
          ) : undefined
        }
      />

      {/* ── 2. Honest KPI Summary Strip ──────────────────────────────── */}
      <section aria-label="User Account Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UserKPICard
          title="Total Users"
          value={isLoading ? '—' : String(users.length)}
          sub="Registered accounts in organization"
          icon={Users}
          iconColor="text-[#1e3fc8] dark:text-[#60a5fa]"
          tooltipText="Total user accounts returned by GET /users for this tenant"
          emphasized={true}
          delayMs={30}
        />

        <UserKPICard
          title="Enabled Accounts"
          value={isLoading ? '—' : String(activeCount)}
          sub={
            users.length > 0
              ? `${enabledPct}% of accounts have sign-in access enabled`
              : 'No registered accounts'
          }
          icon={UserCheck}
          iconColor="text-emerald-600 dark:text-emerald-400"
          tooltipText="Accounts with is_active=true (enabled for sign-in; distinct from whether they have logged in)"
          delayMs={60}
        />

        <UserKPICard
          title="Admin Users"
          value={isLoading ? '—' : String(adminCount)}
          sub="Full platform administration permissions"
          icon={Shield}
          iconColor="text-amber-600 dark:text-amber-400"
          tooltipText="Accounts holding admin, org_admin, or super_admin roles"
          delayMs={90}
        />

        <UserKPICard
          title="New This Month"
          value={isLoading ? '—' : String(newThisMonthCount)}
          sub={`Created in ${currentMonthLabel}`}
          icon={UserPlus}
          iconColor="text-teal-600 dark:text-teal-400"
          tooltipText="Accounts whose created_at timestamp falls in the current local calendar month"
          delayMs={120}
        />
      </section>

      {/* ── 3. User Registry Table / Mobile Cards ────────────────────── */}
      <section
        aria-label="Organization User Directory"
        className="rounded-[16px] border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden"
      >
        {/* Top Bar */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9]/70 dark:bg-[#18181b]/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] tracking-tight">
                All Platform Users
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-[#111113] text-[#52525b] dark:text-[#a1a1aa] border border-[#e4e4e7] dark:border-[#27272a]">
                {users.length} registered
              </span>
            </div>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] mt-0.5 font-medium tabular-nums">
              Showing {filteredUsers.length} of {users.length} {users.length === 1 ? 'account' : 'accounts'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Role Filter Tabs */}
            <div
              role="group"
              aria-label="Filter users by role"
              className="flex items-center flex-wrap p-0.5 rounded-[10px] bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-xs"
            >
              {['all', 'admin', 'analyst', 'viewer'].map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={roleFilter === r}
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    'min-h-[34px] px-2.5 py-1 rounded-[8px] font-semibold capitalize transition-colors cursor-pointer',
                    roleFilter === r
                      ? 'bg-[#0a0a0a] text-[#fafaf9] dark:bg-[#fafaf9] dark:text-[#0a0a0a]'
                      : 'text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-[#fafaf9]'
                  )}
                >
                  {r === 'all' ? 'All Roles' : r}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b] dark:text-[#a1a1aa]" aria-hidden="true" />
              <input
                type="text"
                aria-label="Search users by name, email, or role"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email, role..."
                className="w-full min-h-[38px] pl-8 pr-8 py-1.5 rounded-[10px] text-xs bg-white dark:bg-[#111113] border border-[#e4e4e7] dark:border-[#27272a] text-[#0a0a0a] dark:text-[#fafaf9] placeholder:text-[#52525b] dark:placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear user search"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading / Error / Empty / Table States */}
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1e3fc8] mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa]">
              Loading organization users...
            </p>
          </div>
        ) : isUsersError ? (
          <div className="p-10 text-center space-y-2.5">
            <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9]">
              Unable to load user directory
            </p>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] max-w-md mx-auto">
              {getApiErrorMessage(usersError, 'Admin authorization or API connectivity is required to view tenant users.')}
            </p>
            <button
              type="button"
              onClick={() => refetchUsers()}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] text-[#0a0a0a] dark:text-[#fafaf9] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] mb-1">
              No users match your criteria
            </p>
            <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] max-w-sm mx-auto">
              Try adjusting your search query or role filter.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-[10px] text-xs font-semibold bg-[#fafaf9] hover:bg-[#e4e4e7]/60 text-[#0a0a0a] dark:bg-[#18181b] dark:hover:bg-[#27272a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reset filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b]/60">
                    {['User', 'Role & Permissions', 'Account Access', 'Last Login', 'Created', ...(canManageUsers ? ['Actions'] : [])].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className={cn(
                          'px-5 py-3 text-[11px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-[0.06em]',
                          h === 'Actions' && 'text-right'
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                  {filteredUsers.map((u) => {
                    const roleKey = u.role.toLowerCase();
                    const roleTooltip = ROLE_DESCRIPTIONS[roleKey] || 'Platform user permissions';
                    const isSelf = currentUser?.id === u.id;
                    const isMenuOpen = menuOpenId === u.id;

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-[#fafaf9] dark:hover:bg-[#18181b]/40 transition-colors duration-150"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[10px] bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] leading-tight flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#fafaf9] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa]">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] flex items-center gap-1 mt-0.5 font-medium">
                                <Mail className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[240px]">{u.email}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-help',
                              ROLE_BADGE_STYLES[roleKey] || ROLE_BADGE_STYLES.viewer
                            )}
                            title={roleTooltip}
                          >
                            {formatRoleLabel(u.role)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            title={
                              u.status === 'active'
                                ? 'Account is enabled and permitted to sign in'
                                : 'Account is deactivated and cannot sign in'
                            }
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border cursor-help',
                              u.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                                : 'bg-[#fafaf9] text-[#52525b] border-[#e4e4e7] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:border-[#27272a]'
                            )}
                          >
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                u.status === 'active' ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-[#52525b]'
                              )}
                              aria-hidden="true"
                            />
                            {u.status === 'active' ? 'Active (Enabled)' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium tabular-nums">
                          <div
                            className="flex items-center gap-1.5"
                            title={
                              u.hasSignedIn
                                ? 'Most recent authenticated session'
                                : 'Account is enabled, but no sign-in has been recorded yet'
                            }
                          >
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{u.hasSignedIn ? u.lastLogin : 'Never signed in'}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-xs text-[#52525b] dark:text-[#a1a1aa] font-medium tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{u.created}</span>
                          </span>
                        </td>

                        {canManageUsers && (
                          <td className="px-5 py-3.5 text-right relative">
                            <div className="inline-block relative" ref={isMenuOpen ? menuRef : undefined}>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenId(isMenuOpen ? null : u.id);
                                  setConfirmingDeleteId(null);
                                  setEditingRoleId(null);
                                }}
                                aria-label={`Actions for ${u.name}`}
                                aria-haspopup="menu"
                                aria-expanded={isMenuOpen}
                                className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-[#52525b] hover:text-[#0a0a0a] hover:bg-[#fafaf9] dark:text-[#a1a1aa] dark:hover:text-[#fafaf9] dark:hover:bg-[#18181b] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8] cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" aria-hidden="true" />
                              </button>

                              <AnimatePresence>
                                {isMenuOpen && (
                                  <motion.div
                                    role="menu"
                                    aria-label={`Actions for ${u.name}`}
                                    initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-full mt-1 w-56 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#111113] py-1.5 rounded-[14px] shadow-xl border border-[#e4e4e7] dark:border-[#27272a] z-50 text-left"
                                  >
                                    <div className="px-3.5 py-1.5 border-b border-[#e4e4e7] dark:border-[#27272a] text-[11px] text-[#52525b] dark:text-[#a1a1aa] font-semibold truncate">
                                      {u.name}
                                    </div>

                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={isSelf || isRowMutating}
                                      onClick={() => toggleStatusMutation.mutate(u.id)}
                                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#0a0a0a] dark:text-[#fafaf9] hover:bg-[#fafaf9] dark:hover:bg-[#18181b] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                                    >
                                      {u.status === 'active' ? (
                                        <>
                                          <UserX className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                                          <span>{isSelf ? 'Cannot deactivate self' : 'Deactivate Account'}</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                          <span>Activate Account</span>
                                        </>
                                      )}
                                    </button>

                                    {editingRoleId === u.id ? (
                                      <div className="p-2 bg-[#fafaf9] dark:bg-[#18181b] border-y border-[#e4e4e7] dark:border-[#27272a] space-y-1">
                                        <span className="text-[10px] font-bold text-[#52525b] dark:text-[#a1a1aa] uppercase tracking-wider block px-1">
                                          Assign Role
                                        </span>
                                        {['admin', 'manager', 'analyst', 'viewer'].map((r) => (
                                          <button
                                            key={r}
                                            type="button"
                                            disabled={isRowMutating}
                                            onClick={() =>
                                              updateRoleMutation.mutate({
                                                id: u.id,
                                                role: r === 'admin' ? 'org_admin' : r,
                                              })
                                            }
                                            className="w-full text-left px-2 py-1.5 rounded-[8px] text-xs font-medium capitalize flex items-center justify-between hover:bg-white dark:hover:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] cursor-pointer disabled:opacity-50"
                                          >
                                            <span>{r}</span>
                                            {(u.role === r || (r === 'admin' && u.role === 'org_admin')) && (
                                              <Check className="w-3 h-3 text-[#1e3fc8]" aria-hidden="true" />
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={isRowMutating}
                                        onClick={() => setEditingRoleId(u.id)}
                                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#0a0a0a] dark:text-[#fafaf9] hover:bg-[#fafaf9] dark:hover:bg-[#18181b] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-[#1e3fc8] dark:text-[#60a5fa]" aria-hidden="true" />
                                        <span>Change Role...</span>
                                      </button>
                                    )}

                                    <div className="border-t border-[#e4e4e7] dark:border-[#27272a] my-1" />

                                    {confirmingDeleteId === u.id ? (
                                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-center space-y-2">
                                        <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                                          Permanently delete {u.name}?
                                        </p>
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => deleteMutation.mutate(u.id)}
                                            className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                                          >
                                            {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmingDeleteId(null)}
                                            className="px-2 py-1 rounded-[6px] text-[11px] font-medium text-[#52525b] hover:text-[#0a0a0a] dark:text-[#a1a1aa] cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={isSelf || isRowMutating}
                                        onClick={() => setConfirmingDeleteId(u.id)}
                                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                        <span>{isSelf ? 'Cannot delete self' : 'Delete User'}</span>
                                      </button>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (<768px) */}
            <div className="md:hidden divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
              {filteredUsers.map((u) => {
                const roleKey = u.role.toLowerCase();
                const isSelf = currentUser?.id === u.id;
                return (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0a0a0a] dark:text-[#fafaf9] break-words">
                          {u.name} {isSelf && '(You)'}
                        </p>
                        <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] break-all">
                          {u.email}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0',
                          ROLE_BADGE_STYLES[roleKey] || ROLE_BADGE_STYLES.viewer
                        )}
                      >
                        {formatRoleLabel(u.role)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
                      <span>
                        {u.status === 'active' ? 'Active (Enabled)' : 'Inactive'} ·{' '}
                        {u.hasSignedIn ? `Login: ${u.lastLogin}` : 'Never signed in'}
                      </span>
                      <span>Created: {u.created}</span>
                    </div>

                    {canManageUsers && !isSelf && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isRowMutating}
                          onClick={() => toggleStatusMutation.mutate(u.id)}
                          className="min-h-[40px] flex-1 px-3 rounded-[8px] border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafaf9] dark:bg-[#18181b] text-xs font-semibold text-[#0a0a0a] dark:text-[#fafaf9] cursor-pointer"
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          disabled={isRowMutating}
                          onClick={() => {
                            setMenuOpenId(u.id);
                            setConfirmingDeleteId(u.id);
                          }}
                          className="min-h-[40px] px-3 rounded-[8px] border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
