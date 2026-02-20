import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react'; // Added RefreshCw
import {
  CheckCircle2,
  PlusCircle,
  MessageSquare,
  AlertCircle,
  FileText,
  ArrowRight,
  FolderOpen,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageTransition from '../components/common/PageTransition';

const ActivityItem = React.memo(({ activity, getColor, getIcon }) => (
  <div className="bg-[#111] p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
    <div className="flex items-start">
      <div className={`p-2 rounded-lg mr-4 ${getColor(activity.targetType || 'default')}`}>
        {getIcon(activity.targetType || 'default')}
      </div>
      <div className="flex-1">
        <p className="text-zinc-200">
          <span className="font-bold text-white">{activity.user?.name}</span>{' '}
          {activity.action}{' '}
          <span className="font-semibold text-blue-400">{activity.details}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {activity.createdAt
            ? format(new Date(activity.createdAt), 'MMM d, yyyy • h:mm a')
            : ''}
        </p>
      </div>
    </div>
  </div>
));

const ActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/activities?limit=30');
      const data = res.data.activities || res.data.data?.activities || [];
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch activities', error);
      toast.error('Failed to refresh activities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getIcon = React.useCallback((type) => {
    switch (type) {
      case 'task_completed': return <CheckCircle2 size={16} />;
      case 'task_created': return <PlusCircle size={16} />;
      case 'comment_added': return <MessageSquare size={16} />;
      case 'task_moved': return <ArrowRight size={16} />;
      case 'project_created': return <FolderOpen size={16} />;
      case 'attachment_added': return <FileText size={16} />;
      case 'task_assigned': return <User size={16} />;
      default: return <AlertCircle size={16} />;
    }
  }, []);

  const getColor = React.useCallback((type) => {
    switch (type) {
      case 'task_completed': return 'bg-green-500/10 text-green-400';
      case 'task_created':
      case 'project_created': return 'bg-blue-500/10 text-blue-400';
      case 'comment_added': return 'bg-purple-500/10 text-purple-400';
      case 'task_moved': return 'bg-yellow-500/10 text-yellow-400';
      case 'attachment_added': return 'bg-orange-500/10 text-orange-400';
      case 'task_assigned': return 'bg-cyan-500/10 text-cyan-400';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  }, []);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Log</h1>
            <p className="text-zinc-400">Recent actions across the workspace</p>
          </div>
          <button
            onClick={fetchActivities}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && activities.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-zinc-900 rounded-xl"></div>
            ))}
          </div>
        ) : (
          <div className="relative border-l-2 border-zinc-800 ml-4 space-y-8">
            <AnimatePresence mode="popLayout">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity._id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative pl-8"
                >
                  <div
                    className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-black"
                    style={{ backgroundColor: activity.user?.avatarColor || '#71717a' }}
                  ></div>

                  <ActivityItem activity={activity} getColor={getColor} getIcon={getIcon} />
                </motion.div>
              ))}
            </AnimatePresence>
            {!loading && activities.length === 0 && (
              <p className="text-zinc-500 ml-8">No activities found.</p>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default ActivityPage;
