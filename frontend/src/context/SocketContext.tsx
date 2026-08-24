import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    const s = io(SOCKET_URL, {
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      console.log('⚡ Connected to WebSocket server');
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
      setIsConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
