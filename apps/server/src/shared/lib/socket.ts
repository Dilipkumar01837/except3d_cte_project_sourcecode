import type { Server as SocketServer } from 'socket.io';

let _io: SocketServer | undefined;

export function setSocketServer(server: SocketServer): void {
  _io = server;
}

export function getIo(): SocketServer | undefined {
  return _io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  _io?.to(`user:${userId}`).emit(event, data);
}
