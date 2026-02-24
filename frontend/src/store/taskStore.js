import { create } from 'zustand';
import api from '../services/api';

// Map backend status values to frontend display names
const STATUS_MAP = {
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const REVERSE_STATUS_MAP = {
  Todo: 'todo',
  'In Progress': 'in_progress',
  Review: 'review',
  Done: 'done',
};

// Map backend priority to frontend display
const PRIORITY_MAP = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// Transform backend task to frontend format
const transformTask = (task) => ({
  id: task.id || task._id,
  title: task.title,
  description: task.description || '',
  status: STATUS_MAP[task.status] || task.status,
  priority: PRIORITY_MAP[task.priority] || task.priority,
  assignees: (task.assignees || []).map((a) => ({
    _id: a.id || a._id,
    id: a.id || a._id,
    name: a.name,
    role: a.role,
    avatarColor: a.avatarColor,
  })),
  project: task.project
    ? { _id: task.project.id || task.project._id, id: task.project.id || task.project._id, name: task.project.name, color: task.project.color }
    : null,
  projectId: task.project?.id || task.project?._id,
  deadline: task.deadline,
  labels: task.labels || [],
  subtasks: task.subtasks?.length || 0,
  completedSubtasks: task.subtasks?.filter((s) => s.completed).length || 0,
  subtaskItems: task.subtasks || [],
  attachments: task.attachments || [],
  order: task.order,
  createdBy: task.createdBy,
  createdAt: task.createdAt,
});

export const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  myTasks: [],
  isLoadingMyTasks: false,
  myTasksError: null,

  fetchTasks: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const params = {};
      if (projectId) params.project = projectId;
      const res = await api.get('/tasks', { params });
      // Backend now returns { success: true, count: N, data: [...] }
      const tasksData = res.data.data || res.data;
      const tasks = Array.isArray(tasksData) ? tasksData.map(transformTask) : [];
      set({ tasks, isLoading: false });
    } catch (error) {
      set({ error: error.message || 'Failed to fetch tasks', isLoading: false });
    }
  },

  fetchMyTasks: async (userId) => {
    set({ isLoadingMyTasks: true, myTasksError: null });
    try {
      const res = await api.get('/tasks', { params: { assignee: userId } });
      const tasksData = res.data.data || res.data;
      const myTasks = Array.isArray(tasksData) ? tasksData.map(transformTask) : [];
      set({ myTasks, isLoadingMyTasks: false });
    } catch (error) {
      set({ myTasksError: error.message || 'Failed to fetch your tasks', isLoadingMyTasks: false });
    }
  },

  addTask: async (taskData) => {
    try {
      const payload = {
        ...taskData,
        status: REVERSE_STATUS_MAP[taskData.status] || taskData.status || 'todo',
        priority: taskData.priority?.toLowerCase() || 'medium',
      };
      const res = await api.post('/tasks', payload);
      const newTask = transformTask(res.data.data || res.data);
      set((state) => ({ tasks: [...state.tasks, newTask] }));
      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  },

  updateTask: async (taskId, updates) => {
    // Optimistic update
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    }));

    try {
      const payload = { ...updates };
      if (updates.status) payload.status = REVERSE_STATUS_MAP[updates.status] || updates.status;
      if (updates.priority) payload.priority = updates.priority.toLowerCase();
      
      const res = await api.put(`/tasks/${taskId}`, payload);
      // Update with actual backend response to ensure consistency
      const updated = transformTask(res.data.data || res.data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
      }));
      return updated;
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on failure
      set({ tasks: previousTasks, error: error.message });
      throw error;
    }
  },

  updateTaskStatus: async (taskId, newStatus) => {
    // Optimistic update
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t,
      ),
    }));
    try {
      const backendStatus = REVERSE_STATUS_MAP[newStatus] || newStatus;
      await api.put(`/tasks/${taskId}`, { status: backendStatus });
    } catch (error) {
      // Revert on failure
      set({ tasks: previousTasks });
      console.error('Failed to update status:', error);
    }
  },

  reorderTask: async (taskId, newStatus, newOrder, projectId) => {
    // State is expected to be updated optimistically by the component calling reorderTasks()
    try {
      const backendStatus = REVERSE_STATUS_MAP[newStatus] || newStatus;
      await api.put('/tasks/reorder', {
        taskId,
        newStatus: backendStatus,
        newOrder,
        projectId,
      });
    } catch (error) {
      console.error('Failed to reorder task:', error);
      get().fetchTasks(projectId); // Revert/Refresh on failure
    }
  },

  deleteTask: async (taskId) => {
    // Optimistic delete
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Revert on failure
      set({ tasks: previousTasks, error: error.message });
      throw error;
    }
  },

  reorderTasks: (newTasks) => set({ tasks: newTasks }),
}));
