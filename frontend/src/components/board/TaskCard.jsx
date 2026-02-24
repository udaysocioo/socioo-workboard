import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, CheckSquare } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

const PriorityBadge = ({ priority }) => {
  const colors = {
    Critical: 'bg-red-500/10 text-red-400',
    High: 'bg-orange-500/10 text-orange-400',
    Medium: 'bg-yellow-500/10 text-yellow-400',
    Low: 'bg-green-500/10 text-green-400',
  };

  return (
    <span
      className={clsx(
        'text-xs font-semibold px-2 py-0.5 rounded',
        colors[priority] || colors.Low,
      )}
    >
      {priority}
    </span>
  );
};

const TaskCard = React.memo(({ task, index, onClick }) => {
  return (
    <Draggable draggableId={task.id || task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={clsx(
            'bg-[#111] p-4 rounded-lg border border-zinc-800 mb-3 hover:border-zinc-700 transition-all cursor-pointer group',
            snapshot.isDragging
              ? 'shadow-lg shadow-blue-500/10 rotate-2 ring-2 ring-blue-500 z-50'
              : '',
          )}
          style={provided.draggableProps.style}
        >
          <div className="flex justify-between items-start mb-2">
            <PriorityBadge priority={task.priority} />
          </div>

          <h4 className="text-sm font-semibold text-white mb-3 line-clamp-2 group-hover:text-blue-400 transition-colors">
            {task.title}
          </h4>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <Calendar size={14} className="mr-1" />
                {task.deadline ? format(new Date(task.deadline), 'MMM d') : '-'}
              </div>
              {task.subtasks > 0 && (
                <div className="flex items-center">
                  <CheckSquare size={14} className="mr-1" />
                  {task.completedSubtasks}/{task.subtasks}
                </div>
              )}
            </div>

            <div className="flex items-center -space-x-1.5">
              {(task.assignees || []).slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] ring-2 ring-[#111]"
                  style={{ backgroundColor: a.avatarColor || '#6366f1' }}
                  title={a.name}
                >
                  {a.name?.charAt(0) || '?'}
                </div>
              ))}
              {(task.assignees || []).length > 3 && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 font-bold text-[10px] bg-zinc-800 ring-2 ring-[#111]">
                  +{task.assignees.length - 3}
                </div>
              )}
              {(!task.assignees || task.assignees.length === 0) && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] bg-zinc-700">?</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});

export default TaskCard;
