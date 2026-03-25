import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (socket) return socket;

  const getToken = () => {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const { state } = JSON.parse(stored);
        return state?.token;
      }
    } catch {}
    return null;
  };

  const token = getToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('[socket] connected', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] auth error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
