import { prisma } from '../../shared/lib/prisma.js';
import { redis } from '../../shared/lib/redis.js';
import { env } from '../../config/index.js';
import { dequeueSubmission } from './execution.queue.js';
import { calculateScore, nextRank } from './scoring.service.js';
import { emitToUser } from '../../shared/lib/socket.js';
import { updateLeaderboard } from '../../shared/lib/leaderboard.js';
import { evaluateAchievements } from './achievement.service.js';

type RunnerResult = {
  status:
    | 'ACCEPTED'
    | 'WRONG_ANSWER'
    | 'COMPILATION_ERROR'
    | 'RUNTIME_ERROR'
    | 'TIME_LIMIT_EXCEEDED'
    | 'MEMORY_LIMIT_EXCEEDED'
    | 'INTERNAL_ERROR';
  executionTimeMs?: number;
  memoryUsedKb?: number;
  compilerOutput?: string;
  runtimeOutput?: string;
  results: Array<{
    testCaseId: string;
    passed: boolean;
    executionTimeMs?: number;
    memoryUsedKb?: number;
    output?: string;
  }>;
};

const terminalStatuses = new Set<RunnerResult['status']>([
  'ACCEPTED',
  'WRONG_ANSWER',
  'COMPILATION_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
]);
const MAX_RUNNER_TEXT_BYTES = 64_000;

/** Treat the runner as an untrusted internal dependency: validate and bound every value it returns. */
function validateRunnerResult(
  value: unknown,
  permittedTestCaseIds: ReadonlySet<string>,
): RunnerResult | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.status !== 'string' ||
    !terminalStatuses.has(body.status as RunnerResult['status']) ||
    !Array.isArray(body.results)
  )
    return null;
  const text = (input: unknown): string | undefined =>
    typeof input === 'string' ? input.slice(0, MAX_RUNNER_TEXT_BYTES) : undefined;
  const metric = (input: unknown): number | undefined =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0
      ? Math.floor(input)
      : undefined;
  const seen = new Set<string>();
  const results: RunnerResult['results'] = [];
  for (const item of body.results) {
    if (typeof item !== 'object' || item === null) return null;
    const result = item as Record<string, unknown>;
    if (
      typeof result.testCaseId !== 'string' ||
      !permittedTestCaseIds.has(result.testCaseId) ||
      seen.has(result.testCaseId) ||
      typeof result.passed !== 'boolean'
    )
      return null;
    seen.add(result.testCaseId);
    results.push({
      testCaseId: result.testCaseId,
      passed: result.passed,
      executionTimeMs: metric(result.executionTimeMs),
      memoryUsedKb: metric(result.memoryUsedKb),
      output: text(result.output),
    });
  }
  return {
    status: body.status as RunnerResult['status'],
    executionTimeMs: metric(body.executionTimeMs),
    memoryUsedKb: metric(body.memoryUsedKb),
    compilerOutput: text(body.compilerOutput),
    runtimeOutput: text(body.runtimeOutput),
    results,
  };
}

async function executeSubmission(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    include: { challenge: { include: { testCases: true } } },
    where: { id: submissionId },
  });
  if (!submission || submission.status !== 'QUEUED') return;
  await prisma.submission.update({ where: { id: submissionId }, data: { status: 'RUNNING' } });
  const runnerUrl = env.codeRunnerUrl;
  let result: RunnerResult;
  try {
    const response = await fetch(`${runnerUrl}/execute`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.codeRunnerToken}`,
      },
      body: JSON.stringify({
        language: submission.language,
        sourceCode: submission.sourceCode,
        timeLimitMs: submission.challenge.timeLimitMs,
        memoryLimitMb: submission.challenge.memoryLimitMb,
        testCases: submission.challenge.testCases.map(({ id, input, expectedOutput }) => ({
          id,
          input,
          expectedOutput,
        })),
      }),
      signal: AbortSignal.timeout(submission.challenge.timeLimitMs + 5_000),
    });
    if (!response.ok) throw new Error(`Runner returned ${String(response.status)}`);
    const validated = validateRunnerResult(
      await response.json(),
      new Set(submission.challenge.testCases.map((testCase) => testCase.id)),
    );
    if (!validated) throw new Error('Runner returned an invalid execution result');
    result = validated;
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
        })
      : { score: 0, xp: 0, coins: 0 };
  let newXp = 0;
  let newLevel = 1;
  let completedTotal = 0;

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
