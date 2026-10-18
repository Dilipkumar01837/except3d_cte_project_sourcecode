import type { Server as SocketServer, Socket } from 'socket.io';
import type { UserRole } from '@prisma/client';

let _io: SocketServer | undefined;

/**
 * Connected sockets that passed both token verification and the account check,
 * keyed by socket id.
 *
 * Held at module scope so a suspension can be acted on without threading the
 * socket server through the admin service, and so the revalidation sweep has a
 * single registry to walk. Entries are removed on disconnect and on sweep.
 */
export const authenticatedSockets = new Map<string, { userId: string; role: UserRole }>();

export function setSocketServer(server: SocketServer): void {
  _io = server;
}

export function getIo(): SocketServer | undefined {
  return _io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  _io?.to(`user:${userId}`).emit(event, data);
}

export function emitToDuel(duelId: string, event: string, data: unknown): void {
  _io?.of('/duel').to(`duel:${duelId}`).emit(event, data);
}

/**
 * Resolves a live socket by id across every namespace this server uses.
 *
 * `io.sockets` is only the root namespace's socket map, and each namespace keeps
 * its own map (`/duel` sockets have ids like `"/duel#<engineId>"`). A suspension
 * or auth sweep that only looks at `io.sockets` silently misses duel sockets —
 * the map lookup returns undefined and `?.disconnect(true)` no-ops, leaving the
 * suspended user connected. Check root first, then the `/duel` namespace.
 */
export function findSocketById(io: SocketServer | undefined, socketId: string): Socket | undefined {
  if (!io) return undefined;
  return io.sockets.sockets.get(socketId) ?? io.of('/duel').sockets.get(socketId);
}

/** Disconnects every live socket for a user. Called when an account is suspended. */
export function disconnectUserSockets(userId: string): number {
  let count = 0;
  for (const [socketId, entry] of authenticatedSockets) {
    if (entry.userId !== userId) continue;
    authenticatedSockets.delete(socketId);
    const socket = findSocketById(_io, socketId);
    socket?.disconnect(true);
    if (socket) count += 1;
  }
  return count;
}
