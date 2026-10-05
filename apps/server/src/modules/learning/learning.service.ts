import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';
import { recordEvents } from '../telemetry/telemetry.service.js';

const publicQuestion = {
  id: true,
  kind: true,
  prompt: true,
  options: true,
  points: true,
  objective: true,
  sortOrder: true,
} as const;

function sameAnswer(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function listAssessments(userId: string, worldId?: string, type?: 'PRE' | 'POST') {
  await assignActiveExperiments(userId);
  return prisma.assessment.findMany({
    where: { isPublished: true, ...(worldId ? { worldId } : {}), ...(type ? { type } : {}) },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      worldId: true,
      levelId: true,
      type: true,
      title: true,
      description: true,
      questions: { orderBy: { sortOrder: 'asc' }, select: publicQuestion },
      attempts: {
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          score: true,
          maxScore: true,
          timeTakenMs: true,
          attemptNumber: true,
          completedAt: true,
        },
      },
    },
  });
}

export async function submitAssessment(
  userId: string,
  assessmentId: string,
  responses: Record<string, unknown>,
  timeTakenMs: number,
) {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, isPublished: true },
    select: {
      id: true,
      type: true,
      questions: { select: { id: true, answer: true, points: true } },
    },
  });
  if (!assessment) return null;
  const score = assessment.questions.reduce(
    (total, question) =>
      sameAnswer(responses[question.id], question.answer) ? total + question.points : total,
    0,
  );
  const maxScore = assessment.questions.reduce((total, question) => total + question.points, 0);
  const previous = await prisma.assessmentAttempt.count({ where: { assessmentId, userId } });
  const attempt = await prisma.assessmentAttempt.create({
    data: {
      assessmentId,
      userId,
      score,
      maxScore,
      timeTakenMs,
      attemptNumber: previous + 1,
      responses: responses as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      assessmentId: true,
      score: true,
      maxScore: true,
      timeTakenMs: true,
      attemptNumber: true,
      completedAt: true,
    },
  });
  await recordEvents(userId, {
    events: [
      {
        name: 'assessment_score',
        payload: { assessmentId, score, maxScore, type: assessment.type },
      },
    ],
  });
  return attempt;
}

export async function getAssessmentResults(userId: string) {
  return prisma.assessmentAttempt.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      assessmentId: true,
      score: true,
      maxScore: true,
      timeTakenMs: true,
      attemptNumber: true,
      completedAt: true,
      assessment: { select: { title: true, type: true, worldId: true, levelId: true } },
    },
  });
}

export async function assignActiveExperiments(userId: string): Promise<void> {
  const experiments = await prisma.experiment.findMany({
    where: { isActive: true },
    select: { id: true, variants: true },
  });
  for (const experiment of experiments) {
    const variants = Array.isArray(experiment.variants)
      ? experiment.variants.filter((item): item is string => typeof item === 'string')
      : [];
    if (variants.length === 0) continue;
    const existing = await prisma.experimentAssignment.findUnique({
      where: { experimentId_userId: { experimentId: experiment.id, userId } },
    });
    if (existing) continue;
    const variant = variants[crypto.randomInt(variants.length)];
    if (!variant) continue;
    await prisma.experimentAssignment
      .create({ data: { experimentId: experiment.id, userId, variant } })
      .catch(() => undefined);
  }
}

export async function createAssessment(data: Prisma.AssessmentCreateInput) {
  return prisma.assessment.create({
    data,
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function updateAssessment(id: string, data: Prisma.AssessmentUpdateInput) {
  return prisma.assessment.update({
    where: { id },
    data,
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function deleteAssessment(id: string): Promise<void> {
  await prisma.assessment.delete({ where: { id } });
}

export async function listAllAssessments() {
  return prisma.assessment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      world: { select: { name: true } },
      level: { select: { title: true } },
    },
  });
}

export async function createExperiment(data: Prisma.ExperimentCreateInput) {
  return prisma.experiment.create({ data });
}

export async function listExperiments() {
  return prisma.experiment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { assignments: true } } },
  });
}

export async function updateExperiment(id: string, data: Prisma.ExperimentUpdateInput) {
  return prisma.experiment.update({ where: { id }, data });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted[middle - 1];
  const upper = sorted[middle];
  if (sorted.length % 2 === 0 && lower !== undefined && upper !== undefined)
    return (lower + upper) / 2;
  return upper ?? 0;
}

export async function getAnalytics(filters: {
  from: Date;
  to: Date;
  worldId?: string;
  experimentId?: string;
  variant?: string;
}) {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      completedAt: { gte: filters.from, lte: filters.to },
      ...(filters.worldId ? { assessment: { worldId: filters.worldId } } : {}),
      ...(filters.experimentId || filters.variant
        ? {
            user: {
              experimentAssignments: {
                some: {
                  ...(filters.experimentId ? { experimentId: filters.experimentId } : {}),
                  ...(filters.variant ? { variant: filters.variant } : {}),
                },
              },
            },
          }
        : {}),
    },
    select: {
      userId: true,
      score: true,
      maxScore: true,
      timeTakenMs: true,
      assessment: { select: { worldId: true, type: true, world: { select: { name: true } } } },
    },
  });
  const groups = new Map<
    string,
    {
      worldId: string;
      worldName: string;
      pre: Map<string, number>;
      post: Map<string, number>;
      times: number[];
    }
  >();
  for (const attempt of attempts) {
    const worldId = attempt.assessment.worldId ?? 'unscoped';
    const group = groups.get(worldId) ?? {
      worldId,
      worldName: attempt.assessment.world?.name ?? 'Unscoped',
      pre: new Map<string, number>(),
      post: new Map<string, number>(),
      times: [] as number[],
    };
    (attempt.assessment.type === 'PRE' ? group.pre : group.post).set(
      attempt.userId,
      (attempt.score / Math.max(1, attempt.maxScore)) * 100,
    );
    group.times.push(attempt.timeTakenMs);
    groups.set(worldId, group);
  }
  const worlds = [...groups.values()].map((group) => {
    const improvements = [...group.post.entries()].flatMap(([userId, post]) => {
      const pre = group.pre.get(userId);
      return pre === undefined ? [] : [post - pre];
    });
    return {
      worldId: group.worldId,
      worldName: group.worldName,
      pairedUsers: improvements.length,
      averageImprovement: improvements.length
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0,
      medianImprovement: median(improvements),
      averageAssessmentTimeMs: group.times.length
        ? group.times.reduce((a, b) => a + b, 0) / group.times.length
        : 0,
    };
  });
  const assignments = filters.experimentId
    ? await prisma.experimentAssignment.groupBy({
        by: ['variant'],
        where: { experimentId: filters.experimentId },
        _count: { _all: true },
      })
    : [];
  return {
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    worlds,
    experimentVariants: assignments.map((item) => ({
      variant: item.variant,
      users: item._count._all,
    })),
  };
}

export async function exportAnonymizedEvents(filters: {
  from: Date;
  to: Date;
  eventType?: string;
}): Promise<string> {
  const events = await prisma.userEvent.findMany({
    where: {
      createdAt: { gte: filters.from, lte: filters.to },
      ...(filters.eventType ? { eventType: filters.eventType } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: { userId: true, eventType: true, metadata: true, createdAt: true },
  });
  const secret = process.env['ANALYTICS_EXPORT_SALT'] ?? 'code-to-escape-research-export';
  const rows = [['anonymous_user_id', 'event_type', 'metadata', 'timestamp']];
  for (const event of events)
    rows.push([
      crypto.createHash('sha256').update(`${secret}:${event.userId}`).digest('hex').slice(0, 16),
      event.eventType,
      JSON.stringify(event.metadata ?? {}),
      event.createdAt.toISOString(),
    ]);
  return rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\n');
}
