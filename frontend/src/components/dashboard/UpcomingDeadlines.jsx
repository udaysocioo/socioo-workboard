import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';

const UpcomingDeadlines = ({ tasks = [] }) => {
  const navigate = useNavigate();

  const getUrgencyStyle = (deadline) => {
    if (!deadline) return { dot: 'bg-zinc-500', bg: '' };
    const d = new Date(deadline);
    if (isPast(d)) return { dot: 'bg-red-500', bg: 'border-l-2 border-l-red-500/60', label: 'text-red-400' };
    const hours = differenceInHours(d, new Date());
    if (hours < 24) return { dot: 'bg-orange-500', bg: 'border-l-2 border-l-orange-500/60', label: 'text-orange-400' };
    return { dot: 'bg-yellow-500', bg: 'border-l-2 border-l-yellow-500/60', label: 'text-yellow-400' };
  };

  const getTimeLabel = (deadline) => {
    if (!deadline) return '';
    const d = new Date(deadline);
    if (isPast(d)) return `Overdue by ${formatDistanceToNow(d)}`;
    return `Due ${formatDistanceToNow(d, { addSuffix: true })}`;
  };

  if (!tasks.length) {
    return (
      <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={18} className="text-yellow-400" /> Upcoming Deadlines
        </h3>
        <p className="text-zinc-500 text-sm">No upcoming deadlines in the next 72 hours.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Clock size={18} className="text-yellow-400" /> Upcoming Deadlines
      </h3>
      <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
        {tasks.map((task) => {
          const urgency = getUrgencyStyle(task.deadline);
          return (
            <div
              key={task.id}
              onClick={() => navigate('/board')}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900/60 transition-colors cursor-pointer ${urgency.bg}`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgency.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate font-medium">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {task.project && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: task.project.color + '20', color: task.project.color }}
                    >
                      {task.project.name}
                    </span>
                  )}
                  <span className={`text-[11px] font-medium ${urgency.label || 'text-zinc-500'}`}>
                    {getTimeLabel(task.deadline)}
                  </span>
                </div>
              </div>
              <div className="flex -space-x-1.5 flex-shrink-0">
                {(task.assignees || []).slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-black"
                    style={{ backgroundColor: a.avatarColor || '#6366f1' }}
                    title={a.name}
                  >
                    {a.name?.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingDeadlines;
