import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import {
  ArrowLeft, Folder, Calendar, Users, ListTodo, CheckCircle2, Clock, AlertTriangle,
  Plus, Trash2, Check, ChevronDown, Download, Paperclip, Diamond, Eye,
} from 'lucide-react';
import { format, differenceInDays, startOfDay, addDays, isSameDay, isPast, isToday as isTodayFn } from 'date-fns';
import clsx from 'clsx';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageTransition from '../components/common/PageTransition';
import Skeleton from '../components/common/Skeleton';
import BoardColumn from '../components/board/BoardColumn';
import TaskDetailDrawer from '../components/shared/TaskDetailDrawer';
import FilterBar from '../components/shared/FilterBar';
import { useAuthStore } from '../store/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const STATUS_MAP = { todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITY_MAP = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

// ── SVG Progress Ring ──────────────────────────────────────────
const ProgressRing = ({ percent, size = 100, stroke = 8, color }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || '#3b82f6'} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-white text-xl font-bold">{percent}%</text>
    </svg>
  );
};

// ── Transform backend task for board ───────────────────────────
const transformTask = (t) => ({
  id: t.id, title: t.title, description: t.description || '',
  status: STATUS_MAP[t.status] || t.status, rawStatus: t.status,
  priority: PRIORITY_MAP[t.priority] || t.priority, rawPriority: t.priority,
  assignees: (t.assignees || []).map((a) => ({ id: a.id, name: a.name, avatarColor: a.avatarColor })),
  project: null, projectId: t.projectId, deadline: t.deadline,
  labels: t.labels || [], subtasks: t.subtasks?.length || 0,
  completedSubtasks: t.subtasks?.filter((s) => s.completed).length || 0,
  subtaskItems: t.subtasks || [], attachments: t.attachments || [],
  commentCount: t.commentCount || 0, order: t.order, createdAt: t.createdAt, createdBy: t.createdBy,
});

// ═════════════════════════════════════════════════════════════════
// GANTT CHART (pure CSS/div, no external lib)
// ═════════════════════════════════════════════════════════════════
const PRIORITY_BAR_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#71717a' };

const GanttChart = ({ tasks, milestones = [], onTaskClick }) => {
  const [zoom, setZoom] = useState('month'); // week | month
  const today = startOfDay(new Date());
  const dayCount = zoom === 'week' ? 14 : 42;
  const startDate = addDays(today, -7);
  const dayWidth = zoom === 'week' ? 50 : 24;
  const totalWidth = dayCount * dayWidth;

  const days = Array.from({ length: dayCount }, (_, i) => addDays(startDate, i));
  const todayOffset = differenceInDays(today, startDate);

  const getBarStyle = (task) => {
    const created = task.createdAt ? startOfDay(new Date(task.createdAt)) : today;
    const deadline = task.deadline ? startOfDay(new Date(task.deadline)) : addDays(today, zoom === 'week' ? 7 : 21);
    const left = Math.max(0, differenceInDays(created, startDate)) * dayWidth;
    const duration = Math.max(1, differenceInDays(deadline, created) + 1);
    const width = duration * dayWidth;
    const isComplete = task.rawStatus === 'done';
    const isOverdue = !isComplete && task.deadline && isPast(new Date(task.deadline));
    const color = isComplete ? '#22c55e' : PRIORITY_BAR_COLORS[task.rawPriority] || '#71717a';

    return { left, width: Math.min(width, totalWidth - left), color, isComplete, isOverdue, hasDl: !!task.deadline };
  };

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-zinc-800 overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <h3 className="text-sm font-bold text-white">Gantt Timeline</h3>
        <div className="flex bg-zinc-900 rounded-lg p-0.5 gap-0.5">
          {['week', 'month'].map((z) => (
            <button key={z} onClick={() => setZoom(z)} className={clsx('px-3 py-1 rounded-md text-[10px] font-medium', zoom === z ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200')}>
              {z === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex overflow-x-auto">
        {/* Left panel: task names */}
        <div className="flex-shrink-0 w-56 border-r border-zinc-800">
          <div className="h-8 border-b border-zinc-800 px-3 flex items-center text-[9px] text-zinc-500 font-bold uppercase">Task</div>
          {tasks.map((task) => (
            <div key={task.id} onClick={() => onTaskClick?.(task)} className="h-9 px-3 flex items-center gap-2 border-b border-zinc-800/30 hover:bg-zinc-900/40 cursor-pointer text-xs">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_BAR_COLORS[task.rawPriority] || '#71717a' }} />
              <span className={clsx('truncate flex-1', task.rawStatus === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200')}>{task.title}</span>
              {task.assignees?.[0] && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0" style={{ backgroundColor: task.assignees[0].avatarColor || '#6366f1' }}>
                  {task.assignees[0].name?.charAt(0)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right panel: timeline */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: totalWidth, minWidth: '100%' }} className="relative">
            {/* Day headers */}
            <div className="flex h-8 border-b border-zinc-800">
              {days.map((d, i) => (
                <div key={i} className={clsx('flex-shrink-0 flex items-center justify-center text-[8px] border-r border-zinc-800/30', isTodayFn(d) ? 'bg-blue-500/10 text-blue-400 font-bold' : isSameDay(d, addDays(today, 0)) ? '' : 'text-zinc-600')} style={{ width: dayWidth }}>
                  {zoom === 'week' ? format(d, 'EEE d') : (d.getDate() === 1 || i === 0 ? format(d, 'MMM d') : d.getDate() % 5 === 0 ? format(d, 'd') : '')}
                </div>
              ))}
            </div>

            {/* Today line */}
            <div className="absolute top-8 bottom-0 w-0.5 bg-blue-500/60 z-10" style={{ left: todayOffset * dayWidth + dayWidth / 2 }} />

            {/* Milestone markers */}
            {milestones.map((ms) => {
              if (!ms.targetDate) return null;
              const offset = differenceInDays(startOfDay(new Date(ms.targetDate)), startDate);
              if (offset < 0 || offset >= dayCount) return null;
              return (
                <div key={ms.id} className="absolute top-8 z-20" style={{ left: offset * dayWidth + dayWidth / 2 - 6 }} title={ms.title}>
                  <Diamond size={12} className={ms.completed ? 'text-green-400' : 'text-purple-400'} fill={ms.completed ? '#22c55e' : '#a855f7'} />
                </div>
              );
            })}

            {/* Task bars */}
            {tasks.map((task) => {
              const bar = getBarStyle(task);
              return (
                <div key={task.id} className="h-9 relative border-b border-zinc-800/20 flex items-center" onClick={() => onTaskClick?.(task)}>
                  <div
                    className={clsx('absolute h-5 rounded cursor-pointer transition-all hover:brightness-125', bar.isComplete && 'opacity-70')}
                    style={{
                      left: bar.left,
                      width: Math.max(bar.width, dayWidth),
                      backgroundColor: bar.color,
                      ...(bar.isOverdue ? { backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.2) 3px,rgba(0,0,0,0.2) 6px)' } : {}),
                      ...(!bar.hasDl ? { borderStyle: 'dashed', borderWidth: '1px', borderColor: bar.color, backgroundColor: bar.color + '30' } : {}),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// PROJECT DETAIL PAGE
// ═════════════════════════════════════════════════════════════════
const TABS = ['Overview', 'Tasks', 'Milestones', 'Members', 'Files', 'Gantt'];

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedTask, setSelectedTask] = useState(null);
  const [activities, setActivities] = useState([]);

  // Milestones
  const [newMsTitle, setNewMsTitle] = useState('');
  const [newMsDate, setNewMsDate] = useState('');

  // Members
  const [allUsers, setAllUsers] = useState([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Filters for Tasks tab
  const [filters, setFilters] = useState({ projectIds: [], assigneeIds: [], priorities: [], dueBefore: '' });

  const fetchProject = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
    } catch { toast.error('Failed to load project'); navigate('/projects'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchProject(); }, [fetchProject]);
  useEffect(() => {
    api.get('/activities', { params: { projectId: id, limit: 10 } }).then((r) => setActivities(r.data.activities || [])).catch(() => {});
    api.get('/users').then((r) => setAllUsers(r.data || [])).catch(() => {});
  }, [id]);

  // Transform tasks for board components
  const allTasks = useMemo(() => (project?.tasks || []).map(transformTask), [project]);

  const filteredTasks = useMemo(() => {
    let result = allTasks;
    if (filters.assigneeIds.length) result = result.filter((t) => t.assignees?.some((a) => filters.assigneeIds.includes(a.id)));
    if (filters.priorities.length) result = result.filter((t) => filters.priorities.includes(t.rawPriority));
    return result;
  }, [allTasks, filters]);

  const columns = useMemo(() => ({
    Todo: filteredTasks.filter((t) => t.status === 'Todo'),
    'In Progress': filteredTasks.filter((t) => t.status === 'In Progress'),
    Review: filteredTasks.filter((t) => t.status === 'Review'),
    Done: filteredTasks.filter((t) => t.status === 'Done'),
  }), [filteredTasks]);

  const handleDragEnd = useCallback(async (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const statusMap = { Todo: 'todo', 'In Progress': 'in_progress', Review: 'review', Done: 'done' };
    try {
      await api.put(`/tasks/${draggableId}`, { status: statusMap[destination.droppableId] });
      toast.success(`Moved to ${destination.droppableId}`);
      fetchProject();
    } catch { toast.error('Failed to move task'); }
  }, [fetchProject]);

  // Milestones
  const handleAddMilestone = async () => {
    if (!newMsTitle.trim()) return;
    try {
      await api.post(`/projects/${id}/milestones`, { title: newMsTitle, targetDate: newMsDate || undefined });
      setNewMsTitle(''); setNewMsDate('');
      fetchProject();
    } catch { toast.error('Failed to add milestone'); }
  };

  const handleToggleMilestone = async (msId) => {
    try { await api.patch(`/projects/${id}/milestones/${msId}`); fetchProject(); } catch { toast.error('Failed'); }
  };

  const handleDeleteMilestone = async (msId) => {
    try { await api.delete(`/projects/${id}/milestones/${msId}`); fetchProject(); } catch { toast.error('Failed'); }
  };

  // Members
  const handleAddMember = async (userId) => {
    try { await api.post(`/projects/${id}/members`, { userId }); fetchProject(); toast.success('Member added'); } catch { toast.error('Failed'); }
  };
  const handleRemoveMember = async (userId) => {
    try { await api.delete(`/projects/${id}/members/${userId}`); fetchProject(); toast.success('Member removed'); } catch { toast.error('Failed'); }
  };

  // Files: gather all attachments from all tasks
  const allFiles = useMemo(() => {
    const files = [];
    (project?.tasks || []).forEach((t) => {
      (Array.isArray(t.attachments) ? t.attachments : []).forEach((att) => {
        files.push({ ...att, taskTitle: t.title, taskId: t.id, uploaderName: t.createdBy?.name || '' });
      });
    });
    return files;
  }, [project]);

  // Member workload for overview
  const memberWorkload = useMemo(() => {
    const map = {};
    allTasks.forEach((t) => {
      t.assignees.forEach((a) => {
        if (!map[a.id]) map[a.id] = { name: a.name, avatarColor: a.avatarColor, count: 0 };
        map[a.id].count++;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [allTasks]);

  const memberIds = useMemo(() => (project?.members || []).map((m) => m.id), [project]);

  if (loading) return <PageTransition><div className="space-y-6"><Skeleton variant="title" className="w-64" /><Skeleton variant="card" className="h-40" /><Skeleton variant="card" className="h-96" /></div></PageTransition>;
  if (!project) return null;

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/projects')} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors mt-1"><ArrowLeft size={18} /></button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: project.color }} />
              <h1 className="text-2xl font-bold text-white truncate">{project.name}</h1>
              <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                project.status === 'active' ? 'bg-green-500/10 text-green-400' : project.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-500/10 text-zinc-400',
              )}>{project.status}</span>
            </div>
            {project.description && <p className="text-sm text-zinc-500 mb-2">{project.description}</p>}
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><ListTodo size={12} /> {project.taskCount} tasks</span>
              <span className="flex items-center gap-1"><Users size={12} /> {project.memberCount} members</span>
              {project.nearestDeadline && <span className="flex items-center gap-1"><Calendar size={12} /> Next: {format(new Date(project.nearestDeadline), 'MMM d')}</span>}
              <div className="flex -space-x-1.5">
                {project.members?.slice(0, 5).map((m) => (
                  <div key={m.id} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-black" style={{ backgroundColor: m.avatarColor || '#6366f1' }}>{m.name?.charAt(0)}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-zinc-900/50 p-0.5 rounded-xl w-fit overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={clsx('px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap', activeTab === tab ? 'bg-[#111] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200')}>
              {tab}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[#111] p-4 rounded-xl border border-zinc-800"><p className="text-[10px] text-zinc-500">Total Tasks</p><p className="text-2xl font-bold text-white">{project.taskCount}</p></div>
              <div className="bg-[#111] p-4 rounded-xl border border-zinc-800"><p className="text-[10px] text-green-400">Completed</p><p className="text-2xl font-bold text-white">{project.completedCount}</p></div>
              <div className="bg-[#111] p-4 rounded-xl border border-zinc-800"><p className="text-[10px] text-blue-400">In Progress</p><p className="text-2xl font-bold text-white">{allTasks.filter((t) => t.status === 'In Progress').length}</p></div>
              <div className="bg-[#111] p-4 rounded-xl border border-zinc-800"><p className="text-[10px] text-red-400">Overdue</p><p className="text-2xl font-bold text-white">{project.overdueCount}</p></div>
              <div className="bg-[#111] p-4 rounded-xl border border-zinc-800 flex items-center justify-center">
                <ProgressRing percent={project.progressPercent || 0} size={80} stroke={6} color={project.color} />
              </div>
            </div>

            {/* Workload chart */}
            {memberWorkload.length > 0 && (
              <div className="bg-[#111] p-5 rounded-xl border border-zinc-800">
                <h3 className="text-sm font-bold text-white mb-4">Member Workload</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={memberWorkload} margin={{ bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" name="Tasks" fill={project.color || '#3b82f6'} radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent activity */}
            {activities.length > 0 && (
              <div className="bg-[#111] p-5 rounded-xl border border-zinc-800">
                <h3 className="text-sm font-bold text-white mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {activities.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 text-xs">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: a.user?.avatarColor || '#3b82f6' }}>{a.user?.name?.charAt(0)}</div>
                      <div><span className="text-zinc-300"><span className="text-white font-medium">{a.user?.name}</span> {a.details}</span><p className="text-[10px] text-zinc-600">{a.createdAt ? format(new Date(a.createdAt), 'MMM d, h:mm a') : ''}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TASKS TAB ─── */}
        {activeTab === 'Tasks' && (
          <div className="space-y-4">
            <FilterBar filters={filters} onChange={setFilters} />
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Object.keys(columns).map((status) => (
                  <BoardColumn key={status} id={status} title={status} tasks={columns[status]} onTaskClick={setSelectedTask} onTaskCreated={fetchProject} />
                ))}
              </div>
            </DragDropContext>
          </div>
        )}

        {/* ─── MILESTONES TAB ─── */}
        {activeTab === 'Milestones' && (
          <div className="max-w-2xl">
            <div className="space-y-3">
              {(project.milestones || []).map((ms) => (
                <div key={ms.id} className={clsx('flex items-start gap-3 p-4 bg-[#111] rounded-xl border border-zinc-800 transition-colors', ms.completed && 'opacity-60')}>
                  <button onClick={() => handleToggleMilestone(ms.id)} className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors', ms.completed ? 'bg-green-500 border-green-500' : 'border-zinc-600 hover:border-green-500')}>
                    {ms.completed && <Check size={12} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-medium', ms.completed ? 'text-zinc-500 line-through' : 'text-white')}>{ms.title}</p>
                    {ms.description && <p className="text-xs text-zinc-500 mt-0.5">{ms.description}</p>}
                    {ms.targetDate && <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1"><Calendar size={10} /> {format(new Date(ms.targetDate), 'MMM d, yyyy')}</p>}
                  </div>
                  <button onClick={() => handleDeleteMilestone(ms.id)} className="text-zinc-600 hover:text-red-400 p-1 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
              {(project.milestones || []).length === 0 && <p className="text-sm text-zinc-500 p-4">No milestones yet.</p>}
            </div>
            {/* Add milestone form */}
            <div className="flex items-center gap-2 mt-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <input type="text" value={newMsTitle} onChange={(e) => setNewMsTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()} placeholder="Milestone title" className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={newMsDate} onChange={(e) => setNewMsDate(e.target.value)} className="px-3 py-2 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none" />
              <button onClick={handleAddMilestone} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"><Plus size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── MEMBERS TAB ─── */}
        {activeTab === 'Members' && (
          <div className="max-w-2xl space-y-3">
            {(project.members || []).map((m) => {
              const taskCount = allTasks.filter((t) => t.assignees.some((a) => a.id === m.id)).length;
              return (
                <div key={m.id} className="flex items-center gap-3 p-4 bg-[#111] rounded-xl border border-zinc-800">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: m.avatarColor || '#6366f1' }}>{m.name?.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-[10px] text-zinc-500">{m.role || 'Member'} · {taskCount} tasks</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleRemoveMember(m.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">Remove</button>
                  )}
                </div>
              );
            })}

            {isAdmin && (
              <div className="relative">
                <button onClick={() => setShowMemberPicker(!showMemberPicker)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"><Plus size={13} /> Add Member</button>
                {showMemberPicker && (
                  <div className="absolute top-full mt-1 left-0 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-64 max-h-48 overflow-y-auto py-1">
                    {allUsers.filter((u) => !memberIds.includes(u.id)).map((u) => (
                      <button key={u.id} onClick={() => { handleAddMember(u.id); setShowMemberPicker(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: u.avatarColor || '#6366f1' }}>{u.name?.charAt(0)}</div>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── FILES TAB ─── */}
        {activeTab === 'Files' && (
          <div className="max-w-3xl">
            {allFiles.length === 0 ? (
              <p className="text-sm text-zinc-500 p-4">No files uploaded to tasks in this project.</p>
            ) : (
              <div className="bg-[#0a0a0a] rounded-xl border border-zinc-800 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-zinc-800 text-[9px] font-bold text-zinc-500 uppercase">
                  <div className="col-span-4">File</div><div className="col-span-3">Task</div><div className="col-span-2">Date</div><div className="col-span-2">Size</div><div className="col-span-1"></div>
                </div>
                {allFiles.map((f, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-zinc-800/30 items-center text-xs hover:bg-zinc-900/40">
                    <div className="col-span-4 flex items-center gap-2 min-w-0"><Paperclip size={12} className="text-zinc-500 flex-shrink-0" /><span className="text-zinc-200 truncate">{f.originalname || f.name || 'file'}</span></div>
                    <div className="col-span-3 text-zinc-500 truncate">{f.taskTitle}</div>
                    <div className="col-span-2 text-zinc-600">{f.uploadedAt ? format(new Date(f.uploadedAt), 'MMM d') : '—'}</div>
                    <div className="col-span-2 text-zinc-600">{f.size ? `${(f.size / 1024).toFixed(0)} KB` : '—'}</div>
                    <div className="col-span-1">{f.path && <a href={f.path} download className="text-blue-400 hover:text-blue-300"><Download size={12} /></a>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── GANTT TAB ─── */}
        {activeTab === 'Gantt' && (
          <GanttChart tasks={allTasks} milestones={project.milestones || []} onTaskClick={setSelectedTask} />
        )}
      </div>

      {/* Task Detail Drawer */}
      <AnimatePresence>
        {selectedTask && <TaskDetailDrawer task={selectedTask} onClose={() => { setSelectedTask(null); fetchProject(); }} />}
      </AnimatePresence>
    </PageTransition>
  );
};

export default ProjectDetailPage;
