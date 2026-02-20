import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../store/projectStore';
import ProjectCard from '../components/projects/ProjectCard';
import { Plus, X, Users, ListTodo, Calendar, Folder } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Skeleton from '../components/common/Skeleton';
import { format } from 'date-fns';

const PROJECT_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
];

const PROJECT_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500/10 text-green-400' },
  { value: 'archived', label: 'Archived', color: 'bg-zinc-500/10 text-zinc-400' },
];

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
    } catch (error) {
      console.error('Project save error:', error);
      if (!error.response) {
        toast.error(error.message || (project ? 'Failed to update project' : 'Failed to create project'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-[#111] z-10">
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
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm({ ...form, status: s.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    form.status === s.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-[#0a0a0a] text-zinc-300 border-zinc-800 hover:border-blue-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Members</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {members.map((m) => (
                <button key={m.id || m._id} type="button" onClick={() => toggleMember(m.id || m._id)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${form.members.includes(m.id || m._id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#0a0a0a] text-zinc-300 border-zinc-800 hover:border-blue-400'}`}>
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

const ProjectDetailModal = ({ project, onClose, onEdit }) => {
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    api.get(`/tasks?project=${project.id}`)
      .then((res) => setTasks(res.data))
      .catch(() => {})
      .finally(() => setLoadingTasks(false));
  }, [project.id]);

  const statusCounts = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'review').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  const statusStyle = PROJECT_STATUSES.find((s) => s.value === project.rawStatus) || PROJECT_STATUSES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-800"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
          <div className="flex items-start space-x-4">
            <div className="p-3 rounded-xl text-white" style={{ backgroundColor: project.color || '#64748b' }}>
              <Folder size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{project.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
                {project.createdAt && (
                  <span className="text-xs text-zinc-500">
                    Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          {project.description && (
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Task Stats */}
          <div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center">
              <ListTodo size={14} className="mr-1.5" /> Tasks ({tasks.length})
            </h3>
            {loadingTasks ? (
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="card" className="h-16" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                  <p className="text-xs text-zinc-500">Todo</p>
                  <p className="text-lg font-bold text-white">{statusCounts.todo}</p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                  <p className="text-xs text-blue-400">In Progress</p>
                  <p className="text-lg font-bold text-white">{statusCounts.in_progress}</p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                  <p className="text-xs text-yellow-400">Review</p>
                  <p className="text-lg font-bold text-white">{statusCounts.review}</p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                  <p className="text-xs text-green-400">Done</p>
                  <p className="text-lg font-bold text-white">{statusCounts.done}</p>
                </div>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center">
              <Users size={14} className="mr-1.5" /> Members ({project.members?.length || 0})
            </h3>
            <div className="space-y-2">
              {project.members && project.members.length > 0 ? (
                project.members.map((m, i) => (
                  <div key={m.id || m._id || i} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-zinc-900 transition-colors">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                    >
                      {m.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.name}</p>
                      <p className="text-xs text-zinc-500">{m.role || 'Member'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No members assigned</p>
              )}
            </div>
          </div>

          {/* Recent Tasks */}
          {!loadingTasks && tasks.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Recent Tasks</h3>
              <div className="space-y-1">
                {tasks.slice(0, 8).map((t) => (
                  <div key={t._id || t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        t.status === 'done' ? 'bg-green-500'
                          : t.status === 'in_progress' ? 'bg-blue-500'
                          : t.status === 'review' ? 'bg-yellow-500'
                          : 'bg-zinc-500'
                      }`} />
                      <span className="text-sm text-zinc-200 truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      {t.assignee && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: t.assignee.avatarColor || '#3b82f6' }}
                          title={t.assignee.name}
                        >
                          {t.assignee.name?.charAt(0)}
                        </div>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        t.priority === 'critical' ? 'bg-red-500/10 text-red-400'
                          : t.priority === 'high' ? 'bg-orange-500/10 text-orange-400'
                          : t.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}>{t.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2 border-t border-zinc-800">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">Close</button>
            <button
              onClick={() => { onClose(); onEdit(project); }}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Edit Project
            </button>
          </div>
        </div>
      </motion.div>
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
  const [viewProject, setViewProject] = useState(null);

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
                <ProjectCard project={project} onEdit={handleEdit} onDelete={setDeleteTarget} onClick={setViewProject} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {viewProject && (
        <ProjectDetailModal
          project={viewProject}
          onClose={() => setViewProject(null)}
          onEdit={(p) => { setViewProject(null); handleEdit(p); }}
        />
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
