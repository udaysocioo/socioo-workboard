import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react'; // Added RefreshCw
import { User, Mail } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageTransition from '../components/common/PageTransition';

const MemberCard = React.memo(({ member }) => {
  return (
    <div className="bg-[#111] rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center text-center transition-all duration-300">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg"
        style={{ backgroundColor: member.avatarColor || '#3b82f6' }}
      >
        {member.name?.charAt(0)}
      </div>

      <h3 className="text-lg font-bold text-white">{member.name}</h3>
      <span className="inline-block mt-1 px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full font-medium">
        {member.role}
      </span>

      <div className="w-full mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <div className="flex items-center overflow-hidden">
            <Mail size={14} className="mr-2 flex-shrink-0" />
            <span className="truncate">{member.email || 'No email'}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <div className="flex items-center">
            <User size={14} className="mr-2" />
            <span>{member.tasksCount || 0} Active Tasks</span>
          </div>
        </div>
      </div>

      <div className="w-full mt-6">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-500">Workload</span>
          <span className="font-bold text-zinc-300">{member.workload}%</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              member.workload > 85
                ? 'bg-red-500'
                : member.workload > 60
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(member.workload, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
});

const TeamPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, tasksRes] = await Promise.all([
        api.get('/users'),
        api.get('/tasks'),
      ]);

      const users = usersRes.data.filter((u) => u.isActive !== false);
      const tasks = tasksRes.data;

      const membersWithStats = users.map((user) => {
        const userTasks = tasks.filter(
          (t) => (t.assignee?.id || t.assignee?._id) === (user.id || user._id) && t.status !== 'Done',
        );
        const taskCount = userTasks.length;
        const workload = Math.min(taskCount * 10, 100);

        return {
          ...user,
          tasksCount: taskCount,
          workload: workload,
        };
      });

      setMembers(membersWithStats);
    } catch (error) {
      console.error('Failed to fetch team data', error);
      toast.error('Failed to refresh teaam data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <PageTransition>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Team Members</h1>
            <p className="text-zinc-400">Collaborate with your squad</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && members.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             <AnimatePresence>
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-64 bg-zinc-900 rounded-xl animate-pulse"
                ></motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {members.map((member, index) => (
                <motion.div
                  key={member.id || member._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  layout
                >
                  <MemberCard member={member} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default TeamPage;
