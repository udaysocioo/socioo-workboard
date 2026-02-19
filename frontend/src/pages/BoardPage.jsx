import React, { useEffect, useState } from 'react';
import Skeleton from '../components/common/Skeleton';
import PageTransition from '../components/common/PageTransition';
import { AnimatePresence } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import BoardColumn from '../components/board/BoardColumn';
import TaskModal from '../components/board/TaskModal';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const NewTaskModal = ({ onClose, onCreated }) => {
  const { projects } = useProjectStore();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    project: '',
    assignee: '',
    priority: 'medium',
    status: 'todo',
    deadline: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/users').then((res) => setMembers(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.project) delete payload.project;
      if (!payload.assignee) delete payload.assignee;
      if (!payload.deadline) delete payload.deadline;
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
              <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200">
                <option value="">No Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Assignee</label>
              <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200">
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
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
