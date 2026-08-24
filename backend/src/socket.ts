import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from './config';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_event', (eventId: string) => {
      socket.join(`event:${eventId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined room event:${eventId}`);
    });

    socket.on('leave_event', (eventId: string) => {
      socket.leave(`event:${eventId}`);
      console.log(`[Socket.IO] Socket ${socket.id} left room event:${eventId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export interface SeatStatusUpdate {
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  holdId?: string | null;
  heldByUserId?: string | null;
}

export const broadcastSeatUpdate = (eventId: string, updates: SeatStatusUpdate[]) => {
  if (!io) return;
  io.to(`event:${eventId}`).emit('seats_updated', {
    eventId,
    updates,
    timestamp: new Date().toISOString(),
  });
  console.log(`[Socket.IO] Broadcasted ${updates.length} seat updates for event:${eventId}`);
};
