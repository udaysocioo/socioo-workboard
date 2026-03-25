import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const RANGE_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
];

const VelocityChart = ({ data = [], onRangeChange }) => {
  const [range, setRange] = useState(14);

  const handleRangeChange = (val) => {
    setRange(val);
    onRangeChange?.(val);
  };

  // Slice to only show `range` days
  const displayData = data.slice(-range);

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-zinc-900 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Task Velocity</h3>
        <div className="flex bg-zinc-900 rounded-lg p-0.5 gap-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRangeChange(opt.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                range === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#52525b"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                try { return format(parseISO(v), 'MMM d'); } catch { return v; }
              }}
              interval={Math.max(0, Math.floor(displayData.length / 7))}
            />
            <YAxis stroke="#52525b" tick={{ fontSize: 12, fill: '#71717a' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
              labelFormatter={(v) => {
                try { return format(parseISO(v), 'MMM d, yyyy'); } catch { return v; }
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="created"
              name="Created"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#createdGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#completedGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VelocityChart;
