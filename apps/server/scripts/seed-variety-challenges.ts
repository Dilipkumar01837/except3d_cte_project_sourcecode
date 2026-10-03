/**
 * Seeds the supplementary challenge set that exercises the challenge types and
 * difficulties the beginner set never uses (DATA_STRUCTURES, DEBUGGING,
 * OUTPUT_PREDICTION, FILL_IN_THE_BLANK, CODE_COMPLETION and MEDIUM/HARD).
 *
 * Python-only by design: this content exists to make every declared enum value
 * reachable and renderable, not to duplicate the seven-language beginner set.
 *
 * Idempotent: keyed on `Challenge.slug`; re-running replaces test cases, hints
 * and the reference solution so edits to `problems/variety.ts` take effect.
 */

import {
  ChallengeDifficulty,
  ChallengeType,
  PrismaClient,
  ProgrammingLanguage,
} from '@prisma/client';
import '../src/config/index.js';
import { varietyChallenges, type VarietyChallenge } from './problems/variety.js';

const prisma = new PrismaClient();

function testCaseRows(challenge: VarietyChallenge) {
  return challenge.testCases.map((testCase, index) => ({
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    isHidden: testCase.isHidden,
    sortOrder: index,
    ...(testCase.explanation ? { explanation: testCase.explanation } : {}),
  }));
}

function hintRows(challenge: VarietyChallenge) {
  return challenge.hints.map((content, index) => ({
    level: index + 1,
    content,
    xpPenalty: 0,
  }));
}

async function seedChallenge(challenge: VarietyChallenge): Promise<void> {
  const existing = await prisma.challenge.findUnique({
    where: { slug: challenge.slug },
    select: { id: true },
  });

  if (existing) {
    // Test cases and hints have no natural unique key, so replace rather than
    // diff; the reference solution is upserted on (challengeId, language).
    await prisma.challengeTestCase.deleteMany({ where: { challengeId: existing.id } });
    await prisma.challengeHint.deleteMany({ where: { challengeId: existing.id } });
    await prisma.challenge.update({
      where: { slug: challenge.slug },
      data: {
        title: challenge.title,
        statement: challenge.statement,
        constraints: challenge.constraints,
        starterCode: { [ProgrammingLanguage.PYTHON]: challenge.starterCode },
        difficulty: challenge.difficulty,
        type: challenge.type,
        tags: challenge.tags,
        supportedLanguages: [ProgrammingLanguage.PYTHON],
        xpReward: challenge.xpReward,
        timeLimitMs: challenge.timeLimitMs,
        memoryLimitMb: challenge.memoryLimitMb,
        isPublished: true,
        testCases: { create: testCaseRows(challenge) },
        hints: { create: hintRows(challenge) },
        solutions: {
          upsert: {
            where: {
              challengeId_language: {
                challengeId: existing.id,
                language: ProgrammingLanguage.PYTHON,
              },
            },
            update: { code: challenge.solution },
            create: {
              language: ProgrammingLanguage.PYTHON,
              code: challenge.solution,
              explanation: 'Reference solution is stored for admin review and judging support.',
            },
          },
        },
      },
    });
    console.log(`Updated ${challenge.slug}`);
    return;
  }

  await prisma.challenge.create({
    data: {
      slug: challenge.slug,
      title: challenge.title,
      statement: challenge.statement,
      constraints: challenge.constraints,
      starterCode: { [ProgrammingLanguage.PYTHON]: challenge.starterCode },
      difficulty: challenge.difficulty,
      type: challenge.type,
      tags: challenge.tags,
      supportedLanguages: [ProgrammingLanguage.PYTHON],
      xpReward: challenge.xpReward,
      timeLimitMs: challenge.timeLimitMs,
      memoryLimitMb: challenge.memoryLimitMb,
      isPublished: true,
      testCases: { create: testCaseRows(challenge) },
      hints: { create: hintRows(challenge) },
      solutions: {
        create: {
          language: ProgrammingLanguage.PYTHON,
          code: challenge.solution,
          explanation: 'Reference solution is stored for admin review and judging support.',
        },
      },
    },
  });
  console.log(`Created ${challenge.slug}`);
}

async function validateSeed(): Promise<void> {
  const slugs = varietyChallenges.map((challenge) => challenge.slug);
  const rows = await prisma.challenge.findMany({
    where: { slug: { in: slugs } },
    include: { testCases: true, hints: true, solutions: true },
  });
  if (rows.length !== varietyChallenges.length) {
    throw new Error(
      `Expected ${String(varietyChallenges.length)} variety challenges, found ${String(rows.length)}`,
    );
  }

  for (const challenge of varietyChallenges) {
    const row = rows.find((item) => item.slug === challenge.slug);
    if (!row) throw new Error(`Missing seeded challenge ${challenge.slug}`);
    const visible = row.testCases.filter((testCase) => !testCase.isHidden).length;
    const hidden = row.testCases.filter((testCase) => testCase.isHidden).length;
    if (
      row.difficulty !== challenge.difficulty ||
      row.type !== challenge.type ||
      !row.isPublished ||
      visible < 1 ||
      hidden < 1 ||
      row.hints.length < 1 ||
      row.solutions.length !== 1
    ) {
      throw new Error(`Invalid variety challenge data for ${challenge.slug}`);
    }
  }

  // DoD for 5.2: no declared enum value is dead. Check across every published
  // challenge, since the beginner set supplies ALGORITHMS/EASY.
  const published = await prisma.challenge.findMany({
    where: { isPublished: true },
    select: { type: true, difficulty: true },
  });
  for (const type of Object.values(ChallengeType)) {
    if (!published.some((challenge) => challenge.type === type)) {
      throw new Error(`No published challenge uses ChallengeType.${type}`);
    }
  }
  for (const difficulty of Object.values(ChallengeDifficulty)) {
    if (!published.some((challenge) => challenge.difficulty === difficulty)) {
      throw new Error(`No published challenge uses ChallengeDifficulty.${difficulty}`);
    }
  }
  console.log(
    `Validated ${String(varietyChallenges.length)} variety challenges; every challenge type and difficulty is represented.`,
  );
}

try {
  for (const challenge of varietyChallenges) {
    await seedChallenge(challenge);
  }
  await validateSeed();
} finally {
  await prisma.$disconnect();
}
