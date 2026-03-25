import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../lib/socket';

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const on = useCallback((event, handler) => {
    const socket = getSocket();
    if (!socket) return () => {};
    socket.on(event, (data) => {
      setLastEvent({ event, data, time: Date.now() });
      handler(data);
    });
    return () => socket.off(event, handler);
  }, []);

  return { connected, lastEvent, on };
}
