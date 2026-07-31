import { Socket } from 'socket.io-client';

export interface SocketLogEntry {
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'connect' | 'disconnect' | 'error';
  event: string;
  data: any;
}

const socketLogs: SocketLogEntry[] = [];

if (typeof window !== 'undefined') {
  (window as any).__socketLogs = socketLogs;
  (window as any).__getSocketLogs = () => socketLogs;
  (window as any).__clearSocketLogs = () => {
    socketLogs.length = 0;
    console.log('Socket logs cleared.');
  };
}

export function registerSocketDebugger(socket: any, role: 'moderator' | 'participant') {
  if (!socket) return;

  const log = (type: SocketLogEntry['type'], event: string, data: any) => {
    const entry: SocketLogEntry = {
      timestamp: new Date().toISOString(),
      type,
      event,
      data,
    };
    socketLogs.push(entry);

    // Keep log buffer under 1000 items to prevent memory leaks
    if (socketLogs.length > 1000) {
      socketLogs.shift();
    }

    const typeColor = type === 'incoming' 
      ? 'background: #1b4d22; color: #a3e635; padding: 2px 4px; font-weight: bold;' 
      : type === 'outgoing'
      ? 'background: #4c1d95; color: #c084fc; padding: 2px 4px; font-weight: bold;'
      : 'background: #b45309; color: #fde047; padding: 2px 4px; font-weight: bold;';

    console.groupCollapsed(
      `%c[Socket:${role}]%c [${type.toUpperCase()}] ${event}`,
      'color: #8b6b3f; font-weight: bold;',
      typeColor
    );
    console.log('Event:', event);
    console.log('Data:', data);
    console.log('Timestamp:', entry.timestamp);
    console.groupEnd();
  };

  // Setup connection event logs
  socket.on('connect', () => {
    log('connect', 'connect', { socketId: socket.id });
  });

  socket.on('disconnect', (reason: any) => {
    log('disconnect', 'disconnect', { reason });
  });

  socket.on('connect_error', (err: any) => {
    log('error', 'connect_error', { message: err?.message || err });
  });

  // Catch-all listener for incoming socket packets
  if (typeof socket.onAny === 'function') {
    socket.onAny((event: string, ...args: any[]) => {
      // Don't log connect/disconnect twice
      if (['connect', 'disconnect', 'connect_error'].includes(event)) return;
      log('incoming', event, args);
    });
  }

  // Catch-all listener for outgoing socket packets
  if (typeof socket.onAnyOutgoing === 'function') {
    socket.onAnyOutgoing((event: string, ...args: any[]) => {
      if (['connect', 'disconnect', 'connect_error'].includes(event)) return;
      log('outgoing', event, args);
    });
  }
}
