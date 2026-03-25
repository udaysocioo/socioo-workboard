import React, { useState, useRef, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, CheckSquare, MessageSquare, MoreHorizontal, GripVertical, Clock } from 'lucide-react';
import clsx from 'clsx';
import { format, isPast, isToday } from 'date-fns';

const PriorityBadge = ({ priority }) => {
  const colors = {
    Critical: 'bg-red-500/10 text-red-400',
    High: 'bg-orange-500/10 text-orange-400',
    Medium: 'bg-yellow-500/10 text-yellow-400',
    Low: 'bg-green-500/10 text-green-400',
  };
  return (
    <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded', colors[priority] || colors.Low)}>
      {priority}
    </span>
  );
};

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
];

const TaskCard = React.memo(({ task, index, onClick, onContextAction }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isOverdue = task.deadline && task.status !== 'Done' && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline));
  const isDueToday = task.deadline && task.status !== 'Done' && isToday(new Date(task.deadline));
  const subtaskTotal = task.subtasks || 0;
  const subtaskDone = task.completedSubtasks || 0;
  const subtaskPct = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  return (
    <Draggable draggableId={task.id || task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={(e) => {
            // Don't open detail if clicking context menu
            if (e.target.closest('[data-context-menu]')) return;
            onClick(task);
          }}
          className={clsx(
            'bg-[#111] p-3.5 rounded-lg border mb-2.5 transition-all cursor-pointer group relative',
            snapshot.isDragging
              ? 'shadow-xl shadow-blue-500/15 rotate-1 ring-2 ring-blue-500 z-50 border-blue-500'
              : isOverdue
                ? 'border-red-500/40 hover:border-red-500/60'
                : isDueToday
                  ? 'border-orange-500/30 hover:border-orange-500/50'
                  : 'border-zinc-800 hover:border-zinc-700',
          )}
          style={provided.draggableProps.style}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="absolute top-2 left-1 opacity-0 group-hover:opacity-40 transition-opacity text-zinc-500"
          >
            <GripVertical size={14} />
          </div>

          {/* Header: priority + context menu */}
          <div className="flex justify-between items-start mb-1.5">
            <PriorityBadge priority={task.priority} />
            <div className="relative" ref={menuRef} data-context-menu>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-36 py-1">
                  {['Edit', 'Duplicate', 'Delete'].map((action) => (
                    <button
                      key={action}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onContextAction?.(task, action.toLowerCase());
                      }}
                      className={clsx(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors',
                        action === 'Delete' ? 'text-red-400' : 'text-zinc-300',
                      )}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors leading-snug">
            {task.title}
          </h4>

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.labels.slice(0, 4).map((label, i) => (
                <span
                  key={i}
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: LABEL_COLORS[i % LABEL_COLORS.length] + '20',
                    color: LABEL_COLORS[i % LABEL_COLORS.length],
                  }}
                >
                  {label}
                </span>
              ))}
              {task.labels.length > 4 && (
                <span className="text-[9px] text-zinc-500 px-1">+{task.labels.length - 4}</span>
              )}
            </div>
          )}

          {/* Subtask progress bar */}
          {subtaskTotal > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                <span className="flex items-center gap-1">
                  <CheckSquare size={10} /> {subtaskDone}/{subtaskTotal}
                </span>
                <span>{subtaskPct}%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${subtaskPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer: date, comments, assignees */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <div className="flex items-center gap-2.5">
              {/* Due date */}
              <div className={clsx(
                'flex items-center gap-0.5',
                isOverdue ? 'text-red-400 font-medium' : isDueToday ? 'text-orange-400' : '',
              )}>
                <Calendar size={11} />
                {task.deadline ? format(new Date(task.deadline), 'MMM d') : '-'}
              </div>

              {/* Comment count */}
              {(task.commentCount || 0) > 0 && (
                <div className="flex items-center gap-0.5">
                  <MessageSquare size={11} />
                  {task.commentCount}
                </div>
              )}

              {/* Estimated hours */}
              {task.estimatedHours > 0 && (
                <div className="flex items-center gap-0.5">
                  <Clock size={11} />
                  {task.estimatedHours}h
                </div>
              )}
            </div>

            {/* Assignees */}
            <div className="flex items-center -space-x-1.5">
              {(task.assignees || []).slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="w-5.5 h-5.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-white font-bold text-[9px] ring-1.5 ring-[#111]"
                  style={{ backgroundColor: a.avatarColor || '#6366f1' }}
                  title={a.name}
                >
                  {a.name?.charAt(0) || '?'}
                </div>
              ))}
              {(task.assignees || []).length > 3 && (
                <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-zinc-400 font-bold text-[9px] bg-zinc-800 ring-1.5 ring-[#111]">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});

export default TaskCard;
