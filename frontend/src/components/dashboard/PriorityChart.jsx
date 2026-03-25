import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

const PRIORITY_CONFIG = [
  { key: 'critical', label: 'Critical', color: '#ef4444' },
  { key: 'high', label: 'High', color: '#f97316' },
  { key: 'medium', label: 'Medium', color: '#eab308' },
  { key: 'low', label: 'Low', color: '#22c55e' },
];

const PriorityChart = ({ data = {} }) => {
  const total = Object.values(data).reduce((s, v) => s + (v || 0), 0);

  const pieData = PRIORITY_CONFIG.map((p) => ({
    name: p.label,
    value: data[p.key] || 0,
    color: p.color,
  })).filter((d) => d.value > 0);

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900 shadow-sm">
      <h3 className="text-lg font-bold text-white mb-4">Tasks by Priority</h3>

      {/* Donut */}
      <div className="h-56 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend table */}
      <div className="space-y-2 mt-2">
        {PRIORITY_CONFIG.map((p) => {
          const count = data[p.key] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={p.key} className="flex items-center gap-3 text-sm">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-zinc-300 w-16">{p.label}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: p.color }}
                />
              </div>
              <span className="text-zinc-400 w-8 text-right">{count}</span>
              <span className="text-zinc-600 w-10 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriorityChart;
