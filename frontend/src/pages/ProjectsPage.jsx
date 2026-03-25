import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import ProjectCard from '../components/projects/ProjectCard';
import { Plus, X, Search, LayoutGrid, List, ChevronDown, ArrowUpDown, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import clsx from 'clsx';
import Skeleton from '../components/common/Skeleton';
import PageTransition from '../components/common/PageTransition';
import { format } from 'date-fns';

const PROJECT_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const PROJECT_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-500/10 text-green-400' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'archived', label: 'Archived', color: 'bg-zinc-500/10 text-zinc-400' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'tasks', label: 'Most Tasks' },
  { value: 'alpha', label: 'A → Z' },
  { value: 'progress', label: 'Progress %' },
];

// ── Project Form Modal ─────────────────────────────────────────
const ProjectFormModal = ({ onClose, project, onSaved }) => {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    color: project?.color || '#6366f1',
    status: project?.rawStatus || 'active',
    members: project?.members ? project.members.map((m) => typeof m === 'object' ? (m.id || m._id) : m) : [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/users').then((res) => setMembers(res.data)).catch(() => {}); }, []);

  const toggleMember = (id) => setForm((prev) => ({ ...prev, members: prev.members.includes(id) ? prev.members.filter((m) => m !== id) : [...prev.members, id] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required');
    setLoading(true);
    try {
      if (project) { await useProjectStore.getState().updateProject(project.id, form); toast.success('Project updated!'); }
      else { await useProjectStore.getState().addProject(form); toast.success('Project created!'); }
      onSaved(); onClose();
    } catch (error) {
      if (!error.response) toast.error(error.message || 'Failed to save project');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-[#111] z-10">
          <h2 className="text-lg font-bold text-white">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Color</label>
            <div className="flex gap-2">{PROJECT_COLORS.map((c) => (<button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-[#111] ring-blue-500 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
            <div className="flex gap-2">{PROJECT_STATUSES.map((s) => (<button key={s.value} type="button" onClick={() => setForm({ ...form, status: s.value })} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border', form.status === s.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#0a0a0a] text-zinc-300 border-zinc-800 hover:border-blue-400')}>{s.label}</button>))}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Members</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">{members.map((m) => (<button key={m.id || m._id} type="button" onClick={() => toggleMember(m.id || m._id)} className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border', form.members.includes(m.id || m._id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#0a0a0a] text-zinc-300 border-zinc-800 hover:border-blue-400')}><div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: m.avatarColor || '#6366f1' }}>{m.name?.charAt(0)}</div>{m.name}</button>))}</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50">{loading ? 'Saving...' : (project ? 'Update' : 'Create')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ onClose, onConfirm, name }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-sm border border-zinc-800 p-6" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-bold text-white mb-2">Delete Project</h3>
      <p className="text-sm text-zinc-400 mb-6">Delete <span className="font-semibold text-zinc-200">"{name}"</span>? This cannot be undone.</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
      </div>
    </div>
  </div>
);

// ── List Row ───────────────────────────────────────────────────
const ListRow = ({ project, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const statusStyle = PROJECT_STATUSES.find((s) => s.value === project.rawStatus) || PROJECT_STATUSES[0];
  return (
    <div onClick={() => navigate(`/projects/${project.id}`)} className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/40 cursor-pointer transition-colors text-sm">
      <div className="col-span-3 flex items-center gap-2.5 min-w-0">
        <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: project.color }} />
        <span className="text-zinc-200 font-medium truncate">{project.name}</span>
      </div>
      <div className="col-span-2 flex -space-x-1">
        {project.members?.slice(0, 3).map((m, i) => (<div key={m.id || i} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-black" style={{ backgroundColor: m.avatarColor || '#6366f1' }}>{m.name?.charAt(0)}</div>))}
        {(project.members?.length || 0) > 3 && <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-400 ring-1 ring-black">+{project.members.length - 3}</div>}
      </div>
      <div className="col-span-1 text-xs text-zinc-400">{project.taskCount || 0}</div>
      <div className="col-span-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${project.progressPercent || 0}%`, backgroundColor: project.color }} /></div>
          <span className="text-[10px] text-zinc-500 w-8">{project.progressPercent || 0}%</span>
        </div>
      </div>
      <div className="col-span-1"><span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', statusStyle.color)}>{statusStyle.label}</span></div>
      <div className="col-span-2 text-xs text-zinc-500">{project.nearestDeadline ? format(new Date(project.nearestDeadline), 'MMM d') : '—'}</div>
      <div className="col-span-1 flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors text-xs">Edit</button>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// PROJECTS PAGE
// ═════════════════════════════════════════════════════════════════
const ProjectsPage = () => {
  const { projects, fetchProjects, deleteProject, isLoading } = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  const handleEdit = React.useCallback((project) => { setEditProject(project); setShowForm(true); }, []);
  const handleDelete = React.useCallback(async () => {
    if (!deleteTarget) return;
    try { await deleteProject(deleteTarget.id); toast.success('Project deleted'); } catch { toast.error('Failed to delete'); }
    setDeleteTarget(null);
  }, [deleteTarget, deleteProject]);

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter((p) => p.rawStatus === statusFilter);

    // Sort
    result = [...result];
    switch (sortBy) {
      case 'oldest': result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'tasks': result.sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0)); break;
      case 'alpha': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'progress': result.sort((a, b) => (b.progressPercent || 0) - (a.progressPercent || 0)); break;
      default: result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return result;
  }, [projects, searchQuery, statusFilter, sortBy]);

  return (
    <PageTransition>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="text-zinc-500 text-sm">{projects.length} projects</p>
          </div>
          <button onClick={() => { setEditProject(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search projects..." className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>

          {/* Status filter chips */}
          <div className="flex gap-1">
            <button onClick={() => setStatusFilter('')} className={clsx('px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors', !statusFilter ? 'bg-blue-600/20 border-blue-500/30 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200')}>All</button>
            {PROJECT_STATUSES.map((s) => (
              <button key={s.value} onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)} className={clsx('px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors', statusFilter === s.value ? 'bg-blue-600/20 border-blue-500/30 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200')}>{s.label}</button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button onClick={() => setShowSortMenu(!showSortMenu)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"><ArrowUpDown size={11} /> {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}<ChevronDown size={10} /></button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-36 py-1">
                {SORT_OPTIONS.map((s) => (<button key={s.value} onClick={() => { setSortBy(s.value); setShowSortMenu(false); }} className={clsx('w-full text-left px-3 py-1.5 text-[10px] hover:bg-zinc-800', sortBy === s.value ? 'text-blue-400' : 'text-zinc-300')}>{s.label}</button>))}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
            <button onClick={() => setViewMode('grid')} className={clsx('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300')}><LayoutGrid size={14} /></button>
            <button onClick={() => setViewMode('list')} className={clsx('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300')}><List size={14} /></button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="card" className="h-56" />)}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 mb-4">{searchQuery || statusFilter ? 'No projects match your filters' : 'No projects yet.'}</p>
            {!searchQuery && !statusFilter && (
              <button onClick={() => { setEditProject(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"><Plus size={16} className="mr-1.5 inline" /> Create Project</button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filteredProjects.map((project) => (
                <motion.div key={project.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
                  <ProjectCard project={project} onEdit={handleEdit} onDelete={setDeleteTarget} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] rounded-xl border border-zinc-800 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-zinc-800 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
              <div className="col-span-3">Name</div><div className="col-span-2">Members</div><div className="col-span-1">Tasks</div><div className="col-span-2">Progress</div><div className="col-span-1">Status</div><div className="col-span-2">Due</div><div className="col-span-1">Actions</div>
            </div>
            {filteredProjects.map((p) => <ListRow key={p.id} project={p} onEdit={handleEdit} onDelete={setDeleteTarget} />)}
          </div>
        )}

        {/* Modals */}
        {showForm && <ProjectFormModal project={editProject} onClose={() => { setShowForm(false); setEditProject(null); }} onSaved={() => fetchProjects()} />}
        {deleteTarget && <DeleteConfirmModal name={deleteTarget.name} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
      </div>
    </PageTransition>
  );
};

export default ProjectsPage;
