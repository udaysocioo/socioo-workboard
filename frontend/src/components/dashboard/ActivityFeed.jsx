import React from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ActivityFeed = ({ activities = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Activity Feed</h3>
        <button
          onClick={() => navigate('/activity')}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="text-zinc-500 text-sm">No recent activity</p>
      ) : (
        <div className="space-y-0 max-h-[400px] overflow-y-auto">
          {activities.map((activity, idx) => (
            <div
              key={activity.id || idx}
              className="flex items-start py-3 border-b border-zinc-900/50 last:border-0 hover:bg-zinc-900/30 -mx-6 px-6 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] mr-3 flex-shrink-0 mt-0.5"
                style={{ backgroundColor: activity.user?.avatarColor || '#3b82f6' }}
              >
                {activity.user?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 leading-snug">
                  <span className="font-semibold text-white">{activity.user?.name}</span>{' '}
                  {activity.action}{' '}
                  <span className="font-medium text-blue-400">{activity.details}</span>
                </p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {activity.createdAt
                    ? format(new Date(activity.createdAt), 'MMM d, h:mm a')
                    : 'Just now'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
