import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  Users,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Pencil,
  User,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

const Sidebar = ({ onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/board', icon: KanbanSquare, label: 'Board' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/team', icon: Users, label: 'Team' },
    { to: '/activity', icon: Activity, label: 'Activity' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div
      className={clsx(
        'h-screen glass-sidebar text-zinc-400 transition-all duration-300 flex flex-col relative',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* Logo */}
      <div
        className="h-20 flex items-center justify-center border-b border-white/5 px-4 cursor-pointer"
        onClick={() => { navigate('/'); onNavigate?.(); }}
      >
        <img src="/socioo-logo.png" alt="Socioo" className={clsx('object-contain', collapsed ? 'w-9 h-9' : 'w-10 h-10')} />
        {!collapsed && (
          <span className="ml-3 font-bold text-2xl tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            SOCIOO
          </span>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Nav Links */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              clsx(
                'flex items-center p-3 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500'
                  : 'hover:bg-zinc-800/50 hover:text-white',
              )
            }
          >
            <item.icon
              size={22}
              className={clsx('min-w-[22px]', collapsed && 'mx-auto')}
            />
            {!collapsed && (
              <span className="ml-3 font-medium">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Profile Menu */}
      <div className="relative p-4 border-t border-zinc-800">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={clsx(
            'w-full flex items-center rounded-lg p-2 hover:bg-zinc-800/50 transition-colors cursor-pointer',
            collapsed ? 'justify-center' : '',
          )}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
          >
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          {!collapsed && (
            <div className="ml-3 flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {user?.role || 'Member'}
              </p>
            </div>
          )}
        </button>

        {/* Profile Popup */}
        {showProfileMenu && (
          <div className={clsx(
            'absolute bottom-full mb-2 bg-[#111] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden',
            collapsed ? 'left-0 w-56' : 'left-0 right-0',
          )}>
            <div className="p-3 border-b border-zinc-800 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white mx-auto mb-2 overflow-hidden"
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
            </div>
            <div className="py-1">
              <button
                onClick={() => { setShowProfileMenu(false); navigate('/settings'); onNavigate?.(); }}
                className="w-full flex items-center px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <User size={15} className="mr-2.5 text-zinc-500" />
                Edit Profile
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); navigate('/settings'); onNavigate?.(); }}
                className="w-full flex items-center px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <Settings size={15} className="mr-2.5 text-zinc-500" />
                Settings
              </button>
            </div>
            <div className="border-t border-zinc-800 py-1">
              <button
                onClick={() => { setShowProfileMenu(false); logout(); }}
                className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={15} className="mr-2.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
