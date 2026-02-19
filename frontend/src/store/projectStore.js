import { create } from 'zustand';
import api from '../services/api';

// Transform backend project to frontend format
const transformProject = (project) => ({
  id: project._id,
  name: project.name,
  description: project.description || '',
  status: project.status === 'active' ? 'In Progress' : 'Completed',
  color: project.color || '#6366f1',
  taskCount: project.taskCount || 0,
  members: project.members || [],
  createdBy: project.createdBy,
  createdAt: project.createdAt,
});

export const useProjectStore = create((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/projects');
      // Backend now returns { success: true, count: N, data: [...] }
      const projectsData = res.data.data || res.data; 
      const projects = Array.isArray(projectsData) ? projectsData.map(transformProject) : [];
      set({ projects, isLoading: false });
    } catch (error) {
      set({
        error: error.message || 'Failed to fetch projects',
        isLoading: false,
      });
    }
  },

  addProject: async (projectData) => {
    try {
      const res = await api.post('/projects', projectData);
      const newProject = transformProject(res.data.data || res.data);
      set((state) => ({
        projects: [newProject, ...state.projects],
      }));
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  updateProject: async (projectId, updates) => {
    // Optimistic update
    const previousProjects = get().projects;
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates } : p
      ),
    }));

    try {
      const res = await api.put(`/projects/${projectId}`, updates);
      const updated = transformProject(res.data.data || res.data);
      // Confirm with actual server data
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? updated : p,
        ),
      }));
      return updated;
    } catch (error) {
      console.error('Failed to update project:', error);
      // Revert on failure
      set({ projects: previousProjects, error: error.message });
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    // Optimistic delete
    const previousProjects = get().projects;
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    }));

    try {
      await api.delete(`/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to delete project:', error);
      // Revert on failure
      set({ projects: previousProjects, error: error.message });
      throw error;
    }
  },
}));
