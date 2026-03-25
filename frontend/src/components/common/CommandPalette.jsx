import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ClipboardList, FolderOpen, User, MessageSquare, Clock, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api from '../../services/api';

const RECENT_KEY = 'socioo-recent-searches';
const MAX_RECENT = 5;

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch { return []; }
}

function saveRecentSearch(query) {
  if (!query.trim()) return;
  const recent = getRecentSearches().filter((r) => r !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const CATEGORY_CONFIG = {
  tasks: { icon: ClipboardList, label: 'Tasks', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  projects: { icon: FolderOpen, label: 'Projects', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  members: { icon: User, label: 'Members', color: 'text-green-400', bg: 'bg-green-500/10' },
  comments: { icon: MessageSquare, label: 'Comments', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
};

const STATUS_COLORS = {
  todo: 'bg-zinc-600', in_progress: 'bg-blue-500', review: 'bg-yellow-500', done: 'bg-green-500',
};

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setActiveIndex(0);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/search', { params: { q: query } });
        setResults(res.data);
        setActiveIndex(0);
      } catch {
        setResults({ tasks: [], projects: [], members: [], comments: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Flatten results for keyboard navigation
  const flatItems = React.useMemo(() => {
    if (!results) return [];
    const items = [];
    ['tasks', 'projects', 'members', 'comments'].forEach((cat) => {
      (results[cat] || []).forEach((item) => {
        items.push({ ...item, _category: cat });
      });
    });
    return items;
  }, [results]);

  const handleSelect = useCallback((item) => {
    saveRecentSearch(query);
    onClose();
    switch (item._category) {
      case 'tasks':
        navigate('/board');
        break;
      case 'projects':
        navigate('/projects');
        break;
      case 'members':
        navigate('/team');
        break;
      case 'comments':
        navigate('/board');
        break;
      default:
        break;
    }
  }, [navigate, onClose, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && flatItems[activeIndex]) {
        e.preventDefault();
        handleSelect(flatItems[activeIndex]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, flatItems, activeIndex, handleSelect, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const recentSearches = getRecentSearches();
  const showRecent = !query.trim() && recentSearches.length > 0;
  const hasResults = results && flatItems.length > 0;
  const noResults = results && flatItems.length === 0 && query.trim();

  if (!isOpen) return null;

  let itemIndex = -1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-xl bg-[#111] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-zinc-800">
            <Search size={18} className="text-zinc-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tasks, projects, members, comments..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-3 py-4 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-zinc-300 p-1">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
            {/* Recent searches */}
            {showRecent && (
              <div className="p-3">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2 px-2">Recent Searches</p>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-zinc-300 hover:bg-zinc-800/70 rounded-lg transition-colors"
                  >
                    <Clock size={14} className="text-zinc-600" />
                    {term}
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="p-6 text-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}

            {/* Grouped results */}
            {!loading && hasResults && (
              <div className="py-2">
                {['tasks', 'projects', 'members', 'comments'].map((category) => {
                  const items = results[category] || [];
                  if (items.length === 0) return null;
                  const config = CATEGORY_CONFIG[category];
                  const CatIcon = config.icon;
                  return (
                    <div key={category} className="mb-1">
                      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-5 py-1.5 flex items-center gap-1.5">
                        <CatIcon size={12} className={config.color} />
                        {config.label}
                      </p>
                      {items.map((item) => {
                        itemIndex++;
                        const idx = itemIndex;
                        const isActive = idx === activeIndex;
                        return (
                          <button
                            key={`${category}-${item.id}`}
                            data-index={idx}
                            onClick={() => handleSelect({ ...item, _category: category })}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={clsx(
                              'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors',
                              isActive ? 'bg-blue-600/15 text-white' : 'text-zinc-300 hover:bg-zinc-800/50',
                            )}
                          >
                            {category === 'tasks' && (
                              <>
                                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', STATUS_COLORS[item.status] || 'bg-zinc-500')} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {item.projectName && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: (item.projectColor || '#6366f1') + '20', color: item.projectColor || '#6366f1' }}>
                                        {item.projectName}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-zinc-500 capitalize">{item.priority}</span>
                                  </div>
                                </div>
                                <div className="flex -space-x-1 flex-shrink-0">
                                  {(item.assignees || []).slice(0, 2).map((a) => (
                                    <div
                                      key={a.id}
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-black"
                                      style={{ backgroundColor: a.avatarColor || '#6366f1' }}
                                    >
                                      {a.name?.charAt(0)}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                            {category === 'projects' && (
                              <>
                                <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: item.color }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                  {item.description && <p className="text-[11px] text-zinc-500 truncate">{item.description}</p>}
                                </div>
                                <span className="text-[10px] text-zinc-500">{item.taskCount} tasks</span>
                              </>
                            )}
                            {category === 'members' && (
                              <>
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ backgroundColor: item.avatar || '#6366f1' }}
                                >
                                  {item.name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{item.name}</p>
                                  <p className="text-[11px] text-zinc-500">{item.email}</p>
                                </div>
                                <span className="text-[10px] text-zinc-500 capitalize">{item.role}</span>
                              </>
                            )}
                            {category === 'comments' && (
                              <>
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                                  style={{ backgroundColor: item.authorAvatar || '#6366f1' }}
                                >
                                  {item.author?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-zinc-300 truncate">"{item.content}"</p>
                                  <p className="text-[11px] text-zinc-500">on <span className="text-blue-400">{item.taskTitle}</span></p>
                                </div>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {!loading && noResults && (
              <div className="p-8 text-center">
                <Search size={24} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No results for "{query}"</p>
              </div>
            )}

            {/* Empty state */}
            {!query.trim() && !showRecent && (
              <div className="p-8 text-center">
                <Search size={24} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Start typing to search...</p>
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Enter</kbd> Select</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Esc</kbd> Close</span>
            </div>
            <span className="flex items-center gap-1">
              <Command size={10} /> K to toggle
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;
