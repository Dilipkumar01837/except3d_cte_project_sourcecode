import { z } from 'zod';

const question = z.object({
  kind: z.enum(['MULTIPLE_CHOICE', 'CODE', 'DEBUG']),
  prompt: z.string().min(1).max(10_000),
  options: z.array(z.string().max(1_000)).max(20).optional(),
  answer: z.unknown(),
  points: z.number().int().min(1).max(100),
  objective: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(10_000),
});

export const assessmentSchema = z.object({
  worldId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  type: z.enum(['PRE', 'POST']),
  title: z.string().min(1).max(200),
  description: z.string().max(2_000).optional(),
  isPublished: z.boolean().optional(),
  questions: z.array(question).min(1).max(100),
});
export const attemptSchema = z.object({
  responses: z.record(z.unknown()),
  timeTakenMs: z.number().int().min(0).max(86_400_000),
});
export const experimentSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9_-]+$/)
    .min(2)
    .max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(2_000).optional(),
  variants: z.array(z.string().min(1).max(100)).min(2).max(10),
  isActive: z.boolean().optional(),
});
