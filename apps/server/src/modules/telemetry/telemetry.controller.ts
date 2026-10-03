import type { Request, Response } from 'express';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import { getConsent, recordEvents, setConsent, summarize } from './telemetry.service.js';
import type { RecordEventsInput, SetConsentInput } from './telemetry.schema.js';

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getConsentHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    return;
  }
  sendSuccess(res, await getConsent(userId));
}

export async function setConsentHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    return;
  }
  const { optIn } = req.body as SetConsentInput;
  sendSuccess(res, await setConsent(userId, optIn));
}

export async function recordEventsHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    return;
  }
  // The response is identical whether or not the account has opted in, so it
  // never discloses the player's consent state.
  await recordEvents(userId, req.body as RecordEventsInput);
  sendSuccess(res, { accepted: true }, 202);
}

export async function getTelemetrySummaryHandler(req: Request, res: Response): Promise<void> {
  const to = parseDate(req.query['to']) ?? new Date();
  const from = parseDate(req.query['from']) ?? new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (from.getTime() > to.getTime()) {
    sendError(res, 422, 'VALIDATION_ERROR', 'from must be before to');
    return;
  }
  sendSuccess(res, await summarize(from, to));
}
