import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  ListTodo,
  Clock,
  Eye,
  CheckCircle2,
  Calendar,
  FolderOpen,
  Inbox,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import PageTransition from '../components/common/PageTransition';
import Skeleton from '../components/common/Skeleton';
import TaskModal from '../components/board/TaskModal';

const STATUS_CONFIG = [
  { key: 'Todo', icon: ListTodo, bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-400', dotColor: 'bg-zinc-500' },
  { key: 'In Progress', icon: Clock, bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', dotColor: 'bg-blue-500' },
  { key: 'Review', icon: Eye, bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400', dotColor: 'bg-yellow-500' },
  { key: 'Done', icon: CheckCircle2, bgColor: 'bg-green-500/10', textColor: 'text-green-400', dotColor: 'bg-green-500' },
];

const PRIORITY_COLORS = {
  Critical: 'bg-red-500/10 text-red-400',
  High: 'bg-orange-500/10 text-orange-400',
  Medium: 'bg-yellow-500/10 text-yellow-400',
  Low: 'bg-green-500/10 text-green-400',
};

const TaskRow = ({ task, onClick }) => {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Done';

  return (
    <div
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
          {task.deadline && (
            <span className={clsx('text-xs flex items-center', isOverdue ? 'text-red-400' : 'text-zinc-500')}>
              <Calendar size={14} className="mr-1" />
              {format(new Date(task.deadline), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusGroup = ({ config, tasks, onTaskClick }) => {
  const Icon = config.icon;

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
      {tasks.length > 0 ? (
        <div className="space-y-2 ml-9">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-600 ml-9">No tasks</p>
      )}
    </div>
  );
};

const YourTasksPage = () => {
  const user = useAuthStore((state) => state.user);
  const { myTasks, isLoadingMyTasks, fetchMyTasks } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    if (user?.id || user?._id) {
      fetchMyTasks(user._id);
    }
  }, [user?.id || user?._id, fetchMyTasks]);

  const grouped = useMemo(() => ({
    'Todo': myTasks.filter((t) => t.status === 'Todo'),
    'In Progress': myTasks.filter((t) => t.status === 'In Progress'),
    'Review': myTasks.filter((t) => t.status === 'Review'),
    'Done': myTasks.filter((t) => t.status === 'Done'),
  }), [myTasks]);

  const totalTasks = myTasks.length;
  const completedTasks = grouped.Done.length;

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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Your Tasks</h1>
          <p className="text-zinc-500">
            {totalTasks > 0
              ? `You have ${totalTasks} task${totalTasks !== 1 ? 's' : ''} assigned — ${completedTasks} completed`
              : 'No tasks assigned to you yet'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATUS_CONFIG.map((cfg) => (
            <div key={cfg.key} className="bg-[#111] p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500">{cfg.key}</p>
                  <p className="text-2xl font-bold text-white mt-1">{grouped[cfg.key].length}</p>
                </div>
                <div className={clsx('p-2 rounded-lg', cfg.bgColor, cfg.textColor)}>
                  <cfg.icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {totalTasks === 0 && (
          <div className="bg-[#111] p-12 rounded-2xl border border-zinc-800 text-center">
            <Inbox size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No tasks assigned</h3>
            <p className="text-zinc-500 text-sm">When someone assigns a task to you, it will show up here.</p>
          </div>
        )}

        {/* Tasks grouped by status */}
        {totalTasks > 0 && (
          <div className="space-y-8">
            {STATUS_CONFIG.map((cfg) => (
              <StatusGroup
                key={cfg.key}
                config={cfg}
                tasks={grouped[cfg.key]}
                onTaskClick={setSelectedTask}
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
            onClose={() => {
              setSelectedTask(null);
              if (user?.id || user?._id) fetchMyTasks(user._id);
            }}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default YourTasksPage;
