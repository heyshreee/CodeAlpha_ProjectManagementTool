import { io, type Socket } from 'socket.io-client';
import { authStore } from './api';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectSocket(): Socket {
  const token = authStore.getToken();
  if (socket && currentToken === token && socket.connected) return socket;
  // Token changed or connection lost since last called → reconnect fresh with
  // the current token so the server sees the latest identity.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = token;
  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function reconnectSocket(): Socket {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  return connectSocket();
}

export function getSocket(): Socket | null {
  return socket;
}

export function resyncProjects() {
  socket?.emit('projects:resync');
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}
