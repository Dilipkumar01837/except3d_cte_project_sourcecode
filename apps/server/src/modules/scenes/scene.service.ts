import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';
import { redis } from '../../shared/lib/redis.js';

const key = (userId: string, levelId: string) => `cte:scene:${userId}:${levelId}`;

export interface SceneStateInput {
  playerPosition: { x: number; y: number; z: number };
  unlockedObjects: string[];
  sceneProgress: Record<string, unknown>;
}

export async function loadSceneState(userId: string, levelId: string) {
  const cached = await redis.get(key(userId, levelId));
  if (cached) return JSON.parse(cached) as SceneStateInput;
  const stored = await prisma.playerSceneState.findUnique({
    where: { userId_levelId: { userId, levelId } },
    select: { playerPosition: true, unlockedObjects: true, sceneProgress: true },
  });
  const state = stored
    ? {
        playerPosition: stored.playerPosition,
        unlockedObjects: stored.unlockedObjects,
        sceneProgress: stored.sceneProgress,
      }
    : { playerPosition: { x: 0, y: 1.6, z: 4 }, unlockedObjects: [], sceneProgress: {} };
  await redis.setex(key(userId, levelId), 86_400, JSON.stringify(state)).catch(() => undefined);
  return state;
}

export async function saveSceneState(userId: string, levelId: string, state: SceneStateInput) {
  const level = await prisma.gameLevel.findFirst({
    where: { id: levelId, isPublished: true, world: { isPublished: true } },
    select: { id: true },
  });
  if (!level) return null;
  const sceneProgress = state.sceneProgress as Prisma.InputJsonValue;
  const saved = await prisma.playerSceneState.upsert({
    where: { userId_levelId: { userId, levelId } },
    create: {
      userId,
      levelId,
      playerPosition: state.playerPosition,
      unlockedObjects: state.unlockedObjects,
      sceneProgress,
    },
    update: {
      playerPosition: state.playerPosition,
      unlockedObjects: state.unlockedObjects,
      sceneProgress,
    },
    select: { playerPosition: true, unlockedObjects: true, sceneProgress: true, updatedAt: true },
  });
  await redis.setex(key(userId, levelId), 86_400, JSON.stringify(state)).catch(() => undefined);
  return saved;
}

export async function getSceneDefinition(levelId: string) {
  return prisma.sceneDefinition.findFirst({
    where: { levelId, isPublished: true },
    select: { id: true, levelId: true, modelUrl: true, objects: true, settings: true },
  });
}

export async function listSceneDefinitions() {
  return prisma.sceneDefinition.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { level: { select: { title: true, world: { select: { name: true } } } } },
  });
}

export async function saveSceneDefinition(
  levelId: string,
  data: {
    modelUrl?: string;
    objects: Prisma.InputJsonValue;
    settings?: Prisma.InputJsonValue;
    isPublished?: boolean;
  },
) {
  return prisma.sceneDefinition.upsert({
    where: { levelId },
    create: { levelId, ...data },
    update: data,
  });
}
