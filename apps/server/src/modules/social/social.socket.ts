import type { Socket } from 'socket.io';
import { z } from 'zod';
import { redis } from '../../shared/lib/redis.js';
import { emitToUser } from '../../shared/lib/socket.js';
import { listFriends, sendMessage } from './social.service.js';

const messageSchema = z.object({
  recipientId: z.string().uuid(),
  body: z.string().trim().min(1).max(2_000),
});
const typingSchema = z.object({ recipientId: z.string().uuid(), typing: z.boolean() });
type Data = { userId?: string };
const key = (id: string) => `cte:social:online:${id}`;

export function attachSocialSocket(socket: Socket): void {
  const userId = (socket.data as Data).userId;
  if (!userId) return;
  void redis.setex(key(userId), 45, '1').catch(() => undefined);
  void listFriends(userId)
    .then((friends) => {
      for (const friend of friends)
        emitToUser(friend.id, 'social:presence', { userId, online: true });
    })
    .catch(() => undefined);
  const heartbeat = setInterval(() => {
    void redis.setex(key(userId), 45, '1').catch(() => undefined);
  }, 20_000);
  heartbeat.unref();
  socket.on('social:chat-message', async (payload: unknown, ack?: (result: unknown) => void) => {
    const parsed = messageSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
      return;
    }
    const message = await sendMessage(userId, parsed.data.recipientId, parsed.data.body);
    ack?.(message ? { ok: true, message } : { ok: false, error: 'FORBIDDEN' });
  });
  socket.on('social:typing', (payload: unknown) => {
    const parsed = typingSchema.safeParse(payload);
    if (parsed.success)
      emitToUser(parsed.data.recipientId, 'social:typing', {
        senderId: userId,
        typing: parsed.data.typing,
      });
  });
  socket.on('disconnect', () => {
    clearInterval(heartbeat);
    void redis.del(key(userId)).catch(() => undefined);
    void listFriends(userId)
      .then((friends) => {
        for (const friend of friends)
          emitToUser(friend.id, 'social:presence', { userId, online: false });
      })
      .catch(() => undefined);
  });
}
