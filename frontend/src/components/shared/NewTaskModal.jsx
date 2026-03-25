import React, { useEffect, useState } from 'react';
import { X, ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Todo', color: 'bg-zinc-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-yellow-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-green-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
];

const NewTaskModal = ({ onClose, onCreated, initialStatus }) => {
  const { projects } = useProjectStore();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assigneeIds: [],
    priority: 'medium',
    status: initialStatus || 'todo',
    deadline: '',
    labels: [],
    subtasks: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    api.get('/users').then((res) => setMembers(res.data)).catch(() => {});
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.projectId) errs.projectId = 'Project is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.deadline) {
        payload.deadline = new Date(payload.deadline).toISOString();
      } else {
        delete payload.deadline;
      }
      // Convert subtask strings to objects
      payload.subtasks = form.subtasks.map((s) => ({ title: s }));
      await api.post('/tasks', payload);
      toast.success('Task created!');
      onCreated?.();
      onClose();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const addLabel = () => {
    if (newLabel.trim() && !form.labels.includes(newLabel.trim())) {
      setForm({ ...form, labels: [...form.labels, newLabel.trim()] });
      setNewLabel('');
    }
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setForm({ ...form, subtasks: [...form.subtasks, newSubtask.trim()] });
      setNewSubtask('');
    }
  };

  const inputClass = 'w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-xl border border-zinc-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-[#111] z-10">
          <h2 className="text-lg font-bold text-white">Create New Task</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" className={clsx(inputClass, errors.title && 'border-red-500')} autoFocus />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Task description" rows={2} className={inputClass} />
          </div>

          {/* Project + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Project *</label>
              <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className={clsx(inputClass, errors.projectId && 'border-red-500')}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </select>
              {errors.projectId && <p className="text-xs text-red-400 mt-1">{errors.projectId}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Priority + Assignees */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Priority</label>
              <div className="flex gap-1">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p.value })}
                    className={clsx(
                      'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                      form.priority === p.value
                        ? `bg-zinc-800 border-zinc-600 ${p.color}`
                        : 'border-zinc-800 text-zinc-500 hover:border-zinc-700',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-zinc-400 mb-1">Assignees</label>
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 text-left flex items-center justify-between"
              >
                <span className={form.assigneeIds.length === 0 ? 'text-zinc-600 text-xs' : 'text-xs'}>
                  {form.assigneeIds.length === 0 ? 'Select assignees' : `${form.assigneeIds.length} selected`}
                </span>
                <ChevronDown size={14} className="text-zinc-500" />
              </button>
              {showAssigneeDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {members.map((m) => {
                    const id = m.id || m._id;
                    const selected = form.assigneeIds.includes(id);
                    return (
                      <button key={id} type="button" onClick={() => setForm((prev) => ({ ...prev, assigneeIds: selected ? prev.assigneeIds.filter((x) => x !== id) : [...prev.assigneeIds, id] }))} className={clsx('w-full flex items-center px-3 py-2 text-xs hover:bg-zinc-800', selected ? 'text-blue-400' : 'text-zinc-300')}>
                        <div className={clsx('w-3.5 h-3.5 rounded border mr-2 flex items-center justify-center', selected ? 'bg-blue-600 border-blue-600' : 'border-zinc-600')}>{selected && <Check size={9} className="text-white" />}</div>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold mr-2" style={{ backgroundColor: m.avatarColor || '#6366f1' }}>{m.name?.charAt(0)}</div>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputClass} />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Labels</label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {form.labels.map((l, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700">
                  {l}
                  <button type="button" onClick={() => setForm({ ...form, labels: form.labels.filter((_, j) => j !== i) })} className="text-zinc-500 hover:text-zinc-300"><X size={9} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())} placeholder="Add label" className={clsx(inputClass, 'flex-1 !p-2 text-xs')} />
              <button type="button" onClick={addLabel} className="px-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs border border-zinc-700"><Plus size={14} /></button>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Subtasks</label>
            <div className="space-y-1 mb-1.5">
              {form.subtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 rounded-lg">
                  <CheckSquare size={12} className="text-zinc-500 flex-shrink-0" />
                  <span className="text-xs text-zinc-300 flex-1">{s}</span>
                  <button type="button" onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, j) => j !== i) })} className="text-zinc-600 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())} placeholder="Add subtask" className={clsx(inputClass, 'flex-1 !p-2 text-xs')} />
              <button type="button" onClick={addSubtask} className="px-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs border border-zinc-700"><Plus size={14} /></button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal;
