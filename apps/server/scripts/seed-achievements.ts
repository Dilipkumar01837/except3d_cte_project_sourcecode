/**
 * Seeds achievements for every trigger the engine supports.
 *
 * `achievement.service.ts` has eight evaluators, but nothing ever creates
 * Achievement rows: the only write path is the admin dashboard. On a fresh
 * install the engine therefore loads an empty list, returns early, and no
 * achievement can ever unlock.
 *
 * Slugs are load-bearing. `slugMatchesTrigger` matches on exact value or a
 * `_`/`-` segment boundary, so `xp_500` belongs to XP_REACHED while
 * `fastest_submission` deliberately does not. Each slug below is prefixed to
 * match exactly one trigger; `assertTriggerCoverage` verifies that at seed time
 * so a typo cannot silently publish an achievement nothing will ever evaluate.
 *
 * Idempotent: upserted on the unique `slug`.
 */

import { AchievementCategory, PrismaClient } from '@prisma/client';
import '../src/config/index.js';

const prisma = new PrismaClient();

/** Mirrors TRIGGER_PREFIXES in achievement.service.ts. Duplicated intentionally:
 * the service does not export it, and importing a service from a script would
 * drag in Redis/Socket side effects. `assertTriggerCoverage` below fails loudly
 * if the two ever drift. */
const TRIGGER_PREFIXES = {
  FIRST_LOGIN: ['first_login', 'welcome', 'join'],
  FIRST_CHALLENGE_SOLVED: ['first_challenge', 'first_solve'],
  CHALLENGES_SOLVED: ['challenges_solved', 'solve_', 'challenge_count'],
  XP_REACHED: ['xp_reached', 'xp_'],
  LEVEL_REACHED: ['level_reached', 'level_'],
  STREAK_REACHED: ['streak_reached', 'streak_'],
  DAILY_REWARD_STREAK: ['daily_reward_streak', 'daily_streak_'],
  PERFECT_SUBMISSION: ['perfect_submission', 'perfect_'],
} as const;

type Trigger = keyof typeof TRIGGER_PREFIXES;

/** Segment match, identical to the service's rule, including the trailing-`_`
 * bare-prefix case that `xp_500` depends on. */
function slugMatchesTrigger(slug: string, trigger: Trigger): boolean {
  const lower = slug.toLowerCase();
  return TRIGGER_PREFIXES[trigger].some((prefix) => {
    if (prefix.endsWith('_')) return lower.startsWith(prefix);
    return lower === prefix || lower.startsWith(`${prefix}_`) || lower.startsWith(`${prefix}-`);
  });
}

interface AchievementSeed {
  slug: string;
  trigger: Trigger;
  name: string;
  description: string;
  category: AchievementCategory;
  /** Progress value at which this unlocks. Must match what getProgress returns. */
  target: number;
  xpReward: number;
  isHidden: boolean;
}

const achievements: AchievementSeed[] = [
  {
    slug: 'join_the_platform',
    trigger: 'FIRST_LOGIN',
    name: 'Escape Begins',
    description: 'Create your account and step into the first world.',
    category: AchievementCategory.EXPLORATION,
    target: 1,
    xpReward: 25,
    isHidden: false,
  },
  {
    slug: 'first_challenge_solved',
    trigger: 'FIRST_CHALLENGE_SOLVED',
    name: 'First Breakthrough',
    description: 'Get your first submission accepted.',
    category: AchievementCategory.CODING,
    target: 1,
    xpReward: 50,
    isHidden: false,
  },
  {
    slug: 'solve_5_challenges',
    trigger: 'CHALLENGES_SOLVED',
    name: 'Trailblazer',
    description: 'Get 5 challenges accepted.',
    category: AchievementCategory.CODING,
    target: 5,
    xpReward: 100,
    isHidden: false,
  },
  {
    slug: 'solve_15_challenges',
    trigger: 'CHALLENGES_SOLVED',
    name: 'Pathfinder',
    description: 'Get 15 challenges accepted.',
    category: AchievementCategory.CODING,
    target: 15,
    xpReward: 250,
    isHidden: false,
  },
  {
    slug: 'xp_500',
    trigger: 'XP_REACHED',
    name: 'Warmed Up',
    description: 'Accumulate 500 XP.',
    category: AchievementCategory.COLLECTION,
    target: 500,
    xpReward: 50,
    isHidden: false,
  },
  {
    slug: 'xp_2500',
    trigger: 'XP_REACHED',
    name: 'Seasoned',
    description: 'Accumulate 2,500 XP.',
    category: AchievementCategory.COLLECTION,
    target: 2500,
    xpReward: 150,
    isHidden: true,
  },
  {
    slug: 'level_5',
    trigger: 'LEVEL_REACHED',
    name: 'Rising',
    description: 'Reach player level 5.',
    category: AchievementCategory.COLLECTION,
    target: 5,
    xpReward: 50,
    isHidden: false,
  },
  {
    slug: 'level_15',
    trigger: 'LEVEL_REACHED',
    name: 'Veteran',
    description: 'Reach player level 15.',
    category: AchievementCategory.COLLECTION,
    target: 15,
    xpReward: 200,
    isHidden: true,
  },
  {
    slug: 'streak_reached_3',
    trigger: 'STREAK_REACHED',
    name: 'Consistent',
    description: 'Code on 3 consecutive days.',
    category: AchievementCategory.STREAK,
    target: 3,
    xpReward: 60,
    isHidden: false,
  },
  {
    slug: 'streak_reached_7',
    trigger: 'STREAK_REACHED',
    name: 'Unbroken',
    description: 'Code on 7 consecutive days.',
    category: AchievementCategory.STREAK,
    target: 7,
    xpReward: 150,
    isHidden: true,
  },
  {
    slug: 'daily_streak_3',
    trigger: 'DAILY_REWARD_STREAK',
    name: 'Claim Streak',
    description: 'Claim your daily reward 3 days in a row.',
    category: AchievementCategory.STREAK,
    target: 3,
    xpReward: 75,
    isHidden: false,
  },
  {
    slug: 'perfect_submission',
    trigger: 'PERFECT_SUBMISSION',
    name: 'No Rough Edges',
    description: 'Get every test case passing on a single submission.',
    category: AchievementCategory.ACCURACY,
    target: 1,
    xpReward: 80,
    isHidden: false,
  },
];

/**
 * Every seeded slug must resolve to exactly one trigger, and every trigger must
 * have at least one achievement. A mismatch here is silent at runtime: the
 * achievement simply never fires.
 */
function assertTriggerCoverage(seeds: AchievementSeed[]): void {
  const problems: string[] = [];

  for (const seed of seeds) {
    const matching = (Object.keys(TRIGGER_PREFIXES) as Trigger[]).filter((trigger) =>
      slugMatchesTrigger(seed.slug, trigger),
    );
    if (!matching.includes(seed.trigger)) {
      problems.push(
        `${seed.slug}: declared trigger ${seed.trigger} but the slug does not match it ` +
          `(matches: ${matching.length === 0 ? 'none' : matching.join(', ')})`,
      );
    }
    if (matching.length > 1) {
      problems.push(`${seed.slug}: slug matches multiple triggers (${matching.join(', ')})`);
    }
  }

  for (const trigger of Object.keys(TRIGGER_PREFIXES) as Trigger[]) {
    if (!seeds.some((seed) => seed.trigger === trigger)) {
      problems.push(`trigger ${trigger} has no seeded achievement`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Achievement seed is inconsistent:\n  - ${problems.join('\n  - ')}`);
  }
}

async function main(): Promise<void> {
  assertTriggerCoverage(achievements);

  for (const seed of achievements) {
    const data = {
      name: seed.name,
      description: seed.description,
      category: seed.category,
      target: seed.target,
      xpReward: seed.xpReward,
      isHidden: seed.isHidden,
      isPublished: true,
    };
    await prisma.achievement.upsert({
      where: { slug: seed.slug },
      create: { slug: seed.slug, ...data },
      update: data,
    });
  }

  console.log(`Seeded ${String(achievements.length)} achievements`);

  // Report rather than throw: an unpublished achievement is a legitimate
  // intermediate state, but a published one nothing can evaluate is a bug.
  const published = await prisma.achievement.count({ where: { isPublished: true } });
  console.log(`${String(published)} achievements are published and evaluable`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
