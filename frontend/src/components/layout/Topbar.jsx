import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Bell, Menu, X, Settings, LogOut, User, Command, CheckCheck, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import CommandPalette from '../common/CommandPalette';
import { getTheme, setTheme as applyTheme } from '../../lib/theme';

const STATUS_COLORS = {
  todo: 'bg-zinc-600', in_progress: 'bg-blue-500', review: 'bg-yellow-500', done: 'bg-green-500',
};

const Topbar = ({ onMenuClick }) => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [bellShake, setBellShake] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const logout = useAuthStore((state) => state.logout);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setThemeState(next);
  };

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K / Cmd+K to open command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll unread notifications every 30 seconds
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      const newCount = res.data.count || 0;
      setUnreadCount((prev) => {
        if (newCount > prev && prev > 0) {
          setBellShake(true);
          setTimeout(() => setBellShake(false), 1000);
          toast(`You have ${newCount} new notification${newCount > 1 ? 's' : ''}`, { icon: '🔔', duration: 3000 });
        }
        return newCount;
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const fetchNotifications = async () => {
    setNotifLoading(true);
    setShowNotifs(true);
    try {
      const res = await api.get('/notifications?limit=15');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotifClick = async (notif) => {
    // Mark as read
    if (!notif.read) {
      try {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }
    setShowNotifs(false);
    // Navigate based on type
    if (notif.relatedType === 'project') navigate('/projects');
    else navigate('/board');
  };

  // Debounced server-side search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/search', { params: { q: searchQuery } });
        setSearchResults(res.data);
        setShowSearch(true);
      } catch {
        setSearchResults(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Recent searches
  const getRecentSearches = useCallback(() => {
    try { return JSON.parse(localStorage.getItem('socioo-recent-searches')) || []; }
    catch { return []; }
  }, []);

  const recentSearches = getRecentSearches();
  const showRecent = searchFocused && !searchQuery.trim() && recentSearches.length > 0;

  const handleSearchSelect = (item) => {
    // Save recent
    const recent = getRecentSearches().filter((r) => r !== searchQuery);
    recent.unshift(searchQuery);
    localStorage.setItem('socioo-recent-searches', JSON.stringify(recent.slice(0, 5)));

    setShowSearch(false);
    setSearchQuery('');
    if (item.type === 'project') navigate('/projects');
    else if (item.type === 'member') navigate('/team');
    else navigate('/board');
  };

  // Flatten results for inline dropdown
  const flatResults = React.useMemo(() => {
    if (!searchResults) return [];
    const items = [];
    (searchResults.tasks || []).forEach((t) => items.push({ id: t.id, title: t.title, type: 'task', status: t.status, projectName: t.projectName, projectColor: t.projectColor }));
    (searchResults.projects || []).forEach((p) => items.push({ id: p.id, title: p.name, type: 'project', color: p.color }));
    (searchResults.members || []).forEach((m) => items.push({ id: m.id, title: m.name, type: 'member', avatar: m.avatar }));
    (searchResults.comments || []).forEach((c) => items.push({ id: c.id, title: `"${c.content}"`, subtitle: `on ${c.taskTitle}`, type: 'comment' }));
    return items;
  }, [searchResults]);

  // (old activity-based fetchNotifications removed — now uses real notifications API above)

  const TYPE_BADGE = {
    task: { label: 'Task', cls: 'bg-blue-500/10 text-blue-400' },
    project: { label: 'Project', cls: 'bg-purple-500/10 text-purple-400' },
    member: { label: 'Member', cls: 'bg-green-500/10 text-green-400' },
    comment: { label: 'Comment', cls: 'bg-yellow-500/10 text-yellow-400' },
  };

  return (
    <>
      <div className="h-16 px-6 flex items-center justify-between bg-[#0a0a0a] border-b border-zinc-800 transition-colors">
        {/* Search Bar */}
        <div className="flex items-center flex-1 max-w-xl" ref={searchRef}>
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
              onFocus={() => setSearchFocused(true)}
              className={clsx(
                'w-full pl-10 pr-16 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 transition-all outline-none',
                searchFocused ? 'ring-2 ring-blue-500/50 border-blue-500/30' : '',
              )}
            />
            {/* Kbd hint */}
            <button
              onClick={() => setCommandOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-1 rounded border border-zinc-700 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <Command size={10} /> K
            </button>

            {/* Inline search results dropdown */}
            {showSearch && flatResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 w-full bg-[#111] border border-zinc-800 rounded-lg shadow-2xl z-50 py-1 max-h-80 overflow-y-auto">
                {flatResults.map((r) => {
                  const badge = TYPE_BADGE[r.type];
                  return (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => handleSearchSelect(r)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 text-left transition-colors"
                    >
                      {r.type === 'task' && r.status && (
                        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', STATUS_COLORS[r.status] || 'bg-zinc-500')} />
                      )}
                      {r.type === 'project' && r.color && (
                        <div className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: r.color }} />
                      )}
                      {r.type === 'member' && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: r.avatar || '#6366f1' }}>
                          {r.title?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{r.title}</span>
                        {r.subtitle && <span className="text-[11px] text-zinc-500 block">{r.subtitle}</span>}
                        {r.projectName && (
                          <span className="text-[10px] mt-0.5 block" style={{ color: r.projectColor || '#71717a' }}>{r.projectName}</span>
                        )}
                      </div>
                      <span className={clsx('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0', badge.cls)}>
                        {badge.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {showSearch && searchQuery.trim() && flatResults.length === 0 && searchResults && (
              <div className="absolute top-full mt-1 left-0 w-full bg-[#111] border border-zinc-800 rounded-lg shadow-lg z-50 p-4 text-center text-sm text-zinc-500">
                No results for "{searchQuery}"
              </div>
            )}

            {/* Recent searches on focus */}
            {showRecent && (
              <div className="absolute top-full mt-1 left-0 w-full bg-[#111] border border-zinc-800 rounded-lg shadow-lg z-50 py-2">
                <p className="px-4 py-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Recent</p>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 text-left"
                  >
                    <Search size={12} className="text-zinc-600" />
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 text-zinc-500 hover:text-yellow-400 transition-colors rounded-lg hover:bg-zinc-800" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="relative" ref={notifRef}>
            <button onClick={fetchNotifications} className={clsx('relative p-2 text-zinc-500 hover:text-blue-400 transition-colors', bellShake && 'animate-bounce')}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#0a0a0a] animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full mt-1 w-96 bg-[#111] border border-zinc-800 rounded-xl shadow-2xl z-50">
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Notifications</h4>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"><CheckCheck size={12} /> Mark all read</button>
                    )}
                    <button onClick={() => setShowNotifs(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifLoading ? (
                    <div className="p-4 text-center text-sm text-zinc-500">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell size={24} className="text-zinc-700 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={clsx(
                          'px-3 py-3 hover:bg-zinc-900/50 border-b border-zinc-800/30 last:border-0 cursor-pointer transition-colors',
                          !n.read && 'border-l-2 border-l-blue-500 bg-blue-500/5',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', !n.read ? 'bg-blue-500' : 'bg-zinc-700')} />
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-xs leading-relaxed', !n.read ? 'text-zinc-200' : 'text-zinc-400')}>{n.message}</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">{n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : 'Just now'}</p>
                          </div>
                          <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0',
                            n.type === 'task_assigned' ? 'bg-blue-500/10 text-blue-400' :
                            n.type === 'comment_added' ? 'bg-purple-500/10 text-purple-400' :
                            n.type === 'task_moved' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-zinc-800 text-zinc-500',
                          )}>{n.type?.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-2 border-t border-zinc-800">
                    <button onClick={() => { setShowNotifs(false); navigate('/activity'); }} className="w-full text-center text-xs text-blue-400 hover:text-blue-300 py-1.5">View all activity</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-zinc-800 hover:ring-blue-500 transition-all cursor-pointer overflow-hidden"
              style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
            >
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || 'U'
              )}
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#111] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-4 border-b border-zinc-800 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 ring-2 ring-zinc-700 overflow-hidden"
                    style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
                  >
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0) || 'U'
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">{user?.name || 'User'}</p>
                  <p className="text-xs text-zinc-400">{user?.email || ''}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{user?.role || 'Member'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setShowProfile(false); navigate('/settings'); }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <User size={16} className="mr-3 text-zinc-500" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => { setShowProfile(false); navigate('/settings'); }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <Settings size={16} className="mr-3 text-zinc-500" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-zinc-800 py-1">
                  <button
                    onClick={() => { setShowProfile(false); logout(); }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={16} className="mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  );
};

export default Topbar;
