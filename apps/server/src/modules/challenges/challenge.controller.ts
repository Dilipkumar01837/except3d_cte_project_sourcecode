import type { Request, Response } from 'express';
import { ProgrammingLanguage } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import { enqueueSubmission } from './execution.queue.js';
import { executeWithRunner, JudgeServiceError } from './judge-execution.js';
import { AiHintUnavailableError, generateAiHint } from './ai-hint.service.js';

function playerId(req: Request, res: Response): string | undefined {
  const id = req.user?.sub;
  if (!id) sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
  return id;
}

function stringParam(req: Request, res: Response, key: string): string | undefined {
  const value = req.params[key];
  if (typeof value !== 'string' || value.length === 0)
    sendError(res, 400, 'VALIDATION_ERROR', `Missing ${key}`);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Shared validation for submit/run payloads. Responds on failure and returns undefined. */
function submissionBody(
  req: Request,
  res: Response,
): { language: ProgrammingLanguage; sourceCode: string } | undefined {
  const body = req.body as { language?: string; sourceCode?: string };
  if (
    typeof body.sourceCode !== 'string' ||
    body.sourceCode.length === 0 ||
    body.sourceCode.length > 100_000
  ) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Source code must be between 1 and 100000 characters');
    return;
  }
  if (!Object.values(ProgrammingLanguage).includes(body.language as ProgrammingLanguage)) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Unsupported language');
    return;
  }
  return { language: body.language as ProgrammingLanguage, sourceCode: body.sourceCode };
}

/** Lists only published challenge metadata; test data never leaves this boundary. */
export async function listChallenges(_req: Request, res: Response): Promise<void> {
  const challenges = await prisma.challenge.findMany({
    where: { isPublished: true },
    orderBy: [{ difficulty: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      type: true,
      tags: true,
      supportedLanguages: true,
      xpReward: true,
      timeLimitMs: true,
      memoryLimitMb: true,
    },
  });
  sendSuccess(res, { challenges });
}

/** Returns a published challenge and its visible examples only. */
export async function getChallenge(req: Request, res: Response): Promise<void> {
  const slug = stringParam(req, res, 'slug');
  if (!slug) return;
  const challenge = await prisma.challenge.findFirst({
    where: { slug, isPublished: true },
    include: {
      testCases: {
        where: { isHidden: false },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, input: true, expectedOutput: true, explanation: true },
      },
      hints: { orderBy: { level: 'asc' }, select: { level: true, xpPenalty: true } },
    },
  });
  if (!challenge) {
    sendError(res, 404, 'NOT_FOUND', 'Challenge not found');
    return;
  }
  sendSuccess(res, { challenge });
}

export async function getHint(req: Request, res: Response): Promise<void> {
  const id = playerId(req, res);
  const slug = stringParam(req, res, 'slug');
  const level = Number.parseInt(String(req.params['level']), 10);
  if (!id || !slug || !Number.isInteger(level) || level < 1) {
    if (Number.isNaN(level)) sendError(res, 400, 'VALIDATION_ERROR', 'Invalid hint level');
    return;
  }
  const hint = await prisma.challengeHint.findFirst({
    where: { level, challenge: { slug, isPublished: true } },
    select: { id: true, content: true, xpPenalty: true },
  });
  if (!hint) {
    sendError(res, 404, 'NOT_FOUND', 'Hint not found');
    return;
  }
  // Record the reveal exactly once per player per hint so a hint is charged
  // a single time even if the player double-clicks or re-requests the level.
  const existing = await prisma.playerHintReveal.findUnique({
    where: { userId_hintId: { userId: id, hintId: hint.id } },
    select: { id: true },
  });
  const alreadyRevealed = existing !== null;
  if (!alreadyRevealed) {
    await prisma.playerHintReveal.create({ data: { userId: id, hintId: hint.id } });
  }
  sendSuccess(res, {
    hint: { content: hint.content, xpPenalty: hint.xpPenalty, alreadyRevealed },
  });
}

export async function getAiHint(req: Request, res: Response): Promise<void> {
  const id = playerId(req, res);
  const slug = stringParam(req, res, 'slug');
  const body = req.body as { language?: string; sourceCode?: string };
  if (!id || !slug) return;
  if (
    typeof body.sourceCode !== 'string' ||
    body.sourceCode.length === 0 ||
    body.sourceCode.length > 100_000
  ) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Source code must be between 1 and 100000 characters');
    return;
  }
  if (typeof body.language !== 'string') {
    sendError(res, 400, 'VALIDATION_ERROR', 'Language is required');
    return;
  }
  const challenge = await prisma.challenge.findFirst({
    where: { slug, isPublished: true },
    select: { statement: true },
  });
  if (!challenge) {
    sendError(res, 404, 'NOT_FOUND', 'Challenge not found');
    return;
  }
  try {
    const hint = await generateAiHint({
      statement: challenge.statement,
      language: body.language,
      sourceCode: body.sourceCode,
    });
    sendSuccess(res, { hint });
  } catch (error) {
    sendError(
      res,
      503,
      'AI_HINT_UNAVAILABLE',
      error instanceof AiHintUnavailableError
        ? error.message
        : 'AI hints are temporarily unavailable.',
    );
  }
}

/** Persists an immutable submission and atomically schedules it for the isolated worker. */
export async function createSubmission(req: Request, res: Response): Promise<void> {
  const userId = playerId(req, res);
  const slug = stringParam(req, res, 'slug');
  const body = submissionBody(req, res);
  if (!userId || !slug || !body) return;
  const challenge = await prisma.challenge.findFirst({ where: { slug, isPublished: true } });
  if (!challenge || !challenge.supportedLanguages.includes(body.language)) {
    sendError(res, 404, 'NOT_FOUND', 'Challenge or language not available');
    return;
  }
  const submission = await prisma.submission.create({
    data: {
      userId,
      challengeId: challenge.id,
      language: body.language,
      sourceCode: body.sourceCode,
    },
  });
  try {
    await enqueueSubmission(submission.id);
  } catch (error) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'INTERNAL_ERROR',
        compilerOutput: 'The execution queue is currently unavailable.',
        completedAt: new Date(),
      },
    });
    throw error;
  }
  sendSuccess(res, { submission }, 202);
}

/**
 * Runs the current code against the challenge's visible example cases without
 * persisting anything. Hidden cases never leave the server boundary here.
 */
export async function runCode(req: Request, res: Response): Promise<void> {
  const userId = playerId(req, res);
  const slug = stringParam(req, res, 'slug');
  const body = submissionBody(req, res);
  if (!userId || !slug || !body) return;
  const challenge = await prisma.challenge.findFirst({
    where: { slug, isPublished: true },
    include: {
      testCases: {
        where: { isHidden: false },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, input: true, expectedOutput: true },
      },
    },
  });
  if (!challenge || !challenge.supportedLanguages.includes(body.language)) {
    sendError(res, 404, 'NOT_FOUND', 'Challenge or language not available');
    return;
  }
  let result;
  try {
    result = await executeWithRunner({
      language: body.language,
      sourceCode: body.sourceCode,
      timeLimitMs: challenge.timeLimitMs,
      memoryLimitMb: challenge.memoryLimitMb,
      testCases: challenge.testCases,
    });
  } catch (error) {
    sendError(
      res,
      502,
      'RUNNER_UNAVAILABLE',
      error instanceof JudgeServiceError
        ? error.message
        : 'The execution service is unavailable right now.',
    );
    return;
  }
  sendSuccess(res, { run: result });
}

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  const userId = playerId(req, res);
  const slug = stringParam(req, res, 'slug');
  if (!userId || !slug) return;
  const submissions = await prisma.submission.findMany({
    where: { userId, challenge: { slug } },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      language: true,
      status: true,
      score: true,
      executionTimeMs: true,
      memoryUsedKb: true,
      createdAt: true,
      completedAt: true,
    },
  });
  sendSuccess(res, { submissions });
}

/** Returns detailed results only to the submission owner; hidden case inputs are never exposed. */
export async function getSubmission(req: Request, res: Response): Promise<void> {
  const userId = playerId(req, res);
  const submissionId = stringParam(req, res, 'submissionId');
  if (!userId || !submissionId) return;
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, userId },
    include: { results: true },
  });
  if (!submission) {
    sendError(res, 404, 'NOT_FOUND', 'Submission not found');
    return;
  }
  const visibleCaseIds = new Set(
    (
      await prisma.challengeTestCase.findMany({
        where: { challengeId: submission.challengeId, isHidden: false },
        select: { id: true },
      })
    ).map((testCase) => testCase.id),
  );
  const results = submission.results.map((result) =>
    visibleCaseIds.has(result.testCaseId)
      ? { ...result, testCase: { isHidden: false } }
      : {
          passed: result.passed,
          executionTimeMs: result.executionTimeMs,
          memoryUsedKb: result.memoryUsedKb,
          testCase: { isHidden: true },
        },
  );
  sendSuccess(res, { submission: { ...submission, results } });
}

/** Lightweight polling endpoint. It deliberately omits code, logs and test-level detail. */
export async function getSubmissionStatus(req: Request, res: Response): Promise<void> {
  const userId = playerId(req, res);
  const submissionId = stringParam(req, res, 'submissionId');
  if (!userId || !submissionId) return;
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, userId },
    select: {
      id: true,
      status: true,
      score: true,
      executionTimeMs: true,
      memoryUsedKb: true,
      createdAt: true,
      completedAt: true,
    },
  });
  if (!submission) {
    sendError(res, 404, 'NOT_FOUND', 'Submission not found');
    return;
  }
  sendSuccess(res, { submission });
}
