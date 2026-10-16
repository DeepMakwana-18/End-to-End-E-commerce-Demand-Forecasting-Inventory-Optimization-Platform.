/** Admin - User Management Page. */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Shield, Search, MoreVertical, Mail, Calendar, X, CheckCircle2 } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';

const initialUsers = [
  { id: 1, name: 'Admin User', email: 'admin@demandforecaster.com', role: 'admin', status: 'active', lastLogin: '2 hours ago', created: '2026-01-15' },
  { id: 2, name: 'Sarah Chen', email: 'sarah.chen@company.com', role: 'manager', status: 'active', lastLogin: '1 day ago', created: '2026-02-20' },
  { id: 3, name: 'James Wilson', email: 'james.w@company.com', role: 'analyst', status: 'active', lastLogin: '3 hours ago', created: '2026-03-10' },
  { id: 4, name: 'Maria Garcia', email: 'maria.g@company.com', role: 'analyst', status: 'active', lastLogin: '5 hours ago', created: '2026-03-15' },
  { id: 5, name: 'Robert Kim', email: 'robert.k@company.com', role: 'viewer', status: 'inactive', lastLogin: '2 weeks ago', created: '2026-04-01' },
  { id: 6, name: 'Emily Taylor', email: 'emily.t@company.com', role: 'viewer', status: 'active', lastLogin: '1 hour ago', created: '2026-04-10' },
];

const roleBadge: Record<string, string> = {
  admin: 'bg-ds-blue-action/10 text-ds-blue-action border-ds-blue-action/25',
  manager: 'bg-ds-purple-ai/10 text-ds-purple-ai border-ds-purple-ai/25',
  analyst: 'bg-ds-teal-teal/10 text-ds-teal-teal border-ds-teal-teal/25',
  editor: 'bg-ds-purple-ai/10 text-ds-purple-ai border-ds-purple-ai/25',
  viewer: 'bg-ds-surface-sunken text-ds-text-secondary border-ds-border-subtle',
};

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  created: string;
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
    return users.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;
    const user = {
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
    showToast(`✅ User "${user.name}" added successfully`);
  };

  const handleToggleStatus = (id: number) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
    setMenuOpen(null);
    showToast('✅ User status updated');
  };

  const handleDeleteUser = (id: number) => {
    const user = users.find(u => u.id === id);
    setUsers(users.filter(u => u.id !== id));
    setMenuOpen(null);
    showToast(`🗑️ User "${user?.name}" removed`);
  };

  const activeCount = users.filter(u => u.status === 'active').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-full card-raised-3 !bg-ds-emerald-success/15 !border-ds-emerald-success/30 text-ds-emerald-success text-sm font-medium flex items-center gap-2 shadow-2xl">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card-raised-2 p-6 w-full max-w-md mx-4 rounded-2xl border border-ds-border-subtle" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-ds-text">Add New User</h3>
                <button onClick={() => setShowAddModal(false)} className="text-ds-text-secondary hover:text-ds-text p-1 rounded-full hover:bg-ds-surface-sunken transition"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ds-text-secondary mb-1.5">Full Name</label>
                  <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Doe" className="w-full px-4 py-2.5 rounded-xl text-sm bg-ds-surface-sunken border border-ds-border text-ds-text placeholder:text-ds-text-muted focus:outline-none focus:ring-2 focus:ring-ds-blue-action/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ds-text-secondary mb-1.5">Email Address</label>
                  <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} type="email"
                    placeholder="john@company.com" className="w-full px-4 py-2.5 rounded-xl text-sm bg-ds-surface-sunken border border-ds-border text-ds-text placeholder:text-ds-text-muted focus:outline-none focus:ring-2 focus:ring-ds-blue-action/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ds-text-secondary mb-1.5">Role</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-ds-surface-sunken border border-ds-border text-ds-text focus:outline-none focus:ring-2 focus:ring-ds-blue-action/30">
                    <option value="viewer">Viewer</option>
                    <option value="analyst">Analyst</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button onClick={handleAddUser} disabled={!newUser.name || !newUser.email}
                  className="w-full py-2.5 rounded-full btn-apple btn-apple-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                  Add User
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ds-text tracking-tight">User Management</h1>
          <p className="text-sm text-ds-text-secondary mt-1">Manage users, roles, and permissions</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="btn-apple btn-apple-primary text-xs h-9 px-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Users" value={String(users.length)} icon={Users} gradient="bg-ds-blue-action" delay={0} />
        <KPICard title="Active Users" value={String(activeCount)} icon={Users} gradient="bg-ds-emerald-success" delay={0.05} />
        <KPICard title="Admin Users" value={String(adminCount)} icon={Shield} gradient="bg-ds-purple-ai" delay={0.1} />
        <KPICard title="New This Month" value="2" change={100} icon={UserPlus} gradient="bg-ds-teal-teal" delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="card-raised-1 overflow-hidden rounded-2xl">
        <div className="p-4 border-b border-ds-border-subtle flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-ds-text">All Users <span className="text-ds-text-secondary font-normal">({filteredUsers.length})</span></h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-muted" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..." className="w-full pl-9 pr-4 py-1.5 rounded-full text-xs bg-ds-surface-sunken border border-ds-border text-ds-text placeholder:text-ds-text-muted focus:outline-none focus:ring-2 focus:ring-ds-blue-action/30 transition" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ds-border-subtle bg-ds-surface-sunken/40">
                {['User', 'Role', 'Status', 'Last Login', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-ds-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ds-text-muted">No users found matching "{searchTerm}"</td></tr>
              ) : filteredUsers.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.03 }}
                  className="border-b border-ds-border-subtle/50 hover:bg-ds-surface-sunken/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ds-blue-action/15 text-ds-blue-action flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium text-ds-text">{u.name}</p>
                        <p className="text-[11px] text-ds-text-secondary flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border', roleBadge[u.role] || roleBadge.viewer)}>{u.role}</span></td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
                      u.status === 'active' ? 'bg-ds-emerald-success/10 text-ds-emerald-success' : 'bg-ds-surface-sunken text-ds-text-muted')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', u.status === 'active' ? 'bg-ds-emerald-success' : 'bg-ds-text-muted')} />
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ds-text-secondary">{u.lastLogin}</td>
                  <td className="px-4 py-3 text-xs text-ds-text-secondary"><span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-ds-text-muted" />{u.created}</span></td>
                  <td className="px-4 py-3 relative">
                    <button onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                      className="p-1.5 rounded-full text-ds-text-secondary hover:text-ds-text hover:bg-ds-surface-sunken transition">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {menuOpen === u.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-4 top-full mt-1 w-40 card-raised-2 py-1 rounded-xl shadow-xl border border-ds-border-subtle z-50">
                          <button onClick={() => handleToggleStatus(u.id)}
                            className="w-full text-left px-4 py-2 text-xs text-ds-text hover:bg-ds-surface-sunken transition">
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => handleDeleteUser(u.id)}
                            className="w-full text-left px-4 py-2 text-xs text-ds-red-danger hover:bg-ds-red-danger/10 transition">
                            Delete User
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
