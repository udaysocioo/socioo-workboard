import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

const Sidebar = ({ onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

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
      <div className="h-20 flex items-center justify-center border-b border-white/5 px-4">
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

      {/* User & Logout */}
      <div className="p-4 border-t border-zinc-800">
        <div
          className={clsx(
            'flex items-center',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {!collapsed && (
            <div className="flex items-center overflow-hidden">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
              >
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {user?.role || 'Member'}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className={clsx(
              'p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800/50',
              collapsed ? '' : 'ml-2',
            )}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
