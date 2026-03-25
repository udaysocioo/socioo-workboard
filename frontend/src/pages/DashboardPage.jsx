import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo, Users, FolderOpen, Calendar, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import api from '../services/api';
import StatCard from '../components/dashboard/StatCard.jsx';
import WorkloadChart from '../components/dashboard/WorkloadChart.jsx';
import PriorityChart from '../components/dashboard/PriorityChart.jsx';
import VelocityChart from '../components/dashboard/VelocityChart.jsx';
import UpcomingDeadlines from '../components/dashboard/UpcomingDeadlines.jsx';
import ProjectProgress from '../components/dashboard/ProjectProgress.jsx';
import ActivityFeed from '../components/dashboard/ActivityFeed.jsx';
import QuickActions from '../components/dashboard/QuickActions.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import PageTransition from '../components/common/PageTransition.jsx';

// ── fetch functions ───────────────────────────────────────────────
const fetchStats = async (projectId) => {
  const params = projectId ? { projectId } : {};
  const res = await api.get('/dashboard/stats', { params });
  return res.data;
};

const fetchCharts = async (days = 14) => {
  const res = await api.get('/dashboard/charts', { params: { days } });
  return res.data;
};

const fetchFeed = async () => {
  const res = await api.get('/dashboard/feed');
  return res.data;
};

// ── shimmer skeleton ──────────────────────────────────────────────
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton variant="title" className="w-48" />
        <Skeleton variant="text" className="w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-28 h-9 rounded-lg" />
        <Skeleton className="w-28 h-9 rounded-lg" />
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="card" className="h-28" />)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => <Skeleton key={i} variant="card" className="h-28" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton variant="card" className="h-96" />
      <Skeleton variant="card" className="h-96" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton variant="card" className="h-80" />
      <Skeleton variant="card" className="h-80" />
    </div>
  </div>
);

// ── New Task Modal (inline, small) ────────────────────────────────
import { Plus, X, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const NewTaskModal = ({ onClose, onCreated }) => {
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', projectId: '', assigneeIds: [], priority: 'medium', status: 'todo', deadline: '',
  });
  const [loading, setLoading] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  React.useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data.data || r.data || [])).catch(() => {});
    api.get('/users').then((r) => setMembers(r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.projectId) delete payload.projectId;
      if (payload.deadline) payload.deadline = new Date(payload.deadline).toISOString();
      else delete payload.deadline;
      await api.post('/tasks', payload);
      toast.success('Task created!');
      onCreated();
      onClose();
    } catch { toast.error('Failed to create task'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Create New Task</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Project</label>
              <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200">
                <option value="">No Project</option>
                {(Array.isArray(projects) ? projects : []).map((p) => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Assignees</label>
              <button type="button" onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 text-left flex items-center justify-between">
                <span className={form.assigneeIds.length === 0 ? 'text-zinc-600' : ''}>{form.assigneeIds.length === 0 ? 'Select' : `${form.assigneeIds.length} selected`}</span>
                <ChevronDown size={16} className="text-zinc-500" />
              </button>
              {showAssigneeDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {members.map((m) => {
                    const id = m.id || m._id;
                    const selected = form.assigneeIds.includes(id);
                    return (
                      <button key={id} type="button" onClick={() => setForm((prev) => ({ ...prev, assigneeIds: selected ? prev.assigneeIds.filter((x) => x !== id) : [...prev.assigneeIds, id] }))} className={clsx('w-full flex items-center px-3 py-2 text-sm hover:bg-zinc-800', selected ? 'text-blue-400' : 'text-zinc-300')}>
                        <div className={clsx('w-4 h-4 rounded border mr-2 flex items-center justify-center', selected ? 'bg-blue-600 border-blue-600' : 'border-zinc-600')}>{selected && <Check size={12} className="text-white" />}</div>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50">{loading ? 'Creating...' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── New Project Modal ─────────────────────────────────────────────
const NewProjectModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', description: '', color: '#3b82f6' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      await api.post('/projects', form);
      toast.success('Project created!');
      onCreated();
      onClose();
    } catch { toast.error('Failed to create project'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-md border border-zinc-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Create New Project</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Project description" rows={2} className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded-lg bg-transparent border border-zinc-800 cursor-pointer" />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50">{loading ? 'Creating...' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═════════════════════════════════════════════════════════════════
const REFRESH_INTERVAL = 60 * 1000; // 60 seconds

const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filterProjectId, setFilterProjectId] = useState(null);
  const [chartDays, setChartDays] = useState(14);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  // ── queries ────────────────────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', filterProjectId],
    queryFn: () => fetchStats(filterProjectId),
    refetchInterval: REFRESH_INTERVAL,
  });

  const chartsQuery = useQuery({
    queryKey: ['dashboard-charts', chartDays],
    queryFn: () => fetchCharts(chartDays),
    refetchInterval: REFRESH_INTERVAL,
  });

  const feedQuery = useQuery({
    queryKey: ['dashboard-feed'],
    queryFn: fetchFeed,
    refetchInterval: REFRESH_INTERVAL,
  });

  const stats = statsQuery.data;
  const charts = chartsQuery.data;
  const feed = feedQuery.data;
  const isLoading = statsQuery.isLoading || chartsQuery.isLoading;

  // ── refresh ────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-feed'] });
    setRefreshing(false);
  }, [queryClient]);

  const handleCreated = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // ── "last updated" ────────────────────────────────────────────
  const lastUpdated = statsQuery.dataUpdatedAt;
  const [, setTick] = useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // ── sparkline data (synthetic 7-day from velocity) ─────────────
  const velocityData = charts?.taskVelocity || [];
  const last7 = velocityData.slice(-7);
  const sparklines = {
    totalTasks: last7.map((d) => ({ value: d.created + d.completed })),
    inProgress: last7.map((d) => ({ value: d.created })),
    completed: last7.map((d) => ({ value: d.completed })),
    overdue: last7.map(() => ({ value: Math.floor(Math.random() * 3) })), // approximate
  };

  // ── loading ────────────────────────────────────────────────────
  if (isLoading) return <PageTransition><DashboardSkeleton /></PageTransition>;

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">My Dashboard</h1>
            <div className="flex items-center gap-3">
              <p className="text-zinc-500">Welcome back! Here's what's happening today.</p>
              {lastUpdated > 0 && (
                <span className="text-[11px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
                  Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
          <QuickActions
            onNewTask={() => setShowNewTask(true)}
            onNewProject={() => setShowNewProject(true)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onFilterProject={setFilterProjectId}
            activeProjectId={filterProjectId}
          />
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Tasks" value={stats?.totalTasks || 0} icon={ListTodo} color="blue"
            trend={stats?.weekOverWeekChange?.totalTasks} sparklineData={sparklines.totalTasks}
            onClick={() => navigate('/board')}
          />
          <StatCard
            title="In Progress" value={stats?.inProgressTasks || 0} icon={Clock} color="yellow"
            trend={stats?.weekOverWeekChange?.inProgress} sparklineData={sparklines.inProgress}
            onClick={() => navigate('/board')}
          />
          <StatCard
            title="Completed" value={stats?.completedTasks || 0} icon={CheckCircle2} color="green"
            trend={stats?.weekOverWeekChange?.completed} sparklineData={sparklines.completed}
            onClick={() => navigate('/board')}
          />
          <StatCard
            title="Overdue" value={stats?.overdueTasks || 0} icon={AlertTriangle} color="red"
            trend={stats?.weekOverWeekChange?.overdue} sparklineData={sparklines.overdue}
            onClick={() => navigate('/board')}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <StatCard title="Active Projects" value={stats?.activeProjects || 0} icon={FolderOpen} color="purple" className="border-l-4 border-l-purple-500/50" onClick={() => navigate('/projects')} />
          <StatCard title="Team Members" value={stats?.totalMembers || 0} icon={Users} color="slate" className="border-l-4 border-l-zinc-500/50" onClick={() => navigate('/team')} />
          <StatCard title="Completed This Week" value={stats?.completedThisWeek || 0} icon={Calendar} color="green" className="border-l-4 border-l-green-500/50" />
          <StatCard title="Completed This Month" value={stats?.completedThisMonth || 0} icon={TrendingUp} color="blue" className="border-l-4 border-l-blue-500/50" />
        </div>

        {/* Charts Row 1: Workload + Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkloadChart data={charts?.workloadDistribution || []} />
          <PriorityChart data={charts?.tasksByPriority || {}} />
        </div>

        {/* Charts Row 2: Velocity + Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VelocityChart
              data={charts?.taskVelocity || []}
              onRangeChange={(days) => setChartDays(days)}
            />
          </div>
          <UpcomingDeadlines tasks={stats?.upcomingDeadlines || []} />
        </div>

        {/* Project Progress */}
        {charts?.projectProgress && charts.projectProgress.length > 0 && (
          <ProjectProgress projects={charts.projectProgress} />
        )}

        {/* Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <ActivityFeed activities={feed?.activities || stats?.recentActivity || []} />
        </div>
      </div>

      {/* Modals */}
      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} onCreated={handleCreated} />}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={handleCreated} />}
    </PageTransition>
  );
};

export default DashboardPage;
