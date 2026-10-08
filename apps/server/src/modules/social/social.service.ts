import { prisma } from '../../shared/lib/prisma.js';
import { redis } from '../../shared/lib/redis.js';
import { emitToUser } from '../../shared/lib/socket.js';
import { notifyUser } from '../notifications/push.service.js';

const publicUser = {
  id: true,
  username: true,
  avatarUrl: true,
  createdAt: true,
  profile: {
    select: {
      displayName: true,
      bio: true,
      level: true,
      xp: true,
      rank: true,
      friendsVisible: true,
    },
  },
} as const;
const pair = (a: string, b: string) =>
  a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
const onlineKey = (userId: string) => `cte:social:online:${userId}`;

export async function searchUsers(userId: string, query: string) {
  // Search by username only — searching by email leaks whether a given address
  // is registered (email enumeration) even though email is not in the response.
  return prisma.user.findMany({
    where: {
      id: { not: userId },
      isActive: true,
      username: { contains: query, mode: 'insensitive' },
    },
    take: 20,
    select: publicUser,
  });
}
export async function listFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: { select: publicUser }, userB: { select: publicUser } },
    orderBy: { createdAt: 'desc' },
  });
  return Promise.all(
    rows.map(async (row) => {
      const friend = row.userAId === userId ? row.userB : row.userA;
      return { ...friend, online: (await redis.exists(onlineKey(friend.id))) === 1 };
    }),
  );
}
export async function listRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: { receiverId: userId, status: 'PENDING' },
    include: { sender: { select: publicUser } },
    orderBy: { createdAt: 'desc' },
  });
}
export async function sendRequest(senderId: string, receiverId: string) {
  if (senderId === receiverId) return null;
  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: receiverId },
        { blockerId: receiverId, blockedId: senderId },
      ],
    },
  });
  if (blocked) return null;
  const request = await prisma.friendRequest.upsert({
    where: { senderId_receiverId: { senderId, receiverId } },
    create: { senderId, receiverId },
    update: { status: 'PENDING' },
  });
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { username: true },
  });
  await notifyUser(receiverId, {
    type: 'FRIEND_REQUEST',
    title: 'New friend request',
    body: `@${sender?.username ?? 'A runner'} wants to be friends.`,
    data: { url: '/friends' },
  });
  return request;
}
export async function respondRequest(userId: string, requestId: string, accept: boolean) {
  const request = await prisma.friendRequest.findFirst({
    where: { id: requestId, receiverId: userId, status: 'PENDING' },
  });
  if (!request) return null;
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.friendRequest.update({
      where: { id: requestId },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
    });
    if (accept)
      await tx.friendship.upsert({
        where: { userAId_userBId: pair(request.senderId, request.receiverId) },
        create: { ...pair(request.senderId, request.receiverId) },
        update: {},
      });
    return updated;
  });
  if (accept) {
    emitToUser(request.senderId, 'social:friend-accepted', { userId });
    await notifyUser(request.senderId, {
      type: 'FRIEND_ACCEPTED',
      title: 'Friend request accepted',
      body: 'Your friend request was accepted.',
      data: { url: '/friends' },
    });
  }
  return result;
}
export async function removeFriend(userId: string, otherId: string) {
  const result = await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userAId: userId, userBId: otherId },
        { userAId: otherId, userBId: userId },
      ],
    },
  });
  return result.count > 0;
}
export async function blockUser(userId: string, otherId: string) {
  await prisma.$transaction([
    prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: otherId } },
      create: { blockerId: userId, blockedId: otherId },
      update: {},
    }),
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { userAId: userId, userBId: otherId },
          { userAId: otherId, userBId: userId },
        ],
      },
    }),
  ]);
  return true;
}
export async function unblockUser(userId: string, otherId: string) {
  await prisma.blockedUser.deleteMany({ where: { blockerId: userId, blockedId: otherId } });
}
export async function listBlocks(userId: string) {
  return prisma.blockedUser.findMany({
    where: { blockerId: userId },
    include: { blocked: { select: publicUser } },
  });
}
async function canMessage(senderId: string, recipientId: string) {
  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: recipientId },
        { blockerId: recipientId, blockedId: senderId },
      ],
    },
  });
  if (blocked) return false;
  const friend = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: senderId, userBId: recipientId },
        { userAId: recipientId, userBId: senderId },
      ],
    },
  });
  return Boolean(friend);
}
export async function sendMessage(senderId: string, recipientId: string, body: string) {
  if (!(await canMessage(senderId, recipientId))) return null;
  const message = await prisma.message.create({
    data: { senderId, recipientId, body },
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      body: true,
      createdAt: true,
      readAt: true,
    },
  });
  emitToUser(recipientId, 'social:chat-message', message);
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { username: true },
  });
  await notifyUser(recipientId, {
    type: 'CHAT_MESSAGE',
    title: `Message from @${sender?.username ?? 'runner'}`,
    body,
    data: { url: '/friends' },
  });
  return message;
}
export async function listMessages(userId: string, otherId: string, cursor?: string) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: otherId },
        { senderId: otherId, recipientId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
}
export async function markMessagesRead(userId: string, otherId: string) {
  await prisma.message.updateMany({
    where: { senderId: otherId, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}
export async function getPublicProfile(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: { ...publicUser, _count: { select: { wonDuels: true, achievements: true } } },
  });
}
export async function friendLeaderboard(userId: string) {
  const friends = await listFriends(userId);
  const ids = [userId, ...friends.map((friend) => friend.id)];
  return prisma.profile.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, displayName: true, xp: true, level: true, rank: true },
    orderBy: { xp: 'desc' },
  });
}
export async function activityFeed(userId: string) {
  const friends = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  const ids = [
    userId,
    ...friends.map((row) => (row.userAId === userId ? row.userBId : row.userAId)),
  ];
  return prisma.activityFeed.findMany({
    where: { userId: { in: ids }, user: { profile: { activityVisible: true } } },
    include: { user: { select: { username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
export async function listNotifications(userId: string) {
  return prisma.playerNotification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
export async function markNotification(userId: string, id: string) {
  await prisma.playerNotification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}
