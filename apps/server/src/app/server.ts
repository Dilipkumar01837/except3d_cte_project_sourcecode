import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './create-app.js';
import { env } from '../config/index.js';
import { connectRedis } from '../shared/lib/redis.js';

export function createHttpServer() {
  const app = createApp();
  const httpServer = createServer(app);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.emit('connected', { message: 'Socket.io ready' });
  });

  return { httpServer, io };
}

export async function startServer() {
  const { httpServer } = createHttpServer();

  try {
    await connectRedis();
  } catch {
    console.warn('Redis unavailable — continuing without cache connection');
  }

  httpServer.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${String(env.port)}`);
  });

  return httpServer;
}
