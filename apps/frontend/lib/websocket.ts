import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const DEFAULT_WS_URL = 'http://localhost:4000';

export function getWebSocketUrl() {
  return process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL;
}

export function connectWebSocket(url: string = getWebSocketUrl()) {
  if (socket?.connected) return socket;

  socket = io(url, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  socket.on('connect_error', (error: any) => {
    console.error('WebSocket connection error:', error);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function subscribeToOrders(callback: (event: string, data: any) => void) {
  if (!socket) return;

  socket.emit('subscribe-orders', { room: 'orders' });

  socket.on('order:new', (order: any) => callback('order:new', order));
  socket.on('order:updated', (order: any) => callback('order:updated', order));
  socket.on('order:paid', (order: any) => callback('order:paid', order));
  socket.on('orders:refresh', (orders: any) => callback('orders:refresh', orders));
}

export function unsubscribeFromOrders() {
  if (!socket) return;
  socket.emit('unsubscribe-orders', { room: 'orders' });
  socket.off('order:new');
  socket.off('order:updated');
  socket.off('order:paid');
  socket.off('orders:refresh');
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
