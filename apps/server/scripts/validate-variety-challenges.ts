/**
 * Verifies seed 5.2 content in the database without writing anything.
 *
 * Checks that every declared `ChallengeType` and `ChallengeDifficulty` has at
 * least one published challenge, and that each variety seed has the structural
 * pieces the client needs (visible + hidden tests, a hint, a reference solution).
 *
 * Run against a live code runner with `pnpm validate:variety` to additionally
 * execute each reference solution, or `pnpm validate:variety:static` to check
 * the database only.
 */

import {
  ChallengeDifficulty,
  ChallengeType,
  PrismaClient,
  ProgrammingLanguage,
} from '@prisma/client';
import '../src/config/index.js';
import { executeWithRunner } from '../src/modules/challenges/judge-execution.js';
import { varietyChallenges } from './problems/variety.js';

const prisma = new PrismaClient();
const REQUIRE_RUNNER = process.env['REQUIRE_SANDBOX'] === '1' || !process.argv.includes('--static');

async function main(): Promise<void> {
  const published = await prisma.challenge.findMany({
    where: { isPublished: true },
    select: { slug: true, type: true, difficulty: true },
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

  const slugs = varietyChallenges.map((challenge) => challenge.slug);
  const rows = await prisma.challenge.findMany({
    where: { slug: { in: slugs } },
    include: {
      testCases: { orderBy: { sortOrder: 'asc' } },
      hints: true,
      solutions: true,
    },
  });
  for (const seed of varietyChallenges) {
    const row = rows.find((item) => item.slug === seed.slug);
    if (!row) throw new Error(`Missing seeded challenge ${seed.slug}`);
    const visible = row.testCases.filter((testCase) => !testCase.isHidden).length;
    const hidden = row.testCases.filter((testCase) => testCase.isHidden).length;
    if (
      row.type !== seed.type ||
      row.difficulty !== seed.difficulty ||
      visible < 1 ||
      hidden < 1 ||
      row.hints.length < 1 ||
      !row.solutions.some((solution) => solution.language === ProgrammingLanguage.PYTHON)
    ) {
      throw new Error(`Invalid variety challenge data for ${seed.slug}`);
    }
  }
  console.log('Variety challenge shapes are valid and every enum value is represented.');

  if (!REQUIRE_RUNNER) {
    console.log('Skipping live judging check (static mode).');
    return;
  }

  for (const seed of varietyChallenges) {
    const row = rows.find((item) => item.slug === seed.slug);
    const solution = row?.solutions.find((item) => item.language === ProgrammingLanguage.PYTHON);
    if (!row || !solution) throw new Error(`Missing Python solution for ${seed.slug}`);
    const result = await executeWithRunner({
      language: ProgrammingLanguage.PYTHON,
      sourceCode: solution.code,
      timeLimitMs: seed.timeLimitMs,
      memoryLimitMb: seed.memoryLimitMb,
      testCases: row.testCases.map(({ id, input, expectedOutput }) => ({
        id,
        input,
        expectedOutput,
      })),
    });
    if (result.status !== 'ACCEPTED') {
      throw new Error(
        `${seed.slug}: expected ACCEPTED, got ${result.status}: ${
          result.compilerOutput ?? result.runtimeOutput ?? ''
        }`,
      );
    }
    console.log(`Validated ${seed.slug} through the code runner: ACCEPTED`);
  }
  console.log('Validated every variety reference solution through the code runner.');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
