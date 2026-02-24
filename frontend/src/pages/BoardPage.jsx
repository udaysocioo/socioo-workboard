import React, { useEffect, useState } from 'react';
import Skeleton from '../components/common/Skeleton';
import PageTransition from '../components/common/PageTransition';
import { AnimatePresence } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import BoardColumn from '../components/board/BoardColumn';
import TaskModal from '../components/board/TaskModal';
import { Plus, X, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../services/api';

const NewTaskModal = ({ onClose, onCreated }) => {
  const { projects } = useProjectStore();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assigneeIds: [],
    priority: 'medium',
    status: 'todo',
    deadline: '',
  });
  const [loading, setLoading] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  useEffect(() => {
    api.get('/users').then((res) => setMembers(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.projectId) delete payload.projectId;
      if (payload.deadline) {
        payload.deadline = new Date(payload.deadline).toISOString();
      } else {
        delete payload.deadline;
      }
      await api.post('/tasks', payload);
      toast.success('Task created!');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Create New Task</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Task description" rows={3} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Project</label>
              <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200">
                <option value="">No Project</option>
                {projects.map((p) => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Assignees</label>
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 text-left flex items-center justify-between"
              >
                <span className={form.assigneeIds.length === 0 ? 'text-zinc-600' : ''}>
                  {form.assigneeIds.length === 0
                    ? 'Select assignees'
                    : `${form.assigneeIds.length} selected`}
                </span>
                <ChevronDown size={16} className="text-zinc-500" />
              </button>
              {showAssigneeDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {members.map((m) => {
                    const id = m.id || m._id;
                    const selected = form.assigneeIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            assigneeIds: selected
                              ? prev.assigneeIds.filter((x) => x !== id)
                              : [...prev.assigneeIds, id],
                          }));
                        }}
                        className={clsx(
                          'w-full flex items-center px-3 py-2 text-sm hover:bg-zinc-800 transition-colors',
                          selected ? 'text-blue-400' : 'text-zinc-300',
                        )}
                      >
                        <div className={clsx(
                          'w-4 h-4 rounded border mr-2 flex items-center justify-center flex-shrink-0',
                          selected ? 'bg-blue-600 border-blue-600' : 'border-zinc-600',
                        )}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0"
                          style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                        >
                          {m.name?.charAt(0)}
                        </div>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BoardPage = () => {
  const { tasks, fetchTasks, updateTaskStatus, reorderTask, isLoading } = useTaskStore();
  const { fetchProjects } = useProjectStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  const columns = React.useMemo(() => ({
    Todo: tasks.filter((t) => t.status === 'Todo'),
    'In Progress': tasks.filter((t) => t.status === 'In Progress'),
    Review: tasks.filter((t) => t.status === 'Review'),
    Done: tasks.filter((t) => t.status === 'Done'),
  }), [tasks]);

  const handleDragEnd = React.useCallback((result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    updateTaskStatus(draggableId, newStatus);
    if (reorderTask) {
      reorderTask(draggableId, newStatus, destination.index);
    }
    toast.success(`Moved to ${newStatus}`);
  }, [updateTaskStatus, reorderTask]);

  return (
    <PageTransition>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Board</h1>
            <p className="text-zinc-400">Manage tasks and workflows</p>
          </div>
          <button onClick={() => setShowNewTask(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors shadow-lg shadow-blue-500/20">
            <Plus size={18} className="mr-2" />
            New Task
          </button>
        </div>


        <div className="flex-1 overflow-x-auto pb-4">
          {isLoading ? (
            <div className="flex space-x-6 h-full min-w-max">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="w-80 flex-shrink-0 flex flex-col">
                   <Skeleton variant="text" className="w-24 mb-4" />
                   <div className="space-y-3">
                     <Skeleton variant="card" className="h-32" />
                     <Skeleton variant="card" className="h-32" />
                     <Skeleton variant="card" className="h-24" />
                   </div>
                 </div>
               ))}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex space-x-6 h-full min-w-max">
                {Object.keys(columns).map((status) => (
                  <BoardColumn key={status} id={status} title={status} tasks={columns[status]} onTaskClick={setSelectedTask} />
                ))}
              </div>
            </DragDropContext>
          )}
        </div>

        {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} onCreated={() => fetchTasks()} />}
        <AnimatePresence>
          {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default BoardPage;
