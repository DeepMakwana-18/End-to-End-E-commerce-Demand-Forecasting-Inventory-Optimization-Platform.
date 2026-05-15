/** Admin - User Management Page. */

import { useState, useMemo } from 'react';
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
  admin: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  manager: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
  analyst: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  viewer: 'bg-surface-700/50 text-surface-400 border-surface-600/50',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState(initialUsers);
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
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl glass-card !bg-accent-500/10 !border-accent-500/30 text-accent-400 text-sm font-medium flex items-center gap-2 shadow-2xl">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white">Add New User</h3>
                <button onClick={() => setShowAddModal(false)} className="text-surface-500 hover:text-surface-300"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">Full Name</label>
                  <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Doe" className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-800/50 border border-surface-700/50 text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">Email Address</label>
                  <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} type="email"
                    placeholder="john@company.com" className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-800/50 border border-surface-700/50 text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">Role</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-800/50 border border-surface-700/50 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                    <option value="viewer">Viewer</option>
                    <option value="analyst">Analyst</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button onClick={handleAddUser} disabled={!newUser.name || !newUser.email}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold gradient-primary text-white shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  Add User
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-sm text-surface-500 mt-1">Manage users, roles, and permissions</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold gradient-primary text-white shadow-lg shadow-primary-500/20">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Users" value={String(users.length)} icon={Users} gradient="gradient-primary" delay={0} />
        <KPICard title="Active Users" value={String(activeCount)} icon={Users} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Admin Users" value={String(adminCount)} icon={Shield} gradient="gradient-warning" delay={0.1} />
        <KPICard title="New This Month" value="2" change={100} icon={UserPlus} gradient="bg-cyan-500" delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-800/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-200">All Users <span className="text-surface-500 font-normal">({filteredUsers.length})</span></h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..." className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-surface-800/50 border border-surface-700/50 text-surface-300 placeholder:text-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500/30" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-800/50 bg-surface-900/50">
                {['User', 'Role', 'Status', 'Last Login', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-surface-500">No users found matching "{searchTerm}"</td></tr>
              ) : filteredUsers.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.03 }}
                  className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium text-surface-200">{u.name}</p>
                        <p className="text-[11px] text-surface-500 flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={cn('px-2 py-1 rounded-md text-[10px] font-bold uppercase border', roleBadge[u.role])}>{u.role}</span></td>
                  <td className="px-4 py-3">
                    <span className={cn('flex items-center gap-1.5 text-xs font-medium',
                      u.status === 'active' ? 'text-accent-400' : 'text-surface-500')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', u.status === 'active' ? 'bg-accent-400' : 'bg-surface-600')} />
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-400">{u.lastLogin}</td>
                  <td className="px-4 py-3 text-xs text-surface-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{u.created}</td>
                  <td className="px-4 py-3 relative">
                    <button onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800/60 transition">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {menuOpen === u.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-4 top-full mt-1 w-40 glass-card py-1 z-50">
                          <button onClick={() => handleToggleStatus(u.id)}
                            className="w-full text-left px-4 py-2 text-xs text-surface-300 hover:bg-surface-800/60 transition">
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => handleDeleteUser(u.id)}
                            className="w-full text-left px-4 py-2 text-xs text-danger-400 hover:bg-danger-500/10 transition">
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
