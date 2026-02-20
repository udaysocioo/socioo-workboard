import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, MoreVertical, ListTodo, Pencil, Trash2 } from 'lucide-react';

const ProjectCard = React.memo(({ project, onEdit, onDelete, onClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusColors = {
    Active: 'bg-blue-500/10 text-blue-400',
    'In Progress': 'bg-blue-500/10 text-blue-400',
    Planning: 'bg-purple-500/10 text-purple-400',
    Completed: 'bg-green-500/10 text-green-400',
    Archived: 'bg-zinc-500/10 text-zinc-400',
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={() => onClick?.(project)}
      className="bg-[#111] rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors relative group cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-lg text-white" style={{ backgroundColor: project.color || '#64748b' }}>
          <Folder size={24} />
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors">
            <MoreVertical size={20} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-36 bg-[#111] border border-zinc-800 rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(project); }}
                className="w-full flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                <Pencil size={14} className="mr-2" /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete?.(project); }}
                className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-lg font-bold text-white mb-2">{project.name}</h3>
      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{project.description}</p>

      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColors[project.status] || 'bg-zinc-800 text-zinc-400'}`}>
          {project.status}
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <div className="flex -space-x-2">
          {project.members && project.members.slice(0, 3).map((m, i) => (
            <div
              key={m.id || m._id || i}
              className="w-8 h-8 rounded-full border-2 border-[#111] flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: m.avatarColor || '#6366f1' }}
            >
              {m.name?.charAt(0)}
            </div>
          ))}
          {project.members && project.members.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#111] flex items-center justify-center text-xs font-bold text-zinc-400">
              +{project.members.length - 3}
            </div>
          )}
        </div>
        <div className="flex items-center text-zinc-500 text-sm">
          <ListTodo size={16} className="mr-1.5" />
          <span>{project.taskCount || 0} tasks</span>
        </div>
      </div>
    </motion.div>
  );
});

export default ProjectCard;
