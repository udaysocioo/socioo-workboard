import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  MoreHorizontal,
  Users,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard.jsx';
import api from '../services/api';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../components/common/Skeleton.jsx';
import PageTransition from '../components/common/PageTransition.jsx';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant="title" className="w-48" />
          <Skeleton variant="text" className="w-64" />
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" className="h-32" />
          ))}
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" className="h-32" />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
          <Skeleton variant="card" className="h-full" />
          <Skeleton variant="card" className="h-full" />
        </div>
      </div>
    );
  }

  // Shorten names for the chart X-axis (first name + last initial)
  const memberData = (stats.byMember || []).map((m) => {
    const parts = m.name?.trim().split(' ') || [];
    const shortName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || '';
    return { ...m, shortName, fullName: m.name };
  });

  const priorityData = [
    { name: 'Critical', value: stats.byPriority?.critical || 0, color: '#ef4444' },
    { name: 'High', value: stats.byPriority?.high || 0, color: '#f97316' },
    { name: 'Medium', value: stats.byPriority?.medium || 0, color: '#eab308' },
    { name: 'Low', value: stats.byPriority?.low || 0, color: '#22c55e' },
  ].filter((d) => d.value > 0);



  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">My Dashboard</h1>
          <p className="text-zinc-500">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 leading-relaxed">
          <StatCard title="Total Tasks" value={stats.totalTasks} icon={ListTodo} color="blue" onClick={() => navigate('/board')} />
          <StatCard title="In Progress" value={stats.inProgressTasks} icon={Clock} color="yellow" onClick={() => navigate('/board')} />
          <StatCard title="Completed" value={stats.completedTasks} icon={CheckCircle2} color="green" onClick={() => navigate('/board')} />
          <StatCard title="Overdue" value={stats.overdueTasks} icon={AlertTriangle} color="red" onClick={() => navigate('/board')} />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Active Projects" value={stats.activeProjects} icon={FolderOpen} color="purple" className="border-l-4 border-l-purple-500/50" onClick={() => navigate('/projects')} />
          <StatCard title="Team Members" value={stats.totalMembers} icon={Users} color="slate" className="border-l-4 border-l-zinc-500/50" onClick={() => navigate('/team')} />
          <StatCard title="Completed This Week" value={stats.completedThisWeek} icon={Calendar} color="green" className="border-l-4 border-l-green-500/50" onClick={() => navigate('/activity')} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks by Member */}
          <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900 shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center">Workload Distribution</h3>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="shortName" stroke="#52525b" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} angle={-35} textAnchor="end" interval={0} height={60} />
                  <YAxis stroke="#52525b" tick={{ fontSize: 12, fill: '#71717a' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} cursor={{ fill: '#27272a', opacity: 0.4 }} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="total" name="Total Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks by Priority */}
          <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900 shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-6">Tasks by Priority</h3>
            <div className="h-80 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" formatter={(value, entry) => (
                    <span className="text-zinc-400 ml-2 text-sm">{value} <span className="text-zinc-600">({entry.payload.value})</span></span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <button className="text-zinc-500 hover:text-white transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="space-y-0">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, idx) => (
                <div key={activity._id || idx} className="flex items-start py-4 border-b border-zinc-900 last:border-0 hover:bg-zinc-900/30 -mx-6 px-6 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs mr-4 flex-shrink-0" style={{ backgroundColor: activity.user?.avatarColor || '#3b82f6' }}>
                    {activity.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-300">
                      <span className="font-semibold text-white">{activity.user?.name}</span>{' '}
                      {activity.action}{' '}
                      <span className="font-medium text-blue-400">{activity.details}</span>
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                      {activity.createdAt ? format(new Date(activity.createdAt), 'MMM d, h:mm a') : 'Just now'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-sm">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default DashboardPage;
