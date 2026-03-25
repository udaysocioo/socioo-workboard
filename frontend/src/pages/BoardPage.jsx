import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Skeleton from '../components/common/Skeleton';
import PageTransition from '../components/common/PageTransition';
import { AnimatePresence } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import BoardColumn from '../components/board/BoardColumn';
import TaskDetailDrawer from '../components/shared/TaskDetailDrawer';
import NewTaskModal from '../components/shared/NewTaskModal';
import FilterBar from '../components/shared/FilterBar';
import { Plus, LayoutGrid, List, ChevronDown, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format, isPast, isToday } from 'date-fns';
import { useSocket } from '../hooks/useSocket';

const PRIORITY_COLORS = {
  Critical: 'bg-red-500/10 text-red-400',
  High: 'bg-orange-500/10 text-orange-400',
  Medium: 'bg-yellow-500/10 text-yellow-400',
  Low: 'bg-green-500/10 text-green-400',
};

const STATUS_DOT = {
  Todo: 'bg-zinc-500',
  'In Progress': 'bg-blue-500',
  Review: 'bg-yellow-500',
  Done: 'bg-green-500',
};

const GROUP_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'project', label: 'Project' },
  { value: 'assignee', label: 'Assignee' },
];

// ── List View Row ──────────────────────────────────────────────
const ListRow = React.memo(({ task, onClick }) => {
  const isOverdue = task.deadline && task.status !== 'Done' && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline));
  const subtaskTotal = task.subtasks || 0;
  const subtaskDone = task.completedSubtasks || 0;

  return (
    <div
      onClick={() => onClick(task)}
      className={clsx(
        'grid grid-cols-12 gap-3 items-center px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/40 cursor-pointer transition-colors text-sm',
        isOverdue && 'border-l-2 border-l-red-500/50',
      )}
    >
      {/* Title */}
      <div className="col-span-4 min-w-0">
        <p className="text-zinc-200 font-medium truncate hover:text-blue-400 transition-colors">{task.title}</p>
        {task.labels?.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {task.labels.slice(0, 3).map((l, i) => (
              <span key={i} className="text-[9px] px-1 py-0.5 bg-zinc-800 text-zinc-400 rounded">{l}</span>
            ))}
          </div>
        )}
      </div>
      {/* Project */}
      <div className="col-span-2 min-w-0">
        {task.project ? (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: (task.project.color || '#6366f1') + '20', color: task.project.color || '#6366f1' }}>
            {task.project.name}
          </span>
        ) : <span className="text-xs text-zinc-600">—</span>}
      </div>
      {/* Priority */}
      <div className="col-span-1">
        <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded', PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
      </div>
      {/* Assignees */}
      <div className="col-span-2 flex -space-x-1">
        {(task.assignees || []).slice(0, 3).map((a) => (
          <div key={a.id} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-black" style={{ backgroundColor: a.avatarColor || '#6366f1' }} title={a.name}>{a.name?.charAt(0)}</div>
        ))}
        {(task.assignees?.length || 0) > 3 && <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-[9px] font-bold ring-1 ring-black">+{task.assignees.length - 3}</div>}
      </div>
      {/* Due */}
      <div className="col-span-1">
        <span className={clsx('text-xs', isOverdue ? 'text-red-400' : 'text-zinc-500')}>
          {task.deadline ? format(new Date(task.deadline), 'MMM d') : '—'}
        </span>
      </div>
      {/* Status */}
      <div className="col-span-1">
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <div className={clsx('w-2 h-2 rounded-full', STATUS_DOT[task.status])} />
          {task.status}
        </span>
      </div>
      {/* Subtasks */}
      <div className="col-span-1">
        {subtaskTotal > 0 ? (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <CheckSquare size={11} /> {subtaskDone}/{subtaskTotal}
          </span>
        ) : <span className="text-xs text-zinc-600">—</span>}
      </div>
    </div>
  );
});

// ── Swimlane (for group by project / assignee) ─────────────────
const Swimlane = ({ label, color, tasks, onTaskClick, onContextAction, onTaskCreated }) => {
  const statusColumns = useMemo(() => ({
    Todo: tasks.filter((t) => t.status === 'Todo'),
    'In Progress': tasks.filter((t) => t.status === 'In Progress'),
    Review: tasks.filter((t) => t.status === 'Review'),
    Done: tasks.filter((t) => t.status === 'Done'),
  }), [tasks]);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        {color && <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: color }} />}
        <h3 className="text-sm font-bold text-zinc-200">{label}</h3>
        <span className="text-xs text-zinc-500">({tasks.length})</span>
      </div>
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {Object.keys(statusColumns).map((status) => (
          <BoardColumn
            key={`${label}-${status}`}
            id={status}
            title={status}
            tasks={statusColumns[status]}
            onTaskClick={onTaskClick}
            onContextAction={onContextAction}
            onTaskCreated={onTaskCreated}
          />
        ))}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// BOARD PAGE
// ═════════════════════════════════════════════════════════════════
const BoardPage = () => {
  const { tasks, fetchTasks, updateTaskStatus, reorderTask, isLoading, deleteTask } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // kanban | list
  const [groupBy, setGroupBy] = useState('status');
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [filters, setFilters] = useState({
    projectIds: [],
    assigneeIds: [],
    priorities: [],
    dueBefore: '',
  });

  // Socket.io real-time
  const { connected, on } = useSocket();

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  // Wire socket events to refetch tasks
  useEffect(() => {
    const unsub1 = on('task:created', () => fetchTasks());
    const unsub2 = on('task:moved', () => fetchTasks());
    const unsub3 = on('task:updated', () => fetchTasks());
    const unsub4 = on('task:deleted', () => fetchTasks());
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [on, fetchTasks]);

  // Check if board is truly empty (no tasks at all, no filters)
  const hasActiveFilters = filters.projectIds.length > 0 || filters.assigneeIds.length > 0 || filters.priorities.length > 0 || !!filters.dueBefore;
  const boardIsEmpty = tasks.length === 0 && !hasActiveFilters && !isLoading;

  // Apply filters client-side
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filters.projectIds.length > 0) {
      result = result.filter((t) => t.projectId && filters.projectIds.includes(t.projectId));
    }
    if (filters.assigneeIds.length > 0) {
      result = result.filter((t) => t.assignees?.some((a) => filters.assigneeIds.includes(a.id)));
    }
    if (filters.priorities.length > 0) {
      result = result.filter((t) => filters.priorities.includes(t.rawPriority || t.priority?.toLowerCase()));
    }
    if (filters.dueBefore) {
      const cutoff = new Date(filters.dueBefore);
      cutoff.setHours(23, 59, 59, 999);
      result = result.filter((t) => t.deadline && new Date(t.deadline) <= cutoff);
    }
    return result;
  }, [tasks, filters]);

  // Group data
  const columns = useMemo(() => ({
    Todo: filteredTasks.filter((t) => t.status === 'Todo'),
    'In Progress': filteredTasks.filter((t) => t.status === 'In Progress'),
    Review: filteredTasks.filter((t) => t.status === 'Review'),
    Done: filteredTasks.filter((t) => t.status === 'Done'),
  }), [filteredTasks]);

  // Group by project
  const projectGroups = useMemo(() => {
    if (groupBy !== 'project') return [];
    const groups = {};
    filteredTasks.forEach((t) => {
      const key = t.projectId || 'none';
      if (!groups[key]) {
        groups[key] = {
          label: t.project?.name || 'No Project',
          color: t.project?.color || '#71717a',
          tasks: [],
        };
      }
      groups[key].tasks.push(t);
    });
    return Object.values(groups);
  }, [filteredTasks, groupBy]);

  // Group by assignee
  const assigneeGroups = useMemo(() => {
    if (groupBy !== 'assignee') return [];
    const groups = {};
    filteredTasks.forEach((t) => {
      const assignees = t.assignees?.length ? t.assignees : [{ id: 'unassigned', name: 'Unassigned', avatarColor: '#71717a' }];
      assignees.forEach((a) => {
        const key = a.id;
        if (!groups[key]) {
          groups[key] = { label: a.name, color: a.avatarColor || '#6366f1', tasks: [] };
        }
        groups[key].tasks.push(t);
      });
    });
    return Object.values(groups);
  }, [filteredTasks, groupBy]);

  const handleDragEnd = useCallback((result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const newStatus = destination.droppableId;
    updateTaskStatus(draggableId, newStatus);
    if (reorderTask) reorderTask(draggableId, newStatus, destination.index);
    toast.success(`Moved to ${newStatus}`);
  }, [updateTaskStatus, reorderTask]);

  const handleContextAction = useCallback(async (task, action) => {
    if (action === 'delete') {
      try {
        await deleteTask(task.id);
        toast.success('Task deleted');
      } catch { toast.error('Failed to delete task'); }
    } else if (action === 'edit') {
      setSelectedTask(task);
    } else if (action === 'duplicate') {
      toast('Duplicate not yet implemented', { icon: 'ℹ️' });
    }
  }, [deleteTask]);

  const handleRefresh = useCallback(() => fetchTasks(), [fetchTasks]);

  return (
    <PageTransition>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Board</h1>
            <p className="text-zinc-500 text-sm">{filteredTasks.length} tasks{filters.projectIds.length || filters.assigneeIds.length || filters.priorities.length || filters.dueBefore ? ' (filtered)' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Group by */}
            <div className="relative">
              <button
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
              >
                Group: {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                <ChevronDown size={12} />
              </button>
              {showGroupMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-36 py-1">
                  {GROUP_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => { setGroupBy(g.value); setShowGroupMenu(false); }}
                      className={clsx('w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors', groupBy === g.value ? 'text-blue-400 font-medium' : 'text-zinc-300')}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
              <button
                onClick={() => setViewMode('kanban')}
                className={clsx('p-1.5 rounded-md transition-colors', viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                title="Kanban View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                title="List View"
              >
                <List size={15} />
              </button>
            </div>

            <button
              onClick={() => setShowNewTask(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
            >
              <Plus size={16} /> New Task
            </button>

            {/* Live indicator */}
            <span className={connected
              ? 'flex items-center text-xs text-green-400 gap-1'
              : 'flex items-center text-xs text-zinc-500 gap-1'}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`} />
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-4">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto pb-4">
          {boardIsEmpty ? (
            /* ── Illustrated empty state ── */
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect x="10" y="20" width="60" height="48" rx="6" stroke="#3f3f46" strokeWidth="2" fill="none"/>
                <line x1="22" y1="36" x2="58" y2="36" stroke="#3f3f46" strokeWidth="2"/>
                <line x1="22" y1="46" x2="48" y2="46" stroke="#3f3f46" strokeWidth="2"/>
                <circle cx="58" cy="18" r="10" fill="#1d4ed8"/>
                <line x1="58" y1="13" x2="58" y2="23" stroke="white" strokeWidth="2"/>
                <line x1="53" y1="18" x2="63" y2="18" stroke="white" strokeWidth="2"/>
              </svg>
              <p className="text-white font-semibold mt-4">No tasks yet</p>
              <p className="text-zinc-500 text-sm mt-1">Create your first task to get started</p>
              <button
                onClick={() => setShowNewTask(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                + Create Task
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex space-x-6 h-full min-w-max">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-80 flex-shrink-0 flex flex-col">
                  <Skeleton variant="text" className="w-24 mb-4" />
                  <div className="space-y-3">
                    <Skeleton variant="card" className="h-28" />
                    <Skeleton variant="card" className="h-28" />
                    <Skeleton variant="card" className="h-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            /* ── LIST VIEW ── */
            <div className="bg-[#0a0a0a] rounded-xl border border-zinc-800 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <div className="col-span-4">Title</div>
                <div className="col-span-2">Project</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-2">Assignees</div>
                <div className="col-span-1">Due</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Subtasks</div>
              </div>
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No tasks match your filters</div>
              ) : (
                filteredTasks.map((task) => (
                  <ListRow key={task.id} task={task} onClick={setSelectedTask} />
                ))
              )}
            </div>
          ) : groupBy === 'status' ? (
            /* ── KANBAN (group by status) ── */
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex space-x-5 h-full min-w-max">
                {Object.keys(columns).map((status) => (
                  <BoardColumn
                    key={status}
                    id={status}
                    title={status}
                    tasks={columns[status]}
                    onTaskClick={setSelectedTask}
                    onContextAction={handleContextAction}
                    onTaskCreated={handleRefresh}
                  />
                ))}
              </div>
            </DragDropContext>
          ) : groupBy === 'project' ? (
            /* ── SWIMLANES by Project ── */
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-2">
                {projectGroups.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">No tasks to display</p>
                ) : (
                  projectGroups.map((g) => (
                    <Swimlane
                      key={g.label}
                      label={g.label}
                      color={g.color}
                      tasks={g.tasks}
                      onTaskClick={setSelectedTask}
                      onContextAction={handleContextAction}
                      onTaskCreated={handleRefresh}
                    />
                  ))
                )}
              </div>
            </DragDropContext>
          ) : (
            /* ── SWIMLANES by Assignee ── */
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-2">
                {assigneeGroups.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">No tasks to display</p>
                ) : (
                  assigneeGroups.map((g) => (
                    <Swimlane
                      key={g.label}
                      label={g.label}
                      color={g.color}
                      tasks={g.tasks}
                      onTaskClick={setSelectedTask}
                      onContextAction={handleContextAction}
                      onTaskCreated={handleRefresh}
                    />
                  ))
                )}
              </div>
            </DragDropContext>
          )}
        </div>

        {/* Modals */}
        {showNewTask && (
          <NewTaskModal
            onClose={() => setShowNewTask(false)}
            onCreated={handleRefresh}
          />
        )}

        <AnimatePresence>
          {selectedTask && (
            <TaskDetailDrawer
              task={selectedTask}
              onClose={() => { setSelectedTask(null); handleRefresh(); }}
            />
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default BoardPage;
