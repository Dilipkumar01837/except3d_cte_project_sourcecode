import type { Request, Response } from 'express';
import { ProgrammingLanguage, type HintType } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import { env } from '../../config/index.js';
import { getHintQuota } from '../challenges/hint-quota.js';
import { generateAdaptiveHint, type AdaptiveHintType } from '../challenges/ai-hint.service.js';

const hintTypes = ['CONCEPTUAL', 'DIRECTIONAL', 'SPECIFIC', 'EXAMPLE', 'DEBUGGING'] as const;

function userId(req: Request, res: Response): string | undefined {
  const id = req.user?.sub;
  if (!id) sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
  return id;
}

export async function requestHint(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  const body = req.body as {
    challengeId?: unknown;
    language?: unknown;
    sourceCode?: unknown;
    hintType?: unknown;
  };
  if (!id) return;
  if (
    typeof body.challengeId !== 'string' ||
    typeof body.language !== 'string' ||
    typeof body.sourceCode !== 'string' ||
    body.sourceCode.length === 0 ||
    body.sourceCode.length > 100_000 ||
    !Object.values(ProgrammingLanguage).includes(body.language as ProgrammingLanguage) ||
    (body.hintType !== undefined &&
      !hintTypes.includes(body.hintType as (typeof hintTypes)[number]))
  ) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid adaptive hint request');
    return;
  }
  const challenge = await prisma.challenge.findFirst({
    where: { id: body.challengeId, isPublished: true },
    select: {
      id: true,
      title: true,
      statement: true,
      difficulty: true,
      testCases: { select: { input: true, expectedOutput: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!challenge) {
    sendError(res, 404, 'NOT_FOUND', 'Challenge not found');
    return;
  }
  const quota = await getHintQuota(id, {
    windowMs: env.aiHintWindowMs,
    limit: env.aiHintDailyLimit,
  });
  if (quota.remaining <= 0) {
    sendError(res, 429, 'HINT_QUOTA_EXCEEDED', 'Adaptive hint quota exceeded');
    return;
  }
  const profile = await prisma.userLearningProfile.findUnique({
    where: { userId: id },
    select: { personalizedHintsOptOut: true },
  });
  const adaptive = await generateAdaptiveHint({
    userId: id,
    challenge,
    language: body.language,
    sourceCode: body.sourceCode,
    personalized: profile?.personalizedHintsOptOut !== true,
    requestedType: body.hintType as AdaptiveHintType | undefined,
  });
  const record = await prisma.hintHistory.create({
    data: {
      userId: id,
      challengeId: challenge.id,
      language: body.language as ProgrammingLanguage,
      hintType: adaptive.hintType as HintType,
      hintText: adaptive.hint,
      contextSnapshot: JSON.parse(JSON.stringify(adaptive.contextSnapshot)) as object,
      attemptsBefore: adaptive.attemptsBefore,
    },
    select: { id: true },
  });
  await prisma.aiHintHistory.create({
    data: {
      userId: id,
      challengeId: challenge.id,
      language: body.language as ProgrammingLanguage,
      hint: adaptive.hint,
    },
  });
  sendSuccess(res, {
    hint: adaptive.hint,
    hintId: record.id,
    hintType: adaptive.hintType,
    personalized: adaptive.personalized,
    quota: { ...quota, used: quota.used + 1, remaining: quota.remaining - 1 },
  });
}

export async function rateHint(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  const hintId = req.params['id'];
  const helpful = (req.body as { helpful?: unknown }).helpful;
  if (!id || typeof hintId !== 'string' || typeof helpful !== 'boolean') {
    sendError(res, 400, 'VALIDATION_ERROR', 'helpful must be a boolean');
    return;
  }
  const result = await prisma.hintHistory.updateMany({
    where: { id: hintId, userId: id },
    data: { helpfulRating: helpful },
  });
  if (result.count === 0) {
    sendError(res, 404, 'NOT_FOUND', 'Hint not found');
    return;
  }
  sendSuccess(res, { hintId, helpful });
}

export async function getHintHistory(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  const history = await prisma.hintHistory.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      challengeId: true,
      hintType: true,
      hintText: true,
      helpfulRating: true,
      solvedAfter: true,
      createdAt: true,
    },
  });
  sendSuccess(res, { history });
}

export async function getHintPreferences(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  const profile = await prisma.userLearningProfile.upsert({
    where: { userId: id },
    create: { userId: id },
    update: {},
    select: { personalizedHintsOptOut: true },
  });
  sendSuccess(res, { personalizedHintsOptOut: profile.personalizedHintsOptOut });
}

export async function updateHintPreferences(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  const value = (req.body as { personalizedHintsOptOut?: unknown }).personalizedHintsOptOut;
  if (!id || typeof value !== 'boolean') {
    sendError(res, 400, 'VALIDATION_ERROR', 'personalizedHintsOptOut must be a boolean');
    return;
  }
  await prisma.userLearningProfile.upsert({
    where: { userId: id },
    create: { userId: id, personalizedHintsOptOut: value },
    update: { personalizedHintsOptOut: value },
  });
  sendSuccess(res, { personalizedHintsOptOut: value });
}
