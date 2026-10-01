import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './create-app.js';
import { env } from '../config/index.js';
import { connectRedis } from '../shared/lib/redis.js';
import { verifyAccessToken } from '../shared/lib/jwt.js';
import { setSocketServer, authenticatedSockets } from '../shared/lib/socket.js';
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

    let userId: string;
    try {
      const payload = verifyAccessToken(rawToken);
      userId = payload.sub;
    } catch {
      socket.disconnect(true);
      return;
    }

    // A valid JWT only proves the token was signed, not that the account is
    // still allowed in. Suspending a user revokes their refresh tokens, but an
    // already-connected socket would keep receiving their private events until
    // the token expired. Check the account at connect time, and again on the
    // sweep below.
    void prisma.user
      .findUnique({
        where: { id: userId },
        select: { isActive: true, role: true },
      })
      .then((user) => {
        if (!user || !user.isActive) {
          socket.disconnect(true);
          return;
        }
        // Join user-specific room for targeted events
        void socket.join(`user:${userId}`);
        const data = socket.data as { userId: string; role: string };
        data.userId = userId;
        data.role = user.role;
        authenticatedSockets.set(socket.id, { userId, role: user.role });

        socket.emit('connected', { userId });

        socket.on('disconnect', () => {
          authenticatedSockets.delete(socket.id);
        });
      })
      .catch(() => {
        // Database unavailable: fail closed rather than admitting a socket whose
        // standing we could not confirm.
        socket.disconnect(true);
      });
  });

  /**
   * Re-checks every connected socket against the account table.
   *
   * The interval exists because a suspension can happen long after connect, and
   * `verifyAccessToken` says nothing about current account status. One timer for
   * all sockets rather than one per socket, so the cost is a single tick.
   */
  const sweep = setInterval(() => {
    if (authenticatedSockets.size === 0) return;
    void (async () => {
      const userIds = [...new Set([...authenticatedSockets.values()].map((e) => e.userId))];
      if (userIds.length === 0) return;
      const users = await prisma.user
        .findMany({
          where: { id: { in: userIds } },
          select: { id: true, isActive: true, role: true },
        })
        .catch(() => null);
      if (!users) return; // Database hiccup: try again next tick.

      const byId = new Map(users.map((user) => [user.id, user]));
      for (const [socketId, entry] of authenticatedSockets) {
        const user = byId.get(entry.userId);
        if (!user || !user.isActive) {
          authenticatedSockets.delete(socketId);
          io.sockets.sockets.get(socketId)?.disconnect(true);
          continue;
        }
        // Role changes do not need a disconnect, but the cached copy must not go
        // stale or the socket would keep acting on its original role.
        if (user.role !== entry.role) {
          authenticatedSockets.set(socketId, { userId: entry.userId, role: user.role });
          const data = io.sockets.sockets.get(socketId)?.data as
            { userId: string; role: string } | undefined;
          if (data) data.role = user.role;
        }
      }
    })();
  }, env.socketAuthRevalidateMs);

  // Never keep the process alive just for the sweep.
  sweep.unref();
  io.on('close', () => {
    clearInterval(sweep);
    authenticatedSockets.clear();
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
