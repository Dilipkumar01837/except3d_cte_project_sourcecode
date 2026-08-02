import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './create-app.js';
import { env } from '../config/index.js';
import { connectRedis } from '../shared/lib/redis.js';
import { verifyAccessToken } from '../shared/lib/jwt.js';
import { setSocketServer } from '../shared/lib/socket.js';
import { prisma } from '../shared/lib/prisma.js';
import { seedLeaderboardIfEmpty } from '../shared/lib/leaderboard.js';

export function createHttpServer() {
  const app = createApp();
  const httpServer = createServer(app);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  // Authenticated socket connections — derive identity from JWT, never trust client-supplied userId
  io.on('connection', (socket) => {
    const rawToken =
      (socket.handshake.auth as Record<string, unknown>)['token'] ??
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = verifyAccessToken(rawToken);
      const { sub: userId } = payload;

      // Join user-specific room for targeted events
      void socket.join(`user:${userId}`);
      (socket.data as { userId: string }).userId = userId;

      socket.emit('connected', { userId });

      socket.on('disconnect', () => {
        // No cleanup needed — room membership is socket-scoped
      });
    } catch {
      socket.disconnect(true);
    }
  });

  setSocketServer(io);

  return { httpServer, io };
}

async function reconcileLeaderboard(): Promise<void> {
  try {
    const profiles = await prisma.profile.findMany({
      select: { userId: true, xp: true },
      orderBy: { xp: 'desc' },
      take: 1000, // Cap at top-1000 for startup efficiency
    });
    await seedLeaderboardIfEmpty(profiles);
  } catch {
    // Non-critical — leaderboard will self-populate on next submission/reward
  }
}

export function startServer() {
  const { httpServer } = createHttpServer();

  void connectRedis()
    .then(() => reconcileLeaderboard())
    .catch(() => {
      console.warn('Redis unavailable — continuing without cache connection');
    });

  httpServer.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${String(env.port)}`);
  });

  return httpServer;
}
