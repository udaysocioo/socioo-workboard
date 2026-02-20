import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../store/projectStore';
import ProjectCard from '../components/projects/ProjectCard';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Skeleton from '../components/common/Skeleton';

const PROJECT_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
];

const ProjectFormModal = ({ onClose, project, onSaved }) => {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    color: project?.color || '#6366f1',
    status: project ? (project.status === 'active' ? 'active' : 'archived') : 'active',
    members: project?.members ? project.members.map((m) => typeof m === 'object' ? m._id : m) : [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/users').then((res) => setMembers(res.data)).catch(() => {});
  }, []);

  const toggleMember = (id) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.includes(id)
        ? prev.members.filter((m) => m !== id)
        : [...prev.members, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required');
    setLoading(true);
    try {
      if (project) {
        await useProjectStore.getState().updateProject(project.id, form);
        toast.success('Project updated!');
      } else {
        await useProjectStore.getState().addProject(form);
        toast.success('Project created!');
      }
      onSaved();
      onClose();
      onSaved();
      onClose();
    } catch (error) {
      console.error('Project save error:', error);
      // Toast is already handled by api.js interceptor for most cases, 
      // but if we want to be safe or handle specific logic:
      if (!error.response) { // If not handled by interceptor (e.g. logic error)
          toast.error(error.message || (project ? 'Failed to update project' : 'Failed to create project'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Project Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Project description" rows={3} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-[#111] ring-blue-500 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          {project && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200">
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Members</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {members.map((m) => (
                <button key={m._id} type="button" onClick={() => toggleMember(m._id)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${form.members.includes(m._id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#0a0a0a] text-zinc-300 border-zinc-800 hover:border-blue-400'}`}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: m.avatarColor || '#6366f1' }}>
                    {m.name?.charAt(0)}
                  </div>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
            </button>
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
      <p className="text-sm text-zinc-400 mb-6">
        Are you sure you want to delete <span className="font-semibold text-zinc-200">"{name}"</span>? This action cannot be undone.
      </p>
      <div className="flex justify-end space-x-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
      </div>
    </div>
  </div>
);

const ProjectsPage = () => {
  const { projects, fetchProjects, deleteProject, isLoading } = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleEdit = React.useCallback((project) => {
    setEditProject(project);
    setShowForm(true);
  }, []);

  const handleDelete = React.useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteProject]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-zinc-400">Manage your ongoing initiatives</p>
        </div>
        <button onClick={() => { setEditProject(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors shadow-lg shadow-blue-500/20">
          <Plus size={18} className="mr-2" />
          New Project
        </button>
      </div>


      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="card" className="h-64" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-400 mb-4">No projects yet. Create your first project!</p>
          <button onClick={() => { setEditProject(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
            <Plus size={18} className="mr-2 inline" /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {projects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <ProjectCard project={project} onEdit={handleEdit} onDelete={setDeleteTarget} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showForm && (
        <ProjectFormModal
          project={editProject}
          onClose={() => { setShowForm(false); setEditProject(null); }}
          onSaved={() => fetchProjects()}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal name={deleteTarget.name} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
};

export default ProjectsPage;
