import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['PLAYER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']),
});

export const suspendUserSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const createChallengeSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(3).max(200),
  statement: z.string().min(10),
  constraints: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  type: z.enum([
    'ALGORITHMS',
    'DATA_STRUCTURES',
    'DEBUGGING',
    'OUTPUT_PREDICTION',
    'FILL_IN_THE_BLANK',
    'CODE_COMPLETION',
  ]),
  tags: z.array(z.string()).default([]),
  supportedLanguages: z
    .array(z.enum(['PYTHON', 'JAVA', 'JAVASCRIPT', 'TYPESCRIPT', 'CPP', 'GO', 'RUST']))
    .min(1),
  xpReward: z.number().int().min(1).max(10000).default(100),
  timeLimitMs: z.number().int().min(500).max(30000).default(2000),
  memoryLimitMb: z.number().int().min(16).max(512).default(128),
  starterCode: z.record(z.string(), z.string()).default({}),
});

export const updateChallengeSchema = createChallengeSchema.partial();

export const createTestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  explanation: z.string().optional(),
  isHidden: z.boolean().default(false),
  weight: z.number().int().min(1).default(1),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateTestCaseSchema = createTestCaseSchema.partial();

export const createHintSchema = z.object({
  level: z.number().int().min(1),
  content: z.string().min(1),
  xpPenalty: z.number().int().min(0).default(0),
});

export const updateHintSchema = createHintSchema.partial();

export const createWorldSchema = z.object({
  slug: z.string().min(2).max(100),
  name: z.string().min(2).max(200),
  description: z.string().min(5),
  difficulty: z.number().int().min(1).max(10).default(1),
  requiredXp: z.number().int().min(0).default(0),
  estimatedMinutes: z.number().int().min(1).default(30),
  sortOrder: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
});

export const updateWorldSchema = createWorldSchema.partial();

export const createLevelSchema = z.object({
  number: z.number().int().min(1),
  title: z.string().min(2).max(200),
  description: z.string().min(5),
  difficulty: z.number().int().min(1).max(10).default(1),
  xpReward: z.number().int().min(0).default(50),
  previewUrl: z.string().url().optional(),
  challengeId: z.string().uuid().optional().nullable(),
});

export const updateLevelSchema = createLevelSchema.partial();

export const createAchievementSchema = z.object({
  slug: z.string().min(2).max(100),
  name: z.string().min(2).max(200),
  description: z.string().min(5),
  category: z.enum(['CODING', 'EXPLORATION', 'SPEED', 'ACCURACY', 'STREAK', 'COLLECTION']),
  target: z.number().int().min(1).default(1),
  xpReward: z.number().int().min(0).default(0),
  isHidden: z.boolean().default(false),
});

export const updateAchievementSchema = createAchievementSchema.partial();

export type PaginationInput = z.infer<typeof paginationSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
export type CreateHintInput = z.infer<typeof createHintSchema>;
export type UpdateHintInput = z.infer<typeof updateHintSchema>;
export type CreateWorldInput = z.infer<typeof createWorldSchema>;
export type UpdateWorldInput = z.infer<typeof updateWorldSchema>;
export type CreateLevelInput = z.infer<typeof createLevelSchema>;
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;
export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;
