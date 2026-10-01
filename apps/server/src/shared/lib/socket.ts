import type { Server as SocketServer } from 'socket.io';
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

/** Disconnects every live socket for a user. Called when an account is suspended. */
export function disconnectUserSockets(userId: string): number {
  let count = 0;
  for (const [socketId, entry] of authenticatedSockets) {
    if (entry.userId !== userId) continue;
    authenticatedSockets.delete(socketId);
    _io?.sockets.sockets.get(socketId)?.disconnect(true);
    count += 1;
  }
  return count;
}
