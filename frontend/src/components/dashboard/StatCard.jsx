import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color, className, onClick, trend, sparklineData }) => {
  const bgVariants = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-purple-500/10 text-purple-400',
    slate: 'bg-zinc-800 text-zinc-400',
  };

  const sparkColors = {
    blue: '#3b82f6',
    green: '#22c55e',
    red: '#ef4444',
    yellow: '#eab308',
    purple: '#a855f7',
    slate: '#71717a',
  };

  const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-zinc-500';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
      onClick={onClick}
      className={clsx(
        'glass-panel p-5 rounded-xl transition-all duration-300 group relative overflow-hidden',
        'hover:shadow-lg hover:shadow-blue-900/10 hover:border-blue-500/30',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {/* Sparkline background */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-20 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparkColors[color] || sparkColors.blue}
                fill={sparkColors[color] || sparkColors.blue}
                strokeWidth={1.5}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">{title}</p>
          <div className="flex items-end gap-2 mt-1">
            <h3 className="text-2xl font-bold text-white group-hover:scale-105 origin-left transition-transform">
              <CountUp end={value} duration={1.2} separator="," preserveValue />
            </h3>
            {trend !== undefined && trend !== null && (
              <div className={clsx('flex items-center gap-0.5 text-xs font-medium pb-0.5', trendColor)}>
                <TrendIcon size={12} />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>
        <div
          className={clsx(
            'p-3 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0',
            bgVariants[color] || bgVariants.blue,
          )}
        >
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(StatCard);
