import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import {
  assignActiveExperiments,
  createAssessment,
  createExperiment,
  deleteAssessment,
  exportAnonymizedEvents,
  getAnalytics,
  getAssessmentResults,
  listAllAssessments,
  listAssessments,
  listExperiments,
  submitAssessment,
  updateAssessment,
  updateExperiment,
} from './learning.service.js';
import type { z } from 'zod';
import { assessmentSchema, attemptSchema, experimentSchema } from './learning.schema.js';

function userId(req: Request, res: Response): string | undefined {
  const value = req.user?.sub;
  if (!value) sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
  return value;
}
function dateQuery(req: Request): { from: Date; to: Date } | null {
  const to = typeof req.query['to'] === 'string' ? new Date(req.query['to']) : new Date();
  const from =
    typeof req.query['from'] === 'string'
      ? new Date(req.query['from'])
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to
    ? null
    : { from, to };
}
function pathParam(req: Request, key: string): string {
  return typeof req.params[key] === 'string' ? req.params[key] : '';
}
function assessmentInput(value: z.infer<typeof assessmentSchema>): Prisma.AssessmentCreateInput {
  return {
    type: value.type,
    title: value.title,
    description: value.description,
    isPublished: value.isPublished ?? false,
    ...(value.worldId ? { world: { connect: { id: value.worldId } } } : {}),
    ...(value.levelId ? { level: { connect: { id: value.levelId } } } : {}),
    questions: {
      create: value.questions.map((item) => ({
        ...item,
        answer: item.answer as Prisma.InputJsonValue,
      })),
    },
  };
}

export async function listAssessmentsHandler(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  const worldId = typeof req.query['worldId'] === 'string' ? req.query['worldId'] : undefined;
  const type =
    req.query['type'] === 'PRE' || req.query['type'] === 'POST' ? req.query['type'] : undefined;
  sendSuccess(res, { assessments: await listAssessments(id, worldId, type) });
}
export async function submitAssessmentHandler(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  const input = attemptSchema.parse(req.body);
  const result = await submitAssessment(
    id,
    pathParam(req, 'assessmentId'),
    input.responses,
    input.timeTakenMs,
  );
  if (!result) {
    sendError(res, 404, 'NOT_FOUND', 'Assessment not found');
    return;
  }
  sendSuccess(res, { attempt: result }, 201);
}
export async function assessmentResultsHandler(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  sendSuccess(res, { results: await getAssessmentResults(id) });
}
export async function assignExperimentsHandler(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  await assignActiveExperiments(id);
  sendSuccess(res, { assigned: true });
}

export async function listAdminAssessmentsHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, { assessments: await listAllAssessments() });
}
export async function createAdminAssessmentHandler(req: Request, res: Response): Promise<void> {
  const input = assessmentSchema.parse(req.body);
  sendSuccess(res, { assessment: await createAssessment(assessmentInput(input)) }, 201);
}
export async function updateAdminAssessmentHandler(req: Request, res: Response): Promise<void> {
  const input = assessmentSchema.parse(req.body);
  const data = assessmentInput(input);
  const updated = await updateAssessment(pathParam(req, 'id'), {
    ...data,
    questions: { deleteMany: {}, create: data.questions?.create ?? [] },
  });
  sendSuccess(res, { assessment: updated });
}
export async function deleteAdminAssessmentHandler(req: Request, res: Response): Promise<void> {
  await deleteAssessment(pathParam(req, 'id'));
  sendSuccess(res, { deleted: true });
}
export async function listAdminExperimentsHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, { experiments: await listExperiments() });
}
export async function createAdminExperimentHandler(req: Request, res: Response): Promise<void> {
  const value = experimentSchema.parse(req.body);
  sendSuccess(
    res,
    { experiment: await createExperiment({ ...value, variants: value.variants }) },
    201,
  );
}
export async function updateAdminExperimentHandler(req: Request, res: Response): Promise<void> {
  const value = experimentSchema.partial().parse(req.body);
  sendSuccess(res, {
    experiment: await updateExperiment(pathParam(req, 'id'), {
      ...value,
      variants: value.variants,
    }),
  });
}
export async function getAnalyticsHandler(req: Request, res: Response): Promise<void> {
  const range = dateQuery(req);
  if (!range) {
    sendError(res, 422, 'VALIDATION_ERROR', 'Invalid date range');
    return;
  }
  sendSuccess(
    res,
    await getAnalytics({
      ...range,
      worldId: typeof req.query['worldId'] === 'string' ? req.query['worldId'] : undefined,
      experimentId:
        typeof req.query['experimentId'] === 'string' ? req.query['experimentId'] : undefined,
      variant: typeof req.query['variant'] === 'string' ? req.query['variant'] : undefined,
    }),
  );
}
export async function exportAnalyticsHandler(req: Request, res: Response): Promise<void> {
  const range = dateQuery(req);
  if (!range) {
    sendError(res, 422, 'VALIDATION_ERROR', 'Invalid date range');
    return;
  }
  const csv = await exportAnonymizedEvents({
    ...range,
    eventType: typeof req.query['eventType'] === 'string' ? req.query['eventType'] : undefined,
  });
  res
    .status(200)
    .type('text/csv')
    .setHeader('Content-Disposition', 'attachment; filename="learning-events.csv"')
    .send(csv);
}
