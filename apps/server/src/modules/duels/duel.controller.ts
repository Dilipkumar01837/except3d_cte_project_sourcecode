import type { Request, Response } from 'express';
import { ProgrammingLanguage } from '@prisma/client';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import {
  createDuel,
  createDuelSubmission,
  getDuel,
  joinDuel,
  listOpenDuels,
} from './duel.service.js';

function currentUser(req: Request, res: Response): string | undefined {
  const id = req.user?.sub;
  if (!id) sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
  return id;
}

function param(req: Request, res: Response, key: string): string | undefined {
  const value = req.params[key];
  if (typeof value !== 'string' || value.length === 0) {
    sendError(res, 400, 'VALIDATION_ERROR', `Missing ${key}`);
    return undefined;
  }
  return value;
}

export async function listDuels(req: Request, res: Response): Promise<void> {
  if (!currentUser(req, res)) return;
  sendSuccess(res, { duels: await listOpenDuels() });
}

export async function createDuelHandler(req: Request, res: Response): Promise<void> {
  const userId = currentUser(req, res);
  const body = req.body as { challengeId?: unknown };
  const challengeId = body.challengeId;
  if (!userId) return;
  if (typeof challengeId !== 'string' || challengeId.length === 0) {
    sendError(res, 400, 'VALIDATION_ERROR', 'challengeId is required');
    return;
  }
  const duel = await createDuel(userId, challengeId);
  if (!duel) {
    sendError(res, 404, 'NOT_FOUND', 'Published challenge not found');
    return;
  }
  sendSuccess(res, { duel }, 201);
}

export async function joinDuelHandler(req: Request, res: Response): Promise<void> {
  const userId = currentUser(req, res);
  const duelId = param(req, res, 'duelId');
  if (!userId || !duelId) return;
  const duel = await joinDuel(userId, duelId);
  if (!duel) {
    sendError(res, 409, 'DUEL_UNAVAILABLE', 'Duel is no longer open or cannot be joined');
    return;
  }
  sendSuccess(res, { duel });
}

export async function getDuelHandler(req: Request, res: Response): Promise<void> {
  const userId = currentUser(req, res);
  const duelId = param(req, res, 'duelId');
  if (!userId || !duelId) return;
  const duel = await getDuel(userId, duelId);
  if (!duel) {
    sendError(res, 404, 'NOT_FOUND', 'Duel not found');
    return;
  }
  sendSuccess(res, { duel });
}

export async function createDuelSubmissionHandler(req: Request, res: Response): Promise<void> {
  const userId = currentUser(req, res);
  const duelId = param(req, res, 'duelId');
  const body = req.body as { language?: unknown; sourceCode?: unknown };
  if (!userId || !duelId) return;
  if (
    typeof body.language !== 'string' ||
    !Object.values(ProgrammingLanguage).includes(body.language as ProgrammingLanguage) ||
    typeof body.sourceCode !== 'string' ||
    body.sourceCode.length === 0 ||
    body.sourceCode.length > 100_000
  ) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Language and sourceCode are required');
    return;
  }
  const submission = await createDuelSubmission(
    userId,
    duelId,
    body.language as ProgrammingLanguage,
    body.sourceCode,
  );
  if (!submission) {
    sendError(res, 409, 'DUEL_UNAVAILABLE', 'Duel is not active or you are not a participant');
    return;
  }
  sendSuccess(res, { submission }, 202);
}
