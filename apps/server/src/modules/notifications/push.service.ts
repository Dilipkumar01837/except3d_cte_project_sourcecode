import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { NotificationType } from '@prisma/client';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { prisma } from '../../shared/lib/prisma.js';
import { redis } from '../../shared/lib/redis.js';
import { authenticatedSockets, emitToUser } from '../../shared/lib/socket.js';
import { env } from '../../config/index.js';

function messaging() {
  if (!env.firebaseAdminProjectId || !env.firebaseAdminClientEmail || !env.firebaseAdminPrivateKey)
    return null;
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.firebaseAdminProjectId,
        clientEmail: env.firebaseAdminClientEmail,
        privateKey: env.firebaseAdminPrivateKey,
      }),
    });
  return getMessaging(app);
}
function online(userId: string): boolean {
  return [...authenticatedSockets.values()].some((entry) => entry.userId === userId);
}
const rateKey = (userId: string) => `cte:push:rate:${userId}`;
const notificationType = (value: string): NotificationType =>
  Object.values<NotificationType>([
    'ACHIEVEMENT_UNLOCKED',
    'LEVEL_COMPLETED',
    'DAILY_REWARD',
    'FRIEND_REQUEST',
    'FRIEND_ACCEPTED',
    'CHAT_MESSAGE',
    'MATCH_FOUND',
    'SYSTEM',
  ]).includes(value as NotificationType)
    ? (value as NotificationType)
    : 'SYSTEM';

export async function registerToken(userId: string, token: string, deviceInfo?: string) {
  return prisma.userFcmToken.upsert({
    where: { token },
    create: { userId, token, deviceInfo, enabled: true },
    update: { userId, deviceInfo, enabled: true, lastUsedAt: new Date() },
    select: { id: true, token: true, enabled: true, lastUsedAt: true },
  });
}
export async function unregisterToken(userId: string, token?: string) {
  await prisma.userFcmToken.deleteMany({ where: { userId, ...(token ? { token } : {}) } });
}

export interface NotificationInput {
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}
export async function notifyUser(
  userId: string,
  input: NotificationInput,
): Promise<'in-app' | 'push' | 'skipped'> {
  const notification = await prisma.playerNotification.create({
    data: {
      userId,
      type: notificationType(input.type),
      title: input.title.slice(0, 120),
      body: input.body.slice(0, 500),
      data: input.data,
    },
  });
  if (online(userId)) {
    emitToUser(userId, 'notification:new', notification);
    return 'in-app';
  }
  const count = await redis.incr(rateKey(userId));
  if (count === 1) await redis.expire(rateKey(userId), 3_600);
  if (count > 10) return 'skipped';
  const service = messaging();
  if (!service) return 'skipped';
  const tokens = await prisma.userFcmToken.findMany({
    where: { userId, enabled: true },
    select: { token: true },
  });
  if (tokens.length === 0) return 'skipped';
  // Firebase v12 deprecates this API in favor of installation-ID messaging, but
  // browser FCM registration tokens remain the supported web push contract here.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const message: MulticastMessage = {
    tokens: tokens.map((entry) => entry.token),
    notification: { title: input.title.slice(0, 120), body: input.body.slice(0, 500) },
    data: { type: input.type, notificationId: notification.id, ...input.data },
    webpush: { fcmOptions: { link: input.data?.url ?? '/' }, notification: { icon: '/vite.svg' } },
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const result = await service.sendEachForMulticast(message);
    const invalid = result.responses
      .flatMap((response, index) => {
        const code = response.error?.code ?? '';
        return response.success
          ? []
          : code.includes('registration-token') || code.includes('not-registered')
            ? [tokens[index]?.token]
            : [];
      })
      .filter((token): token is string => Boolean(token));
    if (invalid.length)
      await prisma.userFcmToken.deleteMany({ where: { userId, token: { in: invalid } } });
    await prisma.userFcmToken.updateMany({
      where: { userId, token: { in: tokens.map((entry) => entry.token) } },
      data: { lastUsedAt: new Date() },
    });
    return 'push';
  } catch {
    return 'skipped';
  }
}
