import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

let io = null;

function initializeSocket(app) {
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  return httpServer;
}

function getIo() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export { initializeSocket, getIo, io };