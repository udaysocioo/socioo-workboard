import React, { useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LayoutDashboard, KanbanSquare, ClipboardList, FolderKanban, Users, X } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BackgroundEffects from '../ui/BackgroundEffects';
import { useKeyboardShortcuts, SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import NewTaskModal from '../shared/NewTaskModal';
import clsx from 'clsx';

const MOBILE_TABS = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/board', icon: KanbanSquare, label: 'Board' },
  { to: '/your-tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/team', icon: Users, label: 'Team' },
];

const ShortcutsHelpModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-[#111] rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Keyboard Shortcuts</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
      </div>
      <div className="p-4 space-y-2">
        {SHORTCUTS.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs py-1.5">
            <span className="text-zinc-400">{s.desc}</span>
            <div className="flex gap-1">
              {s.keys.map((k) => (
                <kbd key={k} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 font-mono text-[10px]">{k}</kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MainLayout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onNewTask: () => setShowNewTask(true),
    onCommandPalette: () => setCommandPaletteOpen((p) => !p),
  });

  return (
    <div className="flex h-screen bg-black text-zinc-100 overflow-hidden font-sans">
      <BackgroundEffects />
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 h-full w-64">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 scroll-smooth">
          <AnimatePresence mode="wait">
            <div key={location.pathname} className="h-full">
              <Outlet />
            </div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a] border-t border-zinc-800 flex items-center justify-around py-2 px-1">
          {MOBILE_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[56px]',
                  isActive ? 'text-blue-400' : 'text-zinc-500',
                )
              }
            >
              <tab.icon size={20} />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Keyboard shortcuts help */}
      {showHelp && <ShortcutsHelpModal onClose={() => setShowHelp(false)} />}

      {/* New Task modal from shortcut */}
      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} onCreated={() => setShowNewTask(false)} />}
    </div>
  );
};

export default MainLayout;
