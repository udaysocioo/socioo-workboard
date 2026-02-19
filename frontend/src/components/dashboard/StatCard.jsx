import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, color, className }) => {
  const bgVariants = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-purple-500/10 text-purple-400',
    slate: 'bg-zinc-800 text-zinc-400',
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={clsx(
        'glass-panel p-6 rounded-xl transition-all duration-300 group',
        'hover:shadow-lg hover:shadow-blue-900/10 hover:border-blue-500/30',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1 group-hover:scale-105 origin-left transition-transform">{value}</h3>
        </div>
        <div
          className={clsx(
            'p-3 rounded-xl flex items-center justify-center shadow-inner',
            bgVariants[color] || bgVariants.blue,
          )}
        >
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
