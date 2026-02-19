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
import Skeleton from '../components/common/Skeleton.jsx';
import PageTransition from '../components/common/PageTransition.jsx';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const priorityData = [
    { name: 'Critical', value: stats.byPriority?.critical || 0, color: '#ef4444' },
    { name: 'High', value: stats.byPriority?.high || 0, color: '#f97316' },
    { name: 'Medium', value: stats.byPriority?.medium || 0, color: '#eab308' },
    { name: 'Low', value: stats.byPriority?.low || 0, color: '#22c55e' },
  ].filter((d) => d.value > 0);



  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-zinc-400">Welcome back! Here's what's happening today.</p>
        </div>

        {/* ... content ... */}

        {/* Recent Activity */}
        <div className="bg-[#111] p-6 rounded-xl border border-zinc-800">
          {/* ... content ... */}
        </div>
      </div>
    </PageTransition>
  );
};

export default DashboardPage;
