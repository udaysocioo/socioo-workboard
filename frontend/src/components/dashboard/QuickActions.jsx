import React, { useState, useEffect } from 'react';
import { Plus, FolderPlus, RefreshCw, Filter } from 'lucide-react';
import api from '../../services/api';
import clsx from 'clsx';

const QuickActions = ({ onNewTask, onNewProject, onRefresh, refreshing, onFilterProject, activeProjectId }) => {
  const [projects, setProjects] = useState([]);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    api.get('/projects').then((res) => {
      const data = res.data.data || res.data;
      setProjects(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onNewTask}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
      >
        <Plus size={16} /> New Task
      </button>

      <button
        onClick={onNewProject}
        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors border border-zinc-700"
      >
        <FolderPlus size={16} /> New Project
      </button>

      {/* Filter by project */}
      <div className="relative">
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={clsx(
            'px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors border',
            activeProjectId
              ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700',
          )}
        >
          <Filter size={16} />
          {activeProjectId ? 'Filtered' : 'Filter'}
        </button>
        {showFilter && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-56 max-h-64 overflow-y-auto">
            <button
              onClick={() => { onFilterProject(null); setShowFilter(false); }}
              className={clsx(
                'w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition-colors',
                !activeProjectId ? 'text-blue-400 font-medium' : 'text-zinc-300',
              )}
            >
              All Projects
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { onFilterProject(p.id); setShowFilter(false); }}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2',
                  activeProjectId === p.id ? 'text-blue-400 font-medium' : 'text-zinc-300',
                )}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700 disabled:opacity-50"
        title="Refresh dashboard"
      >
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};

export default QuickActions;
