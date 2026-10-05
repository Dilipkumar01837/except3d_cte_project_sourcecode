import { prisma } from '../../shared/lib/prisma.js';
import { redis } from '../../shared/lib/redis.js';
import { dequeueSubmission } from './execution.queue.js';
import { calculateScore, nextRank } from './scoring.service.js';
import { emitToUser } from '../../shared/lib/socket.js';
import { updateLeaderboard } from '../../shared/lib/leaderboard.js';
import { evaluateAchievements } from './achievement.service.js';
import { executeWithRunner, type JudgeExecutionResult } from './judge-execution.js';
import { markHintsResolved } from './hint-outcome.js';
import { resolveDuel } from '../duels/duel-resolve.js';
import { resolveChallengeRoom } from '../worlds/challenge-room.service.js';
import { publishDuelEvent } from '../duels/duel-realtime.js';

export async function executeSubmission(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    include: {
      challenge: { include: { testCases: true, gameLevel: { include: { world: true } } } },
    },
    where: { id: submissionId },
  });
  if (!submission) return;
  // Atomic claim. A plain read-then-write let two workers (or a Redis redelivery
  // after a crash) both observe QUEUED, both proceed, and both pay out XP and
  // coins. updateMany with a status guard makes exactly one of them win.
  const claim = await prisma.submission.updateMany({
    where: { id: submissionId, status: 'QUEUED' },
    data: { status: 'RUNNING' },
  });
  if (claim.count === 0) return;
  let result: JudgeExecutionResult;
  try {
    result = await executeWithRunner({
      language: submission.language,
      sourceCode: submission.sourceCode,
      timeLimitMs: submission.challenge.timeLimitMs,
      memoryLimitMb: submission.challenge.memoryLimitMb,
      testCases: submission.challenge.testCases.map(({ id, input, expectedOutput }) => ({
        id,
        input,
        expectedOutput,
      })),
    });
  } catch (error) {
    result = {
      status: 'INTERNAL_ERROR',
      compilerOutput: error instanceof Error ? error.message : 'Execution service unavailable',
      results: [],
    };
  }
  const passed = result.results.filter((item) => item.passed).length;
  const priorAttempts = await prisma.submission.count({
    where: {
      userId: submission.userId,
      challengeId: submission.challengeId,
      id: { not: submission.id },
      status: { not: 'QUEUED' },
    },
  });
  const revealedHints = await prisma.playerHintReveal.findMany({
    where: {
      userId: submission.userId,
      hint: { challengeId: submission.challengeId },
    },
    select: { hint: { select: { xpPenalty: true } } },
  });
  const hintPenalty = revealedHints.reduce((sum, reveal) => sum + reveal.hint.xpPenalty, 0);
  const reward =
    result.status === 'ACCEPTED'
      ? calculateScore({
          baseXp: submission.challenge.xpReward,
          difficulty: submission.challenge.difficulty,
          passed,
          total: submission.challenge.testCases.length,
          elapsedMs: result.executionTimeMs ?? submission.challenge.timeLimitMs,
          timeLimitMs: submission.challenge.timeLimitMs,
          priorAttempts,
          hintPenalty,
        })
      : { score: 0, xp: 0, coins: 0 };
  let newXp = 0;
  let newLevel = 1;
  let completedTotal = 0;

  // Escape-room progression is only advanced by a normal (non-duel) submission
  // whose room is genuinely reachable. The HTTP gate already rejects locked
  // submissions, but re-checking here means no other enqueue path can slip past
  // a door, and a duel win cannot silently clear a level on the world map.
  const room =
    result.status === 'ACCEPTED' && !submission.duelId
      ? await resolveChallengeRoom(submission.userId, submission.challengeId)
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: { id: submission.id },
      data: {
        status: result.status,
        score: reward.score,
        executionTimeMs: result.executionTimeMs,
        memoryUsedKb: result.memoryUsedKb,
        compilerOutput: result.compilerOutput,
        runtimeOutput: result.runtimeOutput,
        completedAt: new Date(),
        results: {
          create: result.results.map((item) => ({
            testCaseId: item.testCaseId,
            passed: item.passed,
            executionTimeMs: item.executionTimeMs,
            memoryUsedKb: item.memoryUsedKb,
            output: item.output,
          })),
        },
      },
    });
    if (result.status !== 'ACCEPTED') return;
    // Engagement signal only: the player received at least one hint for this
    // challenge and has now solved it. This does not claim the hint caused the
    // solve; it records that a hint preceded an accepted submission.
    await markHintsResolved(tx, {
      userId: submission.userId,
      challengeId: submission.challengeId,
      resolvedAt: new Date(),
    });
    const profile = await tx.profile.findUniqueOrThrow({ where: { userId: submission.userId } });
    newXp = profile.xp + reward.xp;
    newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)) + 1);
    completedTotal = profile.completedChallenges + 1;
    await tx.profile.update({
      where: { userId: submission.userId },
      data: {
        xp: newXp,
        coins: profile.coins + reward.coins,
        level: newLevel,
        rank: nextRank(newLevel),
        completedChallenges: { increment: 1 },
        gamesPlayed: { increment: 1 },
        accuracy: Math.max(profile.accuracy, reward.score / 100),
      },
    });
    const gameLevel = submission.challenge.gameLevel;
    if (gameLevel && room?.access === 'OPEN') {
      const previousProgress = await tx.playerLevelProgress.findUnique({
        where: { userId_levelId: { userId: submission.userId, levelId: gameLevel.id } },
        select: { bestTimeSeconds: true },
      });
      const elapsedSeconds = result.executionTimeMs
        ? Math.min(Math.ceil(result.executionTimeMs / 1000), 2_147_483_647)
        : null;
      await tx.playerLevelProgress.upsert({
        where: { userId_levelId: { userId: submission.userId, levelId: gameLevel.id } },
        create: {
          userId: submission.userId,
          levelId: gameLevel.id,
          isCompleted: true,
          stars: reward.score >= 100 ? 3 : reward.score >= 70 ? 2 : 1,
          attempts: 1,
          bestTimeSeconds: elapsedSeconds,
          completedAt: new Date(),
          lastPlayedAt: new Date(),
        },
        update: {
          isCompleted: true,
          stars: { set: Math.max(1, reward.score >= 100 ? 3 : reward.score >= 70 ? 2 : 1) },
          attempts: { increment: 1 },
          bestTimeSeconds:
            elapsedSeconds === null
              ? undefined
              : {
                  set:
                    previousProgress?.bestTimeSeconds === null ||
                    previousProgress?.bestTimeSeconds === undefined
                      ? elapsedSeconds
                      : Math.min(previousProgress.bestTimeSeconds, elapsedSeconds),
                },
          completedAt: new Date(),
          lastPlayedAt: new Date(),
        },
      });
      const publishedLevelCount = await tx.gameLevel.count({
        where: { worldId: gameLevel.worldId, isPublished: true },
      });
      const completedLevelCount = await tx.playerLevelProgress.count({
        where: {
          userId: submission.userId,
          level: { worldId: gameLevel.worldId, isPublished: true },
          isCompleted: true,
        },
      });
      const completionPercent =
        publishedLevelCount > 0
          ? Math.min(100, Math.round((completedLevelCount / publishedLevelCount) * 100))
          : 0;
      await tx.playerWorldProgress.upsert({
        where: { userId_worldId: { userId: submission.userId, worldId: gameLevel.worldId } },
        create: {
          userId: submission.userId,
          worldId: gameLevel.worldId,
          isUnlocked: true,
          completionPercent,
          lastPlayedAt: new Date(),
          completedAt: completionPercent === 100 ? new Date() : null,
        },
        update: {
          isUnlocked: true,
          completionPercent,
          lastPlayedAt: new Date(),
          completedAt: completionPercent === 100 ? new Date() : undefined,
        },
      });
      if (completionPercent === 100) {
        const nextWorld = await tx.gameWorld.findFirst({
          where: { sortOrder: { gt: gameLevel.world.sortOrder }, isPublished: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        });
        if (nextWorld) {
          await tx.playerWorldProgress.upsert({
            where: { userId_worldId: { userId: submission.userId, worldId: nextWorld.id } },
            create: { userId: submission.userId, worldId: nextWorld.id, isUnlocked: true },
            update: { isUnlocked: true },
          });
        }
      }

      // Award the escape-room key this level grants, if it grants one. Done
      // inside the same transaction as the level completion so a player can never
      // see a level marked complete without its key, or hold a key for a level
      // they did not solve. The unique constraint on (userId, keyId) makes
      // re-solving the level a no-op rather than a duplicate.
      const grantedKey = await tx.roomKey.findFirst({
        where: { grantedByLevelId: gameLevel.id, isPublished: true },
        select: { id: true, title: true },
      });
      if (grantedKey) {
        await tx.playerRoomKey.upsert({
          where: { userId_keyId: { userId: submission.userId, keyId: grantedKey.id } },
          create: { userId: submission.userId, keyId: grantedKey.id },
          update: {},
        });
        await tx.playerNotification.create({
          data: {
            userId: submission.userId,
            type: 'LEVEL_COMPLETED',
            title: `Key found: ${grantedKey.title}`,
            body: 'It may open a door you have not reached yet.',
          },
        });
      }
    }
    await tx.playerNotification.create({
      data: {
        userId: submission.userId,
        type: 'LEVEL_COMPLETED',
        title: 'Challenge complete',
        body: `You earned ${String(reward.xp)} XP and ${String(reward.coins)} coins.`,
      },
    });
  });
  await redis.setex(
    `cte:submission:${submission.id}`,
    3_600,
    JSON.stringify({
      status: result.status,
      score: reward.score,
      executionTimeMs: result.executionTimeMs,
      memoryUsedKb: result.memoryUsedKb,
    }),
  );

  if (result.status === 'ACCEPTED') {
    // Update Redis leaderboard
    if (reward.xp > 0) {
      void updateLeaderboard(submission.userId, reward.xp);
    }

    // Evaluate achievements (non-blocking)
    void evaluateAchievements({
      userId: submission.userId,
      trigger: 'CHALLENGES_SOLVED',
      challengesSolved: completedTotal,
      xp: newXp,
      level: newLevel,
      isPerfect: reward.score === 100,
    });

    if (completedTotal === 1) {
      void evaluateAchievements({
        userId: submission.userId,
        trigger: 'FIRST_CHALLENGE_SOLVED',
        challengesSolved: 1,
      });
    }

    if (reward.score === 100) {
      void evaluateAchievements({
        userId: submission.userId,
        trigger: 'PERFECT_SUBMISSION',
        isPerfect: true,
      });
    }

    void evaluateAchievements({ userId: submission.userId, trigger: 'XP_REACHED', xp: newXp });
    void evaluateAchievements({
      userId: submission.userId,
      trigger: 'LEVEL_REACHED',
      level: newLevel,
    });
  }

  // Notify the player in real-time via Socket.IO
  emitToUser(submission.userId, 'submission:completed', {
    submissionId: submission.id,
    status: result.status,
    score: reward.score,
    xpEarned: reward.xp,
    coinsEarned: reward.coins,
  });
  if (submission.duelId) {
    await publishDuelEvent(submission.duelId, 'duel:progress-update', {
      duelId: submission.duelId,
      userId: submission.userId,
      passed,
      total: submission.challenge.testCases.length,
      elapsedMs: result.executionTimeMs ?? 0,
      language: submission.language,
      status: 'COMPLETED',
      score: reward.score,
      submissionStatus: result.status,
    }).catch(() => undefined);
  }

  if (submission.duelId && result.status === 'ACCEPTED') {
    const resolution = await resolveDuel(submission.duelId);
    if (resolution?.resolved) {
      const event = {
        duelId: submission.duelId,
        status: 'COMPLETED',
        winnerId: resolution.winnerId,
      };
      emitToUser(resolution.creatorId, 'duel:completed', event);
      if (resolution.opponentId) emitToUser(resolution.opponentId, 'duel:completed', event);
      await publishDuelEvent(submission.duelId, 'duel:result', event).catch(() => undefined);
    }
  }
}

/** Starts a durable queue consumer. Deploy this process separately from the HTTP API. */
export async function startExecutionWorker(): Promise<void> {
  for (;;) {
    try {
      const submissionId = await dequeueSubmission();
      if (submissionId) await executeSubmission(submissionId);
    } catch (err) {
      // Log and continue — one bad submission must not crash the entire worker.
      // Transient Redis/DB errors are self-healing on the next iteration.
      process.stderr.write(`[worker] unhandled error: ${String(err)}\n`);
      // Brief pause to avoid tight error loops on persistent failures.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 2_000);
      });
    }
  }
}
