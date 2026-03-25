import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, MoreVertical, Pencil, Trash2, ExternalLink, AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import clsx from 'clsx';

// SVG circular progress ring (no external lib)
const ProgressRing = ({ percent, size = 48, stroke = 4, color }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color || '#3b82f6'}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-white text-[11px] font-bold">
        {percent}%
      </text>
    </svg>
  );
};

const STATUS_BADGE = {
  Active: 'bg-green-500/10 text-green-400',
  Completed: 'bg-blue-500/10 text-blue-400',
  Archived: 'bg-zinc-500/10 text-zinc-400',
};

const ProjectCard = React.memo(({ project, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = () => navigate(`/projects/${project.id}`);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={handleClick}
      className="bg-[#111] rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all relative group cursor-pointer overflow-hidden"
    >
      {/* Color accent left strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: project.color || '#6366f1' }} />

      <div className="p-5 pl-5">
        {/* Header: icon + context menu */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg text-white" style={{ backgroundColor: project.color || '#64748b' }}>
              <Folder size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate group-hover:text-blue-400 transition-colors">{project.name}</h3>
              <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_BADGE[project.status] || 'bg-zinc-800 text-zinc-400')}>
                {project.status}
              </span>
            </div>
          </div>
          <div className="relative flex items-center gap-1" ref={menuRef}>
            {/* Hover quick actions */}
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-blue-400 p-1 rounded hover:bg-zinc-800 transition-all"
              title="Open"
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-36 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl z-10 py-1">
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(project); }} className="w-full flex items-center px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800">
                  <Pencil size={12} className="mr-2" /> Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete?.(project); }} className="w-full flex items-center px-3 py-2 text-xs text-red-400 hover:bg-red-500/10">
                  <Trash2 size={12} className="mr-2" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-zinc-500 mb-3 line-clamp-2 ml-0.5">{project.description}</p>
        )}

        {/* Stats row: progress ring + chips */}
        <div className="flex items-center gap-3 mb-3">
          <ProgressRing percent={project.progressPercent || 0} size={44} stroke={3.5} color={project.color} />
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
              {project.completedCount || 0}/{project.taskCount || 0} tasks
            </span>
            {(project.overdueCount || 0) > 0 && (
              <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                <AlertTriangle size={9} /> {project.overdueCount} overdue
              </span>
            )}
            {project.nearestDeadline && (
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                <Calendar size={9} /> {format(new Date(project.nearestDeadline), 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Footer: member avatars */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
          <div className="flex -space-x-1.5">
            {project.members?.slice(0, 4).map((m, i) => (
              <div
                key={m.id || m._id || i}
                className="w-6 h-6 rounded-full border-2 border-[#111] flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                title={m.name}
              >
                {m.name?.charAt(0)}
              </div>
            ))}
            {(project.members?.length || 0) > 4 && (
              <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-[#111] flex items-center justify-center text-[9px] font-bold text-zinc-400">
                +{project.members.length - 4}
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-600">{project.memberCount || project.members?.length || 0} members</span>
        </div>
      </div>
    </motion.div>
  );
});

export default ProjectCard;
