import { prisma } from '../../shared/lib/prisma.js';
import { redis, isRedisReady, waitForRedisReady } from '../../shared/lib/redis.js';
import { dequeueSubmission, enqueueSubmission } from './execution.queue.js';
import { calculateScore, nextRank } from './scoring.service.js';
import { emitToUser } from '../../shared/lib/socket.js';
import { updateLeaderboard } from '../../shared/lib/leaderboard.js';
import { evaluateAchievements } from './achievement.service.js';
import { executeWithRunner, type JudgeExecutionResult } from './judge-execution.js';
import { markHintsResolved } from './hint-outcome.js';
import { resolveDuel } from '../duels/duel-resolve.js';
import { resolveChallengeRoom } from '../worlds/challenge-room.service.js';
import { publishDuelEvent } from '../duels/duel-realtime.js';

/** Logs a failed best-effort side effect without letting it abort the job. */
function logBackgroundError(label: string, error: unknown): void {
  process.stderr.write(
    `[worker] ${label} failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
}

/**
 * Achievement evaluation is fire-and-forget and must never crash the worker.
 * Chain a rejection handler so a failure is logged instead of surfacing as an
 * unhandled rejection.
 */
function runAchievements(input: Parameters<typeof evaluateAchievements>[0]): void {
  void evaluateAchievements(input).catch((error: unknown) => {
    logBackgroundError('achievement evaluation', error);
  });
}

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

  // Check whether this player has already passed this challenge before, so we
  // can skip XP / coin / completedChallenges awards on re-solves.
  const alreadySolved =
    result.status === 'ACCEPTED'
      ? (await prisma.submission.count({
          where: {
            userId: submission.userId,
            challengeId: submission.challengeId,
            id: { not: submission.id },
            status: 'ACCEPTED',
          },
        })) > 0
      : false;

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

    if (!alreadySolved) {
      // First-time solve: award XP, coins, and increment completedChallenges.
      newXp = profile.xp + reward.xp;
      newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)) + 1);
      completedTotal = profile.completedChallenges + 1;
      // Coding streak advances on the first accepted solve of a UTC day, is
      // kept for further solves the same day, and resets after a missed day.
      // Same UTC day-boundary rule the daily reward uses, so both paths agree.
      const utcDay = (date: Date): string => date.toISOString().split('T')[0] ?? '';
      const today = utcDay(new Date());
      const lastStreakDay = profile.lastStreakDate ? utcDay(profile.lastStreakDate) : null;
      const yesterday = utcDay(new Date(Date.now() - 86_400_000));
      const codingStreak =
        lastStreakDay === today
          ? profile.codingStreak
          : lastStreakDay === yesterday
            ? profile.codingStreak + 1
            : 1;
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
          codingStreak,
          lastStreakDate: new Date(),
          longestStreak: Math.max(profile.longestStreak, codingStreak),
        },
      });
    } else {
      // Re-solve: keep current values so achievements/notifications use real
      // numbers but don't pay out again.
      newXp = profile.xp;
      newLevel = profile.level;
      completedTotal = profile.completedChallenges;
      // Still count the game played (the player did run code again).
      await tx.profile.update({
        where: { userId: submission.userId },
        data: { gamesPlayed: { increment: 1 } },
      });
    }
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
    // Only send the "challenge complete" notification on the first solve.
    if (!alreadySolved) {
      await tx.playerNotification.create({
        data: {
          userId: submission.userId,
          type: 'LEVEL_COMPLETED',
          title: 'Challenge complete',
          body: `You earned ${String(reward.xp)} XP and ${String(reward.coins)} coins.`,
        },
      });
    }
  });
  // Best-effort result cache. The submission is already durably recorded in
  // PostgreSQL, so a Redis hiccup here must not abort the rest of the flow
  // (leaderboard, achievements, socket notification, duel resolution).
  try {
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
  } catch (error) {
    logBackgroundError(`cache write for submission ${submission.id}`, error);
  }

  if (result.status === 'ACCEPTED' && !alreadySolved) {
    // Update Redis leaderboard — only meaningful on first solve (XP was awarded).
    if (reward.xp > 0) {
      void updateLeaderboard(submission.userId, reward.xp).catch((error: unknown) => {
        logBackgroundError('leaderboard update', error);
      });
    }

    // Evaluate achievements (non-blocking)
    runAchievements({
      userId: submission.userId,
      trigger: 'CHALLENGES_SOLVED',
      challengesSolved: completedTotal,
      xp: newXp,
      level: newLevel,
      isPerfect: reward.score === 100,
    });

    if (completedTotal === 1) {
      runAchievements({
        userId: submission.userId,
        trigger: 'FIRST_CHALLENGE_SOLVED',
        challengesSolved: 1,
      });
    }

    if (reward.score === 100) {
      runAchievements({
        userId: submission.userId,
        trigger: 'PERFECT_SUBMISSION',
        isPerfect: true,
      });
    }

    runAchievements({ userId: submission.userId, trigger: 'XP_REACHED', xp: newXp });
    runAchievements({
      userId: submission.userId,
      trigger: 'LEVEL_REACHED',
      level: newLevel,
    });
  }

  // Notify the player in real-time via Socket.IO.
  // On a re-solve, report 0 XP/coins so the UI doesn't show a reward popup.
  emitToUser(submission.userId, 'submission:completed', {
    submissionId: submission.id,
    status: result.status,
    score: reward.score,
    xpEarned: alreadySolved ? 0 : reward.xp,
    coinsEarned: alreadySolved ? 0 : reward.coins,
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
    }).catch((error: unknown) => {
      logBackgroundError('duel progress publish', error);
    });
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
      await publishDuelEvent(submission.duelId, 'duel:result', event).catch((error: unknown) => {
        logBackgroundError('duel result publish', error);
      });
    }
  }
}

// Connection errors while Redis is down repeat on every iteration; log the
// first and then at most once per window so recovery stays visible without a
// log flood. A separate `recovered` line marks the end of the outage.
const WORKER_ERROR_LOG_INTERVAL_MS = 5_000;
let lastWorkerErrorLogAt = 0;

function logWorkerError(message: string): void {
  const now = Date.now();
  if (now - lastWorkerErrorLogAt < WORKER_ERROR_LOG_INTERVAL_MS) return;
  lastWorkerErrorLogAt = now;
  process.stderr.write(`[worker] ${message}\n`);
}

/** Sleep that resolves early when the supplied signal is aborted. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal?.aborted) {
      clearTimeout(timer);
      resolve();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface ExecutionWorkerOptions {
  /** Aborts the loop after the in-flight iteration. */
  signal?: AbortSignal;
  /** Server-side blocking timeout for the dequeue. Defaults to 5s. */
  dequeueTimeoutSeconds?: number;
  /** Base delay for the retry backoff. Defaults to 250ms. */
  retryBaseMs?: number;
  /** Cap for the retry backoff. Defaults to 5s. */
  retryMaxMs?: number;
  /** Overridable for tests. */
  dequeue?: (timeoutSeconds: number) => Promise<string | null>;
  /** Overridable for tests. */
  process?: (submissionId: string) => Promise<void>;
}

/**
 * Starts a durable queue consumer. Deploy this process separately from the HTTP API.
 *
 * The Redis client disables its offline queue, so a command issued while it is
 * not `ready` rejects immediately. The loop therefore waits for readiness before
 * every dequeue and backs off with a capped, jittered delay on any failure, so a
 * Redis outage or restart is survived instead of producing a tight error loop.
 */
export async function startExecutionWorker(options: ExecutionWorkerOptions = {}): Promise<void> {
  const {
    signal,
    dequeueTimeoutSeconds = 5,
    retryBaseMs = 250,
    retryMaxMs = 5_000,
    dequeue = dequeueSubmission,
    process: processSubmission = executeSubmission,
  } = options;

  let consecutiveFailures = 0;

  while (!signal?.aborted) {
    try {
      if (!isRedisReady()) {
        // Bounded wait; a timeout throws and is handled by the backoff below.
        await waitForRedisReady();
      }
      const submissionId = await dequeue(dequeueTimeoutSeconds);
      if (consecutiveFailures > 0) {
        consecutiveFailures = 0;
        process.stderr.write('[worker] Redis connection recovered\n');
      }
      if (submissionId) await processSubmission(submissionId);
    } catch (err) {
      consecutiveFailures += 1;
      const message = err instanceof Error ? err.message : String(err);
      logWorkerError(`error (attempt ${String(consecutiveFailures)}): ${message} - retrying`);
      // Bounded exponential backoff with jitter: prompt recovery, no tight loop.
      const backoff = Math.min(retryBaseMs * 2 ** (consecutiveFailures - 1), retryMaxMs);
      const jitter = Math.floor(backoff * 0.2 * Math.random());
      await sleep(backoff + jitter, signal);
    }
  }
}

/**
 * How long a submission may sit in QUEUED before the sweep re-enqueues it.
 *
 * Generous compared to normal latency (a worker BRPOPs within seconds) so a
 * deep backlog is not churned, while still bounding how long a lost queue
 * entry can strand a player.
 */
export const STUCK_QUEUED_AFTER_MS = 120_000;

/**
 * Re-enqueues submissions whose queue entry was lost to a worker crash.
 *
 * BRPOP is destructive: if the process dies after popping an id but before the
 * QUEUED→RUNNING claim commits, the Redis list no longer holds the id while the
 * database row still waits in QUEUED with nothing left to drain it. This sweep
 * is the visibility timeout that plain list queues lack. Re-pushing is safe
 * even when the row is merely waiting in a backlog, because the atomic claim
 * in {@link executeSubmission} lets exactly one duplicate process the row.
 */
export async function requeueStuckSubmissions(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STUCK_QUEUED_AFTER_MS);
  const stuck = await prisma.submission.findMany({
    where: { status: 'QUEUED', createdAt: { lte: cutoff } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  let requeued = 0;
  for (const { id } of stuck) {
    try {
      await enqueueSubmission(id);
    } catch (error) {
      // Redis rejected the push; stop this sweep instead of failing per id.
      // The next interval retries whatever is still stuck.
      logBackgroundError(`stuck-queue requeue (after ${String(requeued)} id(s))`, error);
      break;
    }
    requeued += 1;
  }
  return requeued;
}

/** Runs {@link requeueStuckSubmissions} on an interval. Returns a stop function. */
export function startQueueReaper(intervalMs = 60_000): () => void {
  const timer = setInterval(() => {
    void requeueStuckSubmissions()
      .then((count) => {
        if (count > 0) {
          process.stderr.write(`[worker] requeued ${String(count)} stuck QUEUED submission(s)\n`);
        }
      })
      .catch((err: unknown) => {
        process.stderr.write(`[worker] stuck-queue sweep failed: ${String(err)}\n`);
      });
  }, intervalMs);
  // Do not hold the event loop open just for the sweeper.
  timer.unref();
  return () => {
    clearInterval(timer);
  };
}
