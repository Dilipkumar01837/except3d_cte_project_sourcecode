/**
 * Worker progression guard.
 *
 * The HTTP layer rejects a locked submission, but the worker is the thing that
 * actually writes progression. These tests drive `executeSubmission` directly
 * (the same way a redelivered queue item would) to prove that:
 *   - a locked room is not completed even if a submission reaches the worker,
 *   - a duel win does not clear a level on the world map,
 *   - a reachable room is completed, grants its key, and advances the world.
 *
 * Redis is mocked: the worker only needs it for the leaderboard and the
 * submission cache, neither of which is the behaviour under test.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../shared/lib/redis.js', () => {
  const chain = {
    zincrby: () => chain,
    expire: () => chain,
    exec: () => Promise.resolve([]),
  };
  return {
    redis: {
      on: () => undefined,
      pipeline: () => chain,
      setex: () => Promise.resolve('OK'),
      lpush: () => Promise.resolve(1),
      brpop: () => Promise.resolve(null),
    },
    connectRedis: () => Promise.resolve(undefined),
  };
});

import { prisma } from '../shared/lib/prisma.js';
import { executeSubmission } from '../modules/challenges/execution.worker.js';
import { restoreRunner, stubRunner } from './support/mock-runner.js';

const stamp = Date.now();

async function makeUser(suffix: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `prog_${suffix}_${String(stamp)}@example.com`,
      username: `prog${suffix}${String(stamp).slice(-5)}`,
      passwordHash: 'not-a-real-hash',
      profile: { create: { displayName: `Progression ${suffix}` } },
    },
    select: { id: true },
  });
  return user.id;
}

async function runSubmission(userId: string, challengeId: string, duelId?: string): Promise<void> {
  const submission = await prisma.submission.create({
    data: {
      userId,
      challengeId,
      language: 'PYTHON' as const,
      sourceCode: 'print(1)',
      ...(duelId ? { duelId } : {}),
    },
    select: { id: true },
  });
  await executeSubmission(submission.id);
}

describe('worker progression guard', () => {
  let userLocked = '';
  let userDuel = '';
  let userReachable = '';
  let worldId = '';
  let level1Id = '';
  let level3Id = '';
  let keyId = '';
  let openChallengeId = '';
  let lockedChallengeId = '';

  beforeAll(async () => {
    userLocked = await makeUser('a');
    userDuel = await makeUser('b');
    userReachable = await makeUser('c');

    const open = await prisma.challenge.create({
      data: {
        slug: `prog-open-${String(stamp)}`,
        title: 'Progression Open',
        statement: 'Print the sum.',
        difficulty: 'EASY',
        type: 'ALGORITHMS',
        supportedLanguages: ['PYTHON'],
        isPublished: true,
        testCases: {
          create: [{ input: '1\n2\n', expectedOutput: '3\n', isHidden: false, sortOrder: 0 }],
        },
      },
      select: { id: true },
    });
    openChallengeId = open.id;

    const locked = await prisma.challenge.create({
      data: {
        slug: `prog-locked-${String(stamp)}`,
        title: 'Progression Locked',
        statement: 'Find the largest.',
        difficulty: 'EASY',
        type: 'ALGORITHMS',
        supportedLanguages: ['PYTHON'],
        isPublished: true,
        testCases: {
          create: [{ input: '1\n2\n', expectedOutput: '3\n', isHidden: false, sortOrder: 0 }],
        },
      },
      select: { id: true },
    });
    lockedChallengeId = locked.id;

    const world = await prisma.gameWorld.create({
      data: {
        slug: `prog-world-${String(stamp)}`,
        name: 'Progression World',
        description: 'Worker guard fixture.',
        sortOrder: stamp % 1_000_000_000,
        isPublished: true,
      },
      select: { id: true },
    });
    worldId = world.id;

    const level1 = await prisma.gameLevel.create({
      data: {
        worldId,
        number: 1,
        title: 'First',
        description: 'Reachable.',
        challengeId: openChallengeId,
        isPublished: true,
      },
      select: { id: true },
    });
    level1Id = level1.id;

    const level3 = await prisma.gameLevel.create({
      data: {
        worldId,
        number: 3,
        title: 'Ridge',
        description: 'Behind a locked gate.',
        challengeId: lockedChallengeId,
        isPublished: true,
      },
      select: { id: true },
    });
    level3Id = level3.id;

    const key = await prisma.roomKey.create({
      data: {
        worldId,
        slug: `prog-key-${String(stamp)}`,
        title: 'Progression Key',
        description: 'Granted by the first room.',
        grantedByLevelId: level1Id,
        isPublished: true,
      },
      select: { id: true },
    });
    keyId = key.id;

    await prisma.roomLock.create({
      data: {
        worldId,
        levelId: level3Id,
        title: 'Ridge Gate',
        prompt: 'Locked.',
        requiresKeyId: keyId,
        isPublished: true,
      },
    });
  });

  afterAll(async () => {
    restoreRunner();
    if (worldId) await prisma.gameWorld.delete({ where: { id: worldId } }).catch(() => undefined);
    await prisma.user
      .deleteMany({ where: { id: { in: [userLocked, userDuel, userReachable].filter(Boolean) } } })
      .catch(() => undefined);
    await prisma.challenge
      .deleteMany({ where: { id: { in: [openChallengeId, lockedChallengeId].filter(Boolean) } } })
      .catch(() => undefined);
  });

  it('does not clear a room the player cannot reach', async () => {
    const restore = stubRunner({ status: 'ACCEPTED' });
    try {
      await runSubmission(userLocked, lockedChallengeId);
    } finally {
      restore();
    }
    const progress = await prisma.playerLevelProgress.findFirst({
      where: { userId: userLocked, levelId: level3Id },
    });
    expect(progress).toBeNull();
  });

  it('does not let a duel win clear a level', async () => {
    const duel = await prisma.duelMatch.create({
      data: {
        challengeId: openChallengeId,
        creatorId: userDuel,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
      select: { id: true },
    });
    const restore = stubRunner({ status: 'ACCEPTED' });
    try {
      await runSubmission(userDuel, openChallengeId, duel.id);
    } finally {
      restore();
    }
    const progress = await prisma.playerLevelProgress.findFirst({
      where: { userId: userDuel, levelId: level1Id },
    });
    expect(progress).toBeNull();
  });

  it('completes a reachable room, grants its key, and advances the world', async () => {
    const restore = stubRunner({ status: 'ACCEPTED' });
    try {
      await runSubmission(userReachable, openChallengeId);
    } finally {
      restore();
    }

    const progress = await prisma.playerLevelProgress.findFirst({
      where: { userId: userReachable, levelId: level1Id },
    });
    expect(progress?.isCompleted).toBe(true);

    const heldKey = await prisma.playerRoomKey.findFirst({
      where: { userId: userReachable, keyId },
    });
    expect(heldKey).not.toBeNull();

    const worldProgress = await prisma.playerWorldProgress.findFirst({
      where: { userId: userReachable, worldId },
    });
    expect(worldProgress?.completionPercent).toBeGreaterThan(0);
  });
});
