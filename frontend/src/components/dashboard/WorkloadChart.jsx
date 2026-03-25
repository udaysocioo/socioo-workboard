import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  todo: '#71717a',
  inProgress: '#3b82f6',
  review: '#eab308',
  done: '#22c55e',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  const member = payload[0]?.payload;
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-3 shadow-xl text-sm">
      <p className="font-semibold text-white mb-2">{member?.fullName || label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="text-white font-medium">{entry.value}</span>
        </div>
      ))}
      <div className="border-t border-zinc-800 mt-2 pt-2 flex justify-between gap-4">
        <span className="text-zinc-400">Total</span>
        <span className="text-white font-bold">
          {(member?.todo || 0) + (member?.inProgress || 0) + (member?.review || 0) + (member?.done || 0)}
        </span>
      </div>
    </div>
  );
};

const WorkloadChart = ({ data = [] }) => {
  const navigate = useNavigate();

  const chartData = data.map((m) => {
    const parts = m.name?.trim().split(' ') || [];
    const shortName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || '';
    return { ...m, shortName, fullName: m.name };
  });

  const handleBarClick = (data) => {
    if (data?.activePayload?.[0]?.payload) {
      navigate('/board');
    }
  };

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900 shadow-sm">
      <h3 className="text-lg font-bold text-white mb-6">Workload Distribution</h3>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ bottom: 20 }} onClick={handleBarClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="shortName"
              stroke="#52525b"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis stroke="#52525b" tick={{ fontSize: 12, fill: '#71717a' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
            />
            <Bar dataKey="todo" name="Todo" stackId="a" fill={STATUS_COLORS.todo} radius={[0, 0, 0, 0]} barSize={32} />
            <Bar dataKey="inProgress" name="In Progress" stackId="a" fill={STATUS_COLORS.inProgress} barSize={32} />
            <Bar dataKey="review" name="Review" stackId="a" fill={STATUS_COLORS.review} barSize={32} />
            <Bar dataKey="done" name="Done" stackId="a" fill={STATUS_COLORS.done} radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WorkloadChart;
