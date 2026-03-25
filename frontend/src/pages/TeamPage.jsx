import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, User, Mail, Shield, X, Plus, ArrowUpDown,
  ChevronDown, LayoutGrid, BarChart3, ListTodo, Clock,
  CheckCircle2, AlertTriangle, FolderOpen, Calendar, Copy,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import clsx from 'clsx';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageTransition from '../components/common/PageTransition';
import Skeleton from '../components/common/Skeleton';
import { useAuthStore } from '../store/authStore';
import NewTaskModal from '../components/shared/NewTaskModal';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'tasks', label: 'Most Tasks' },
  { value: 'active', label: 'Recently Active' },
];

// ── Member Profile Panel (slide-in drawer) ─────────────────────
const MemberProfilePanel = ({ member, onClose, onAssignTask }) => {
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const mid = member.id;
    api.get('/activities', { params: { userId: mid, limit: 5 } }).then((r) => setActivities(r.data.activities || [])).catch(() => {});
    api.get('/projects').then((r) => {
      const all = Array.isArray(r.data.data || r.data) ? (r.data.data || r.data) : [];
      setProjects(all.filter((p) => p.members?.some((m) => (m.id || m._id) === mid)));
    }).catch(() => {});
  }, [member.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const stats = member.taskStats || { total: 0, inProgress: 0, completed: 0, overdue: 0 };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()} className="bg-[#111] w-full max-w-md h-full overflow-y-auto border-l border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: member.avatarColor || '#6366f1' }}>
              {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : member.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{member.name}</h2>
              <p className="text-sm text-zinc-400">{member.role || 'Member'}</p>
              <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5"><Mail size={10} /> {member.email}</p>
              {member.isAdmin && <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full font-semibold mt-1 inline-block">Admin</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task stats */}
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Task Breakdown</h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-zinc-900 rounded-lg p-2.5 text-center border border-zinc-800"><p className="text-[9px] text-zinc-500">Todo</p><p className="text-lg font-bold text-white">{stats.total - stats.inProgress - stats.completed}</p></div>
              <div className="bg-zinc-900 rounded-lg p-2.5 text-center border border-zinc-800"><p className="text-[9px] text-blue-400">Active</p><p className="text-lg font-bold text-white">{stats.inProgress}</p></div>
              <div className="bg-zinc-900 rounded-lg p-2.5 text-center border border-zinc-800"><p className="text-[9px] text-green-400">Done</p><p className="text-lg font-bold text-white">{stats.completed}</p></div>
              <div className="bg-zinc-900 rounded-lg p-2.5 text-center border border-zinc-800"><p className="text-[9px] text-red-400">Overdue</p><p className="text-lg font-bold text-white">{stats.overdue}</p></div>
            </div>
          </div>

          {/* Joined + last active */}
          <div className="flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><Calendar size={11} /> Joined {member.createdAt ? format(new Date(member.createdAt), 'MMM yyyy') : '—'}</span>
            {member.lastActiveAt && <span>Active {formatDistanceToNow(new Date(member.lastActiveAt), { addSuffix: true })}</span>}
          </div>

          {/* Projects */}
          {projects.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Projects ({projects.length})</h3>
              <div className="space-y-1.5">
                {projects.map((p) => (
                  <div key={p.id || p._id} className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded-lg">
                    <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: p.color || '#6366f1' }} />
                    <span className="text-xs text-zinc-200 flex-1 truncate">{p.name}</span>
                    {p.progressPercent !== undefined && <span className="text-[10px] text-zinc-500">{p.progressPercent}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {activities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Recent Activity</h3>
              <div className="space-y-2">
                {activities.map((a) => (
                  <div key={a.id} className="text-xs text-zinc-400">
                    <span className="text-zinc-300">{a.details}</span>
                    <p className="text-[10px] text-zinc-600">{a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assign task */}
          <button onClick={() => onAssignTask(member)} className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5">
            <Plus size={14} /> Assign Task
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Invite Modal ───────────────────────────────────────────────
const InviteModal = ({ onClose, onInvited }) => {
  const [form, setForm] = useState({ email: '', name: '', role: 'Member', jobTitle: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { user, tempPassword }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.name.trim()) return toast.error('Email and name required');
    setLoading(true);
    try {
      const res = await api.post('/auth/invite', form);
      setResult(res.data);
      onInvited?.();
    } catch { toast.error('Failed to invite member'); }
    finally { setLoading(false); }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(result.tempPassword);
    toast.success('Password copied!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-md border border-zinc-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Invite Member</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800"><X size={20} /></button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <CheckCircle2 size={40} className="text-green-400 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">{result.user.name} invited!</h3>
              <p className="text-sm text-zinc-400 mt-1">Share these credentials with them:</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 space-y-2 border border-zinc-800">
              <div className="flex justify-between items-center"><span className="text-xs text-zinc-500">Email</span><span className="text-sm text-zinc-200">{result.user.email}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">Temp Password</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{result.tempPassword}</code>
                  <button onClick={copyPassword} className="text-zinc-500 hover:text-zinc-300"><Copy size={14} /></button>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@socioo.in" className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 outline-none">
                  <option>Member</option><option>Admin</option><option>Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Job Title</label>
                <input type="text" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="e.g. Designer" className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">{loading ? 'Inviting...' : 'Send Invite'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ── Member Card ────────────────────────────────────────────────
const MemberCard = React.memo(({ member, isAdmin, onSelect }) => {
  const stats = member.taskStats || {};
  const active = (stats.total || 0) - (stats.completed || 0);

  return (
    <motion.div whileHover={{ y: -3 }} onClick={() => onSelect(member)}
      className="bg-[#111] rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 cursor-pointer group transition-all">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3 shadow-lg relative"
          style={{ backgroundColor: member.avatarColor || '#3b82f6' }}>
          {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : member.name?.charAt(0)}
          {member.isAdmin && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center ring-2 ring-[#111]"><Shield size={10} className="text-white" /></div>
          )}
        </div>
        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{member.name}</h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">{member.role}</p>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-1 mt-3 justify-center">
          <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full">{active} active</span>
          {(stats.overdue || 0) > 0 && <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full">{stats.overdue} overdue</span>}
          <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full">{stats.completed || 0} done</span>
        </div>

        <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600">
          <span className="flex items-center gap-0.5"><FolderOpen size={9} /> {member.projectCount || 0} projects</span>
        </div>
      </div>
    </motion.div>
  );
});

// ═════════════════════════════════════════════════════════════════
// TEAM PAGE
// ═════════════════════════════════════════════════════════════════
const TeamPage = () => {
  const { user } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [preAssignee, setPreAssignee] = useState(null);

  const isAdmin = user?.isAdmin || user?.role === 'admin';

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setMembers((res.data || []).filter((u) => u.isActive !== false));
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
    let result = members;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
    }
    if (roleFilter === 'admin') result = result.filter((m) => m.isAdmin);
    if (roleFilter === 'user') result = result.filter((m) => !m.isAdmin);

    result = [...result];
    if (sortBy === 'tasks') result.sort((a, b) => (b.taskStats?.total || 0) - (a.taskStats?.total || 0));
    else if (sortBy === 'active') result.sort((a, b) => new Date(b.lastActiveAt || 0) - new Date(a.lastActiveAt || 0));
    else result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [members, searchQuery, roleFilter, sortBy]);

  // Workload chart data
  const workloadData = useMemo(() =>
    filteredMembers.map((m) => {
      const s = m.taskStats || {};
      const parts = m.name?.trim().split(' ') || [];
      const shortName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || '';
      return {
        name: shortName, fullName: m.name,
        todo: (s.total || 0) - (s.inProgress || 0) - (s.completed || 0) - (s.overdue || 0),
        inProgress: s.inProgress || 0,
        done: s.completed || 0,
        overdue: s.overdue || 0,
      };
    }),
  [filteredMembers]);

  const handleAssignTask = (member) => {
    setSelectedMember(null);
    setPreAssignee(member);
    setShowNewTask(true);
  };

  return (
    <PageTransition>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Team</h1>
            <span className="bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full text-xs font-bold">{members.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setShowInvite(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium shadow-lg shadow-blue-500/20">
                <Plus size={16} /> Invite Member
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search name or email..." className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>

          <div className="flex gap-1">
            {[{ v: '', l: 'All' }, { v: 'admin', l: 'Admin' }, { v: 'user', l: 'User' }].map((r) => (
              <button key={r.v} onClick={() => setRoleFilter(r.v)} className={clsx('px-2.5 py-1.5 rounded-lg text-[10px] font-medium border', roleFilter === r.v ? 'bg-blue-600/20 border-blue-500/30 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200')}>{r.l}</button>
            ))}
          </div>

          <div className="relative">
            <button onClick={() => setShowSortMenu(!showSortMenu)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"><ArrowUpDown size={11} /> {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}<ChevronDown size={10} /></button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-40 py-1">
                {SORT_OPTIONS.map((s) => (<button key={s.value} onClick={() => { setSortBy(s.value); setShowSortMenu(false); }} className={clsx('w-full text-left px-3 py-1.5 text-[10px] hover:bg-zinc-800', sortBy === s.value ? 'text-blue-400' : 'text-zinc-300')}>{s.label}</button>))}
              </div>
            )}
          </div>

          <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
            <button onClick={() => setViewMode('grid')} className={clsx('p-1.5 rounded-md', viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300')}><LayoutGrid size={14} /></button>
            <button onClick={() => setViewMode('workload')} className={clsx('p-1.5 rounded-md', viewMode === 'workload' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300')}><BarChart3 size={14} /></button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="card" className="h-52" />)}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16"><Users size={40} className="text-zinc-700 mx-auto mb-3" /><p className="text-zinc-500">No members found</p></div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence>
              {filteredMembers.map((m) => (
                <motion.div key={m.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <MemberCard member={m} isAdmin={isAdmin} onSelect={setSelectedMember} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Workload Chart View */
          <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900">
            <h3 className="text-sm font-bold text-white mb-4">Team Workload</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" interval={0} height={50} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                    labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                  <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'WIP Limit (8)', fill: '#ef4444', fontSize: 9, position: 'right' }} />
                  <Bar dataKey="todo" name="Todo" stackId="a" fill="#71717a" barSize={28} />
                  <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#3b82f6" barSize={28} />
                  <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#ef4444" barSize={28} />
                  <Bar dataKey="done" name="Done" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Panels / Modals */}
      <AnimatePresence>
        {selectedMember && <MemberProfilePanel member={selectedMember} onClose={() => setSelectedMember(null)} onAssignTask={handleAssignTask} />}
      </AnimatePresence>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={fetchMembers} />}
      {showNewTask && <NewTaskModal onClose={() => { setShowNewTask(false); setPreAssignee(null); }} onCreated={fetchMembers} />}
    </PageTransition>
  );
};

export default TeamPage;
