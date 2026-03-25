import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList, ListTodo, Clock, Eye, CheckCircle2, Calendar,
  FolderOpen, Inbox, Users, User, ChevronDown, ArrowUpDown,
  Flame, TrendingUp, Target, CheckSquare, MessageSquare,
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday, isPast } from 'date-fns';
import clsx from 'clsx';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import PageTransition from '../components/common/PageTransition';
import Skeleton from '../components/common/Skeleton';
import FilterBar from '../components/shared/FilterBar';
import TaskDetailDrawer from '../components/shared/TaskDetailDrawer';
import api from '../services/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = [
  { key: 'Todo', icon: ListTodo, bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-400', dotColor: 'bg-zinc-500', borderColor: 'border-zinc-500' },
  { key: 'In Progress', icon: Clock, bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', dotColor: 'bg-blue-500', borderColor: 'border-blue-500' },
  { key: 'Review', icon: Eye, bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400', dotColor: 'bg-yellow-500', borderColor: 'border-yellow-500' },
  { key: 'Done', icon: CheckCircle2, bgColor: 'bg-green-500/10', textColor: 'text-green-400', dotColor: 'bg-green-500', borderColor: 'border-green-500' },
];

const PRIORITY_BORDER = {
  Critical: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-yellow-500',
  Low: 'border-l-green-500',
};
const PRIORITY_BADGE = {
  Critical: 'bg-red-500/10 text-red-400',
  High: 'bg-orange-500/10 text-orange-400',
  Medium: 'bg-yellow-500/10 text-yellow-400',
  Low: 'bg-green-500/10 text-green-400',
};

const SORT_OPTIONS = [
  { value: 'dueDate-asc', label: 'Due Date (earliest)' },
  { value: 'dueDate-desc', label: 'Due Date (latest)' },
  { value: 'priority-desc', label: 'Priority (high→low)' },
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
  { value: 'alpha-asc', label: 'A → Z' },
];

const PRIORITY_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };

// ── Calendar Strip ─────────────────────────────────────────────
const CalendarStrip = ({ tasks, selectedDay, onDaySelect }) => {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {days.map((day) => {
        const dayTasks = tasks.filter((t) => t.deadline && isSameDay(new Date(t.deadline), day));
        const isSelected = selectedDay && isSameDay(day, selectedDay);
        const today = isToday(day);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onDaySelect(isSelected ? null : day)}
            className={clsx(
              'flex flex-col items-center px-4 py-2.5 rounded-xl transition-all min-w-[72px] border',
              isSelected ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' :
              today ? 'bg-zinc-800/80 border-blue-500/30 text-white' :
              'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700',
            )}
          >
            <span className="text-[10px] font-medium uppercase">{format(day, 'EEE')}</span>
            <span className={clsx(
              'text-lg font-bold mt-0.5',
              today && !isSelected ? 'text-blue-400' : '',
            )}>
              {format(day, 'd')}
            </span>
            {dayTasks.length > 0 && (
              <span className={clsx(
                'text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5',
                isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400',
              )}>
                {dayTasks.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ── Productivity Stats ─────────────────────────────────────────
const ProductivityStats = ({ data }) => {
  if (!data) return null;
  const pct = data.weeklyTarget > 0 ? Math.round((data.completedThisWeek / data.weeklyTarget) * 100) : 0;

  return (
    <div className="bg-[#111] rounded-xl border border-zinc-800 p-4">
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <TrendingUp size={12} /> Productivity
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-blue-400" />
            <span className="text-[10px] text-zinc-500">Weekly Goal</span>
          </div>
          <p className="text-lg font-bold text-white">{data.completedThisWeek}<span className="text-zinc-500 text-sm font-normal">/{data.weeklyTarget}</span></p>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-[10px] text-zinc-500">Avg/Day</span>
          </div>
          <p className="text-lg font-bold text-white">{data.avgPerDay}</p>
          <p className="text-[10px] text-zinc-600">this month</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame size={14} className="text-orange-400" />
            <span className="text-[10px] text-zinc-500">Streak</span>
          </div>
          <p className="text-lg font-bold text-white">{data.streak}<span className="text-zinc-500 text-sm font-normal"> days</span></p>
          <p className="text-[10px] text-zinc-600">in a row</p>
        </div>
      </div>
    </div>
  );
};

// ── Task Row ───────────────────────────────────────────────────
const TaskRow = ({ task, onClick, showAssignees, onMarkDone }) => {
  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'Done';
  const subtaskTotal = task.subtasks || 0;
  const subtaskDone = task.completedSubtasks || 0;

  const handleCheck = (e) => {
    e.stopPropagation();
    onMarkDone(task);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={() => onClick(task)}
      className={clsx(
        'bg-[#111] p-3.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group border-l-3',
        PRIORITY_BORDER[task.priority] || 'border-l-zinc-500',
      )}
      style={{ borderLeftWidth: '3px' }}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        {task.status !== 'Done' && (
          <button
            onClick={handleCheck}
            className="w-5 h-5 rounded-full border-2 border-zinc-700 hover:border-green-500 hover:bg-green-500/20 transition-colors flex-shrink-0 group/check flex items-center justify-center"
            title="Mark as done"
          >
            <CheckCircle2 size={12} className="text-transparent group-hover/check:text-green-400" />
          </button>
        )}
        {task.status === 'Done' && (
          <div className="w-5 h-5 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={12} className="text-green-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded', PRIORITY_BADGE[task.priority])}>
              {task.priority}
            </span>
            {task.project && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: (task.project.color || '#6366f1') + '20', color: task.project.color || '#6366f1' }}>
                {task.project.name}
              </span>
            )}
            {subtaskTotal > 0 && (
              <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                <CheckSquare size={10} /> {subtaskDone}/{subtaskTotal}
              </span>
            )}
            {(task.commentCount || 0) > 0 && (
              <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                <MessageSquare size={10} /> {task.commentCount}
              </span>
            )}
          </div>
          <h4 className={clsx('text-sm font-semibold group-hover:text-blue-400 transition-colors truncate', task.status === 'Done' ? 'text-zinc-500 line-through' : 'text-white')}>
            {task.title}
          </h4>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {showAssignees && task.assignees?.length > 0 && (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <div key={a.id} className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[8px] ring-1 ring-[#111]" style={{ backgroundColor: a.avatarColor || '#6366f1' }} title={a.name}>{a.name?.charAt(0)}</div>
              ))}
              {task.assignees.length > 3 && <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-[8px] font-bold ring-1 ring-[#111]">+{task.assignees.length - 3}</div>}
            </div>
          )}
          {task.deadline && (
            <span className={clsx('text-[11px] flex items-center gap-0.5', isOverdue ? 'text-red-400 font-medium' : 'text-zinc-500')}>
              <Calendar size={11} /> {format(new Date(task.deadline), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Status Group ───────────────────────────────────────────────
const StatusGroup = ({ config, tasks, onTaskClick, showAssignees, onMarkDone }) => {
  const Icon = config.icon;
  if (tasks.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <div className={clsx('p-1.5 rounded-lg', config.bgColor, config.textColor)}><Icon size={14} /></div>
        <h3 className="font-bold text-zinc-200 text-sm">{config.key}</h3>
        <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] font-bold">{tasks.length}</span>
      </div>
      <div className="space-y-1.5 ml-8">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => <TaskRow key={task.id} task={task} onClick={onTaskClick} showAssignees={showAssignees} onMarkDone={onMarkDone} />)}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// YOUR TASKS PAGE
// ═════════════════════════════════════════════════════════════════
const YourTasksPage = () => {
  const user = useAuthStore((state) => state.user);
  const { myTasks, isLoadingMyTasks, fetchMyTasks } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('my');
  const [statusFilter, setStatusFilter] = useState(null);
  const [sortBy, setSortBy] = useState('dueDate-asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [filters, setFilters] = useState({ projectIds: [], assigneeIds: [], priorities: [], dueBefore: '' });

  const userId = user?.id || user?._id;

  useEffect(() => {
    if (userId) fetchMyTasks(userId);
    api.get('/dashboard/my-productivity').then((r) => setProductivity(r.data)).catch(() => {});
  }, [userId, fetchMyTasks]);

  // Split tasks
  const { soloTasks, groupTasks } = useMemo(() => {
    const solo = [];
    const group = [];
    myTasks.forEach((t) => {
      if (t.assignees?.length > 1) group.push(t);
      else solo.push(t);
    });
    return { soloTasks: solo, groupTasks: group };
  }, [myTasks]);

  const activeTasks = activeTab === 'my' ? soloTasks : groupTasks;

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = activeTasks;
    if (statusFilter) result = result.filter((t) => t.status === statusFilter);
    if (filters.projectIds.length) result = result.filter((t) => t.projectId && filters.projectIds.includes(t.projectId));
    if (filters.priorities.length) result = result.filter((t) => filters.priorities.includes(t.rawPriority || t.priority?.toLowerCase()));
    if (filters.dueBefore) {
      const cutoff = new Date(filters.dueBefore);
      cutoff.setHours(23, 59, 59, 999);
      result = result.filter((t) => t.deadline && new Date(t.deadline) <= cutoff);
    }
    if (selectedDay) result = result.filter((t) => t.deadline && isSameDay(new Date(t.deadline), selectedDay));
    return result;
  }, [activeTasks, statusFilter, filters, selectedDay]);

  // Sort
  const sortedTasks = useMemo(() => {
    const [field, dir] = sortBy.split('-');
    const sorted = [...filteredTasks];
    sorted.sort((a, b) => {
      if (field === 'dueDate') {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return dir === 'asc' ? da - db : db - da;
      }
      if (field === 'priority') {
        const pa = PRIORITY_WEIGHT[a.priority] || 0;
        const pb = PRIORITY_WEIGHT[b.priority] || 0;
        return dir === 'desc' ? pb - pa : pa - pb;
      }
      if (field === 'createdAt') {
        const ca = new Date(a.createdAt || 0).getTime();
        const cb = new Date(b.createdAt || 0).getTime();
        return dir === 'desc' ? cb - ca : ca - cb;
      }
      if (field === 'alpha') {
        return dir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      return 0;
    });
    return sorted;
  }, [filteredTasks, sortBy]);

  // Group by status
  const grouped = useMemo(() => ({
    'Todo': sortedTasks.filter((t) => t.status === 'Todo'),
    'In Progress': sortedTasks.filter((t) => t.status === 'In Progress'),
    'Review': sortedTasks.filter((t) => t.status === 'Review'),
    'Done': sortedTasks.filter((t) => t.status === 'Done'),
  }), [sortedTasks]);

  const statusCounts = useMemo(() => ({
    'Todo': activeTasks.filter((t) => t.status === 'Todo').length,
    'In Progress': activeTasks.filter((t) => t.status === 'In Progress').length,
    'Review': activeTasks.filter((t) => t.status === 'Review').length,
    'Done': activeTasks.filter((t) => t.status === 'Done').length,
  }), [activeTasks]);

  const handleMarkDone = useCallback(async (task) => {
    const taskId = task.id || task._id;
    try {
      await api.put(`/tasks/${taskId}`, { status: 'done' });
      toast.success(
        (t) => (
          <span className="flex items-center gap-2">
            Task completed!
            <button onClick={() => { api.put(`/tasks/${taskId}`, { status: task.rawStatus || 'todo' }).then(() => { fetchMyTasks(userId); }); toast.dismiss(t.id); }} className="text-blue-400 text-xs font-medium underline">
              Undo
            </button>
          </span>
        ),
        { duration: 5000 }
      );
      fetchMyTasks(userId);
    } catch { toast.error('Failed to update task'); }
  }, [userId, fetchMyTasks]);

  const handleModalClose = () => {
    setSelectedTask(null);
    if (userId) fetchMyTasks(userId);
  };

  if (isLoadingMyTasks) {
    return (
      <div className="space-y-6">
        <Skeleton variant="title" className="w-48" />
        <Skeleton variant="text" className="w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="card" className="h-20" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="card" className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Your Tasks</h1>
            <p className="text-zinc-500 text-sm">
              {myTasks.length > 0
                ? `${myTasks.length} task${myTasks.length !== 1 ? 's' : ''} — ${soloTasks.length} personal, ${groupTasks.length} group`
                : 'No tasks assigned to you yet'}
            </p>
          </div>
          {/* Sort */}
          <div className="relative">
            <button onClick={() => setShowSortMenu(!showSortMenu)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
              <ArrowUpDown size={13} /> {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
              <ChevronDown size={11} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-48 py-1">
                {SORT_OPTIONS.map((s) => (
                  <button key={s.value} onClick={() => { setSortBy(s.value); setShowSortMenu(false); }} className={clsx('w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800', sortBy === s.value ? 'text-blue-400 font-medium' : 'text-zinc-300')}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Week Calendar */}
        <CalendarStrip tasks={activeTasks} selectedDay={selectedDay} onDaySelect={setSelectedDay} />

        {/* Productivity */}
        <ProductivityStats data={productivity} />

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl w-fit">
          <button onClick={() => { setActiveTab('my'); setStatusFilter(null); setSelectedDay(null); }} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === 'my' ? 'bg-[#111] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200')}>
            <User size={15} /> My Tasks
            <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-bold', activeTab === 'my' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500')}>{soloTasks.length}</span>
          </button>
          <button onClick={() => { setActiveTab('group'); setStatusFilter(null); setSelectedDay(null); }} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === 'group' ? 'bg-[#111] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200')}>
            <Users size={15} /> Group Tasks
            <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-bold', activeTab === 'group' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500')}>{groupTasks.length}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATUS_CONFIG.map((cfg) => {
            const isActive = statusFilter === cfg.key;
            return (
              <button key={cfg.key} onClick={() => setStatusFilter((p) => p === cfg.key ? null : cfg.key)} className={clsx('bg-[#111] p-3 rounded-xl border transition-all text-left', isActive ? `${cfg.borderColor} ring-1 ${cfg.borderColor.replace('border-', 'ring-')}` : 'border-zinc-800 hover:border-zinc-700')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-zinc-500">{cfg.key}</p>
                    <p className="text-xl font-bold text-white mt-0.5">{statusCounts[cfg.key]}</p>
                  </div>
                  <div className={clsx('p-1.5 rounded-lg', cfg.bgColor, cfg.textColor)}><cfg.icon size={16} /></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty states */}
        {activeTasks.length === 0 && (
          <div className="bg-[#111] p-10 rounded-2xl border border-zinc-800 text-center">
            {activeTab === 'my' ? (
              <><User size={40} className="mx-auto text-zinc-600 mb-3" /><h3 className="text-base font-bold text-white mb-1">No personal tasks</h3><p className="text-zinc-500 text-sm">Tasks assigned only to you will appear here.</p></>
            ) : (
              <><Users size={40} className="mx-auto text-zinc-600 mb-3" /><h3 className="text-base font-bold text-white mb-1">No group tasks</h3><p className="text-zinc-500 text-sm">Tasks shared with others will appear here.</p></>
            )}
          </div>
        )}

        {activeTasks.length > 0 && sortedTasks.length === 0 && (
          <div className="bg-[#111] p-8 rounded-2xl border border-zinc-800 text-center">
            <Inbox size={32} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-zinc-500 text-sm">No tasks match your filters</p>
          </div>
        )}

        {/* Task list grouped by status */}
        {sortedTasks.length > 0 && (
          <div className="space-y-6">
            {STATUS_CONFIG.map((cfg) => (
              <StatusGroup key={cfg.key} config={cfg} tasks={grouped[cfg.key]} onTaskClick={setSelectedTask} showAssignees={activeTab === 'group'} onMarkDone={handleMarkDone} />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedTask && <TaskDetailDrawer task={selectedTask} onClose={handleModalClose} />}
      </AnimatePresence>
    </PageTransition>
  );
};

export default YourTasksPage;
