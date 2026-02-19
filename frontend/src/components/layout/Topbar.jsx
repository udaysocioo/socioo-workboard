import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../services/api';

const Topbar = ({ onMenuClick }) => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [activities, setActivities] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/projects'),
        ]);
        const q = searchQuery.toLowerCase();
        const taskMatches = tasksRes.data
          .filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
          .slice(0, 5)
          .map((t) => ({ id: t._id, title: t.title, type: 'task' }));
        const projectMatches = projectsRes.data
          .filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
          .slice(0, 3)
          .map((p) => ({ id: p._id, title: p.name, type: 'project' }));
        setSearchResults([...taskMatches, ...projectMatches]);
        setShowSearch(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchNotifications = async () => {
    if (activities.length > 0) {
      setShowNotifs(!showNotifs);
      return;
    }
    setNotifLoading(true);
    setShowNotifs(true);
    try {
      const res = await api.get('/activities');
      setActivities(Array.isArray(res.data) ? res.data.slice(0, 10) : res.data.activities?.slice(0, 10) || []);
    } catch {
      setActivities([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSearchSelect = (result) => {
    setShowSearch(false);
    setSearchQuery('');
    if (result.type === 'project') {
      navigate('/projects');
    } else {
      navigate('/board');
    }
  };

  return (
    <div className="h-16 px-6 flex items-center justify-between bg-[#0a0a0a] border-b border-zinc-800 transition-colors">
      {/* Search Bar */}
      <div className="flex items-center flex-1 max-w-lg" ref={searchRef}>
        <button onClick={onMenuClick} className="mr-4 md:hidden text-zinc-500 hover:text-blue-500">
          <Menu size={24} />
        </button>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search tasks, projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-zinc-200 placeholder-zinc-600 transition-colors outline-none"
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-full bg-[#111] border border-zinc-800 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSearchSelect(r)}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 text-left"
                >
                  <span className={`text-[10px] font-bold uppercase mr-2 px-1.5 py-0.5 rounded ${r.type === 'task' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {r.type}
                  </span>
                  {r.title}
                </button>
              ))}
            </div>
          )}
          {showSearch && searchQuery && searchResults.length === 0 && (
            <div className="absolute top-full mt-1 left-0 w-full bg-[#111] border border-zinc-800 rounded-lg shadow-lg z-50 p-4 text-center text-sm text-zinc-500">
              No results found
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        <div className="relative" ref={notifRef}>
          <button onClick={fetchNotifications} className="relative p-2 text-zinc-500 hover:text-blue-400 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0a0a0a]"></span>
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-[#111] border border-zinc-800 rounded-xl shadow-lg z-50">
              <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Notifications</h4>
                <button onClick={() => setShowNotifs(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <div className="p-4 text-center text-sm text-zinc-500">Loading...</div>
                ) : activities.length === 0 ? (
                  <div className="p-4 text-center text-sm text-zinc-500">No recent activity</div>
                ) : (
                  activities.map((a) => (
                    <div key={a._id} className="px-3 py-2.5 hover:bg-zinc-900 border-b border-zinc-800/50 last:border-0">
                      <div className="flex items-start space-x-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: a.user?.avatarColor || '#3b82f6' }}
                        >
                          {a.user?.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300">
                            <span className="font-semibold text-white">{a.user?.name}</span>{' '}
                            {a.action}{' '}
                            <span className="font-medium text-blue-400">{a.details}</span>
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            {a.createdAt ? format(new Date(a.createdAt), 'MMM d, h:mm a') : 'Just now'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-zinc-800"
            style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
