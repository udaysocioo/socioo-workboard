import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts({ onNewTask, onCommandPalette }) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  const handler = useCallback((e) => {
    // Skip if typing in input/textarea/select
    const tag = e.target?.tagName?.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

    // Ctrl/Cmd+K always works
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onCommandPalette?.();
      return;
    }

    // Esc to close help
    if (e.key === 'Escape') {
      setShowHelp(false);
      return;
    }

    // Skip other shortcuts if focused in input
    if (isInput) return;

    switch (e.key) {
      case '?': setShowHelp((p) => !p); break;
      case 'n': case 'N': onNewTask?.(); break;
      case 'b': case 'B': navigate('/board'); break;
      case 'd': case 'D': navigate('/'); break;
      case 't': case 'T': navigate('/your-tasks'); break;
      case 'p': case 'P': navigate('/projects'); break;
      default: break;
    }
  }, [navigate, onNewTask, onCommandPalette]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);

  return { showHelp, setShowHelp };
}

export const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'Open Command Palette' },
  { keys: ['N'], desc: 'New Task' },
  { keys: ['B'], desc: 'Go to Board' },
  { keys: ['D'], desc: 'Go to Dashboard' },
  { keys: ['T'], desc: 'Go to Your Tasks' },
  { keys: ['P'], desc: 'Go to Projects' },
  { keys: ['?'], desc: 'Show keyboard shortcuts' },
  { keys: ['Esc'], desc: 'Close modal / drawer' },
];
