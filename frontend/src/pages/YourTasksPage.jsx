import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList,
  ListTodo,
  Clock,
  Eye,
  CheckCircle2,
  Calendar,
  FolderOpen,
  Inbox,
  Users,
  User,
  Filter,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import PageTransition from '../components/common/PageTransition';
import Skeleton from '../components/common/Skeleton';
import TaskModal from '../components/board/TaskModal';

const STATUS_CONFIG = [
  { key: 'Todo', icon: ListTodo, bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-400', dotColor: 'bg-zinc-500', borderColor: 'border-zinc-500' },
  { key: 'In Progress', icon: Clock, bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', dotColor: 'bg-blue-500', borderColor: 'border-blue-500' },
  { key: 'Review', icon: Eye, bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400', dotColor: 'bg-yellow-500', borderColor: 'border-yellow-500' },
  { key: 'Done', icon: CheckCircle2, bgColor: 'bg-green-500/10', textColor: 'text-green-400', dotColor: 'bg-green-500', borderColor: 'border-green-500' },
];

const PRIORITY_COLORS = {
  Critical: 'bg-red-500/10 text-red-400',
  High: 'bg-orange-500/10 text-orange-400',
  Medium: 'bg-yellow-500/10 text-yellow-400',
  Low: 'bg-green-500/10 text-green-400',
};

const TaskRow = ({ task, onClick, showAssignees }) => {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={() => onClick(task)}
      className="bg-[#111] p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded', PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Low)}>
              {task.priority}
            </span>
            {task.project && (
              <span className="text-xs text-zinc-500 flex items-center">
                <FolderOpen size={12} className="mr-1" />
                {task.project.name}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
            {task.title}
          </h4>
        </div>
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {showAssignees && task.assignees && task.assignees.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] ring-2 ring-[#111]"
                  style={{ backgroundColor: a.avatarColor || '#6366f1' }}
                  title={a.name}
                >
                  {a.name?.charAt(0) || '?'}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 font-bold text-[10px] bg-zinc-800 ring-2 ring-[#111]">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
          {task.deadline && (
            <span className={clsx('text-xs flex items-center', isOverdue ? 'text-red-400' : 'text-zinc-500')}>
              <Calendar size={14} className="mr-1" />
              {format(new Date(task.deadline), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const StatusGroup = ({ config, tasks, onTaskClick, showAssignees }) => {
  const Icon = config.icon;

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={clsx('p-1.5 rounded-lg', config.bgColor, config.textColor)}>
          <Icon size={16} />
        </div>
        <h3 className="font-bold text-zinc-200">{config.key}</h3>
        <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-xs font-bold">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2 ml-9">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={onTaskClick} showAssignees={showAssignees} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const YourTasksPage = () => {
  const user = useAuthStore((state) => state.user);
  const { myTasks, isLoadingMyTasks, fetchMyTasks } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'group'
  const [statusFilter, setStatusFilter] = useState(null); // null = all, or 'Todo' | 'In Progress' | 'Review' | 'Done'

  const userId = user?.id || user?._id;

  useEffect(() => {
    if (userId) {
      fetchMyTasks(userId);
    }
  }, [userId, fetchMyTasks]);

  // Split tasks into solo (my) and group
  const { soloTasks, groupTasks } = useMemo(() => {
    const solo = [];
    const group = [];
    myTasks.forEach((t) => {
      if (t.assignees && t.assignees.length > 1) {
        group.push(t);
      } else {
        solo.push(t);
      }
    });
    return { soloTasks: solo, groupTasks: group };
  }, [myTasks]);

  const activeTasks = activeTab === 'my' ? soloTasks : groupTasks;

  // Apply status filter
  const filteredTasks = useMemo(() => {
    if (!statusFilter) return activeTasks;
    return activeTasks.filter((t) => t.status === statusFilter);
  }, [activeTasks, statusFilter]);

  // Group by status for display
  const grouped = useMemo(() => ({
    'Todo': filteredTasks.filter((t) => t.status === 'Todo'),
    'In Progress': filteredTasks.filter((t) => t.status === 'In Progress'),
    'Review': filteredTasks.filter((t) => t.status === 'Review'),
    'Done': filteredTasks.filter((t) => t.status === 'Done'),
  }), [filteredTasks]);

  // Counts for the active tab (unfiltered)
  const statusCounts = useMemo(() => ({
    'Todo': activeTasks.filter((t) => t.status === 'Todo').length,
    'In Progress': activeTasks.filter((t) => t.status === 'In Progress').length,
    'Review': activeTasks.filter((t) => t.status === 'Review').length,
    'Done': activeTasks.filter((t) => t.status === 'Done').length,
  }), [activeTasks]);

  const totalTasks = activeTasks.length;
  const completedTasks = statusCounts.Done;

  const handleStatusCardClick = (statusKey) => {
    setStatusFilter((prev) => (prev === statusKey ? null : statusKey));
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleModalClose = () => {
    setSelectedTask(null);
    if (userId) fetchMyTasks(userId);
  };

  if (isLoadingMyTasks) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant="title" className="w-48" />
          <Skeleton variant="text" className="w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" className="h-20" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Your Tasks</h1>
          <p className="text-zinc-500">
            {myTasks.length > 0
              ? `You have ${myTasks.length} task${myTasks.length !== 1 ? 's' : ''} assigned — ${soloTasks.length} personal, ${groupTasks.length} group`
              : 'No tasks assigned to you yet'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab('my'); setStatusFilter(null); }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === 'my'
                ? 'bg-[#111] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            <User size={16} />
            My Tasks
            <span className={clsx(
              'px-1.5 py-0.5 rounded-full text-xs font-bold',
              activeTab === 'my' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500',
            )}>
              {soloTasks.length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('group'); setStatusFilter(null); }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === 'group'
                ? 'bg-[#111] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            <Users size={16} />
            Group Tasks
            <span className={clsx(
              'px-1.5 py-0.5 rounded-full text-xs font-bold',
              activeTab === 'group' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500',
            )}>
              {groupTasks.length}
            </span>
          </button>
        </div>

        {/* Summary Cards — clickable to filter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATUS_CONFIG.map((cfg) => {
            const isActive = statusFilter === cfg.key;
            return (
              <button
                key={cfg.key}
                onClick={() => handleStatusCardClick(cfg.key)}
                className={clsx(
                  'bg-[#111] p-4 rounded-xl border transition-all text-left',
                  isActive
                    ? `${cfg.borderColor} ring-1 ${cfg.borderColor.replace('border-', 'ring-')}`
                    : 'border-zinc-800 hover:border-zinc-700',
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-500">{cfg.key}</p>
                    <p className="text-2xl font-bold text-white mt-1">{statusCounts[cfg.key]}</p>
                  </div>
                  <div className={clsx('p-2 rounded-lg', cfg.bgColor, cfg.textColor)}>
                    <cfg.icon size={20} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active filter indicator */}
        {statusFilter && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-500" />
            <span className="text-sm text-zinc-400">
              Showing <span className="text-white font-medium">{statusFilter}</span> tasks
            </span>
            <button
              onClick={() => setStatusFilter(null)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded hover:bg-zinc-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Empty State */}
        {totalTasks === 0 && (
          <div className="bg-[#111] p-12 rounded-2xl border border-zinc-800 text-center">
            {activeTab === 'my' ? (
              <>
                <User size={48} className="mx-auto text-zinc-600 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No personal tasks</h3>
                <p className="text-zinc-500 text-sm">Tasks assigned only to you will appear here.</p>
              </>
            ) : (
              <>
                <Users size={48} className="mx-auto text-zinc-600 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No group tasks</h3>
                <p className="text-zinc-500 text-sm">Tasks assigned to you and others will appear here.</p>
              </>
            )}
          </div>
        )}

        {/* Filtered empty state */}
        {totalTasks > 0 && filteredTasks.length === 0 && statusFilter && (
          <div className="bg-[#111] p-8 rounded-2xl border border-zinc-800 text-center">
            <Inbox size={36} className="mx-auto text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No {statusFilter} tasks</h3>
            <p className="text-zinc-500 text-sm">You don't have any {activeTab === 'group' ? 'group ' : ''}tasks with this status.</p>
          </div>
        )}

        {/* Tasks grouped by status */}
        {filteredTasks.length > 0 && (
          <div className="space-y-8">
            {STATUS_CONFIG.map((cfg) => (
              <StatusGroup
                key={cfg.key}
                config={cfg}
                tasks={grouped[cfg.key]}
                onTaskClick={handleTaskClick}
                showAssignees={activeTab === 'group'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={handleModalClose}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default YourTasksPage;
