import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import TaskCard from './TaskCard';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_BACKEND_MAP = {
  Todo: 'todo',
  'In Progress': 'in_progress',
  Review: 'review',
  Done: 'done',
};

const WIP_LIMIT = 6;

const BoardColumn = React.memo(({ id, title, tasks, onTaskClick, onContextAction, onTaskCreated }) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const isOverWip = id === 'In Progress' && tasks.length > WIP_LIMIT;

  const handleQuickAdd = async () => {
    if (!quickTitle.trim()) return;
    setAdding(true);
    try {
      const backendStatus = STATUS_BACKEND_MAP[id] || 'todo';
      await api.post('/tasks', {
        title: quickTitle.trim(),
        status: backendStatus,
        priority: 'medium',
        // projectId is required by validator — use first available project
      });
      setQuickTitle('');
      setShowQuickAdd(false);
      toast.success('Task created');
      onTaskCreated?.();
    } catch {
      toast.error('Failed — project may be required');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-xl min-w-[300px] w-[300px] border border-zinc-800">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-zinc-200 text-sm">{title}</h3>
          <span className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-bold',
            isOverWip ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400',
          )}>
            {tasks.length}
          </span>
          {isOverWip && (
            <span className="text-red-400" title={`WIP limit (${WIP_LIMIT}) exceeded`}>
              <AlertTriangle size={14} />
            </span>
          )}
        </div>
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Quick add task"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Quick add inline */}
      {showQuickAdd && (
        <div className="p-3 border-b border-zinc-800">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQuickAdd();
              if (e.key === 'Escape') { setShowQuickAdd(false); setQuickTitle(''); }
            }}
            placeholder="Task title, press Enter..."
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
            disabled={adding}
          />
        </div>
      )}

      {/* Droppable area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 p-3 overflow-y-auto min-h-[100px] transition-colors',
              snapshot.isDraggingOver ? 'bg-blue-500/5 border-blue-500/20' : '',
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onClick={onTaskClick}
                onContextAction={onContextAction}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
});

export default BoardColumn;
