/**
 * Seeds the world map and the levels that players traverse.
 *
 * Nothing else creates GameWorld or GameLevel rows: the admin dashboard can, but a
 * fresh database therefore has no published worlds and the client renders
 * "No published worlds are available yet". This script makes a new install
 * immediately playable.
 *
 * Idempotent: re-running updates in place instead of duplicating, keyed on the
 * stable `slug` / `@@unique([worldId, number])`.
 *
 * Levels bind to seeded challenges by slug. A level whose challenge has not been
 * seeded yet is still created, just unbound, so seeding worlds before challenges
 * does not fail - it just leaves a placeholder to fill later.
 */

import { PrismaClient } from '@prisma/client';
import '../src/config/index.js';

const prisma = new PrismaClient();

interface LevelSeed {
  /** Stable within a world; matches GameLevel.number. */
  number: number;
  title: string;
  description: string;
  difficulty: number;
  xpReward: number;
  /** Slug of an existing Challenge to bind, or null for an unbound placeholder. */
  challengeSlug: string | null;
}

interface KeySeed {
  slug: string;
  title: string;
  description: string;
  artKey: string;
  /** Level number in this world that awards the key when completed. */
  grantedByLevelNumber: number;
}

interface LockSeed {
  /** Level number this lock guards. */
  levelNumber: number;
  title: string;
  prompt: string;
  /** Slug of the key in this world that opens it. */
  requiresKeySlug: string;
}

interface WorldSeed {
  slug: string;
  name: string;
  description: string;
  difficulty: number;
  requiredXp: number;
  estimatedMinutes: number;
  keys: KeySeed[];
  locks: LockSeed[];
  levels: LevelSeed[];
}

const worlds: WorldSeed[] = [
  {
    slug: 'python-forest',
    name: 'Python Forest',
    description:
      'The trail everyone walks first. Three short clearings that teach input, output, and simple decisions in Python.',
    difficulty: 1,
    requiredXp: 0,
    estimatedMinutes: 10,
    // Clearing the first trail yields a key, which opens a shortcut to the high
    // ridge. A player who wants to can skip the middle clearing entirely.
    keys: [
      {
        slug: 'python-forest-trail-key',
        title: 'Trail Key',
        description: 'Brass, worn smooth. Left by whoever walked this trail before you.',
        artKey: 'key-brass',
        grantedByLevelNumber: 1,
      },
    ],
    locks: [
      {
        levelNumber: 3,
        title: 'Ridge Gate',
        prompt: 'A chained gate. The chain is padlocked, and the lock looks old.',
        requiresKeySlug: 'python-forest-trail-key',
      },
    ],
    levels: [
      {
        number: 1,
        title: 'First Clearing',
        description: 'Read two integers and print their sum.',
        difficulty: 1,
        xpReward: 50,
        challengeSlug: 'python-sum-two-numbers',
      },
      {
        number: 2,
        title: 'Split Path',
        description: 'Decide whether a number is even or odd.',
        difficulty: 1,
        xpReward: 50,
        challengeSlug: 'python-even-or-odd',
      },
      {
        number: 3,
        title: 'High Ridge',
        description: 'Compare three values and print the largest.',
        difficulty: 2,
        xpReward: 60,
        challengeSlug: 'python-largest-of-three',
      },
    ],
  },
  {
    slug: 'java-lake',
    name: 'Java Lake',
    description:
      'A wide, still lake where the same three skills return in Java. Useful for checking whether a concept transferred rather than memorised.',
    difficulty: 2,
    requiredXp: 200,
    estimatedMinutes: 10,
    // Same shape as the forest: the shallows give you a key to the deep water.
    keys: [
      {
        slug: 'java-lake-stone-key',
        title: 'Stone Key',
        description: 'Denser than brass, and heavier. It came up from the lake bed.',
        artKey: 'key-stone',
        grantedByLevelNumber: 1,
      },
    ],
    locks: [
      {
        levelNumber: 3,
        title: 'Weir Gate',
        prompt: 'A sluice gate, chained shut. The chain has rusted around a keyhole.',
        requiresKeySlug: 'java-lake-stone-key',
      },
    ],
    levels: [
      {
        number: 1,
        title: 'Shallows',
        description: 'Two values in, one sum out.',
        difficulty: 1,
        xpReward: 55,
        challengeSlug: 'java-sum-two-numbers',
      },
      {
        number: 2,
        title: 'Reef',
        description: 'An even/odd check.',
        difficulty: 2,
        xpReward: 55,
        challengeSlug: 'java-even-or-odd',
      },
      {
        number: 3,
        title: 'Deep Water',
        description: 'Find the largest of three.',
        difficulty: 2,
        xpReward: 65,
        challengeSlug: 'java-largest-of-three',
      },
    ],
  },
];

/**
 * `GameWorld.sortOrder` is unique, so a fixed literal collides with whatever rows
 * already exist (this database had hand-made worlds occupying 0 and 1, which made
 * the first version of this seed fail with P2002). Instead: keep the order value a
 * row already owns if nothing else claims it, otherwise take the lowest free one.
 */
async function resolveSortOrders(seeds: WorldSeed[]): Promise<Map<string, number>> {
  const existing = await prisma.gameWorld.findMany({ select: { slug: true, sortOrder: true } });
  const bySlug = new Map(existing.map((row) => [row.slug, row.sortOrder]));

  // Values held by worlds we do not manage are off limits.
  const managed = new Set(seeds.map((seed) => seed.slug));
  const reserved = new Set(
    existing.filter((row) => !managed.has(row.slug)).map((row) => row.sortOrder),
  );

  const assigned = new Map<string, number>();
  for (const seed of seeds) {
    const current = bySlug.get(seed.slug);
    if (current !== undefined && !reserved.has(current)) {
      assigned.set(seed.slug, current);
      reserved.add(current);
      continue;
    }
    let candidate = 1;
    while (reserved.has(candidate)) candidate += 1;
    assigned.set(seed.slug, candidate);
    reserved.add(candidate);
  }
  return assigned;
}

async function seedWorld(world: WorldSeed, sortOrder: number): Promise<void> {
  const challengeIds = new Map<string, string>();
  if (world.levels.some((level) => level.challengeSlug)) {
    const slugs = world.levels
      .map((level) => level.challengeSlug)
      .filter((slug): slug is string => slug !== null);
    const challenges = await prisma.challenge.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    for (const challenge of challenges) challengeIds.set(challenge.slug, challenge.id);
  }

  const record = await prisma.gameWorld.upsert({
    where: { slug: world.slug },
    create: {
      slug: world.slug,
      name: world.name,
      description: world.description,
      difficulty: world.difficulty,
      requiredXp: world.requiredXp,
      estimatedMinutes: world.estimatedMinutes,
      sortOrder,
      isPublished: true,
    },
    update: {
      name: world.name,
      description: world.description,
      difficulty: world.difficulty,
      requiredXp: world.requiredXp,
      estimatedMinutes: world.estimatedMinutes,
      sortOrder,
      isPublished: true,
    },
  });

  const levelIds = new Map<number, string>();
  for (const level of world.levels) {
    const challengeId = level.challengeSlug
      ? (challengeIds.get(level.challengeSlug) ?? null)
      : null;
    // `number` is unique per world, so upserting on it makes re-runs idempotent
    // while keeping the level's position in the map stable.
    const saved = await prisma.gameLevel.upsert({
      where: { worldId_number: { worldId: record.id, number: level.number } },
      create: {
        worldId: record.id,
        number: level.number,
        title: level.title,
        description: level.description,
        difficulty: level.difficulty,
        xpReward: level.xpReward,
        challengeId,
        isPublished: true,
      },
      update: {
        title: level.title,
        description: level.description,
        difficulty: level.difficulty,
        xpReward: level.xpReward,
        isPublished: true,
        // Only bind an unresolved challenge on update. Clearing an existing
        // binding would silently detach a level that an admin already linked.
        ...(challengeId ? { challengeId } : {}),
      },
    });
    levelIds.set(level.number, saved.id);
  }

  await seedRoomKeysAndLocks(record.id, world, levelIds);

  console.log(
    `Seeded world ${world.slug} with ${String(world.levels.length)} levels, ` +
      `${String(world.keys.length)} keys, ${String(world.locks.length)} locks`,
  );
}

/**
 * Keys and locks are seeded after levels because both reference a level: a key
 * names the level that awards it, a lock names the level it guards.
 */
async function seedRoomKeysAndLocks(
  worldId: string,
  world: WorldSeed,
  levelIds: Map<number, string>,
): Promise<void> {
  const keyIds = new Map<string, string>();

  for (const key of world.keys) {
    const grantingLevelId = levelIds.get(key.grantedByLevelNumber);
    if (!grantingLevelId) {
      throw new Error(
        `${world.slug}: key "${key.slug}" is granted by level ${String(
          key.grantedByLevelNumber,
        )}, which does not exist in this world's level list`,
      );
    }
    const saved = await prisma.roomKey.upsert({
      where: { slug: key.slug },
      create: {
        worldId,
        slug: key.slug,
        title: key.title,
        description: key.description,
        artKey: key.artKey,
        grantedByLevelId: grantingLevelId,
        isPublished: true,
      },
      update: {
        worldId,
        title: key.title,
        description: key.description,
        artKey: key.artKey,
        grantedByLevelId: grantingLevelId,
        isPublished: true,
      },
    });
    keyIds.set(key.slug, saved.id);
  }

  for (const lock of world.locks) {
    const guardedLevelId = levelIds.get(lock.levelNumber);
    if (!guardedLevelId) {
      throw new Error(
        `${world.slug}: lock "${lock.title}" guards level ${String(
          lock.levelNumber,
        )}, which does not exist in this world's level list`,
      );
    }
    const requiresKeyId = keyIds.get(lock.requiresKeySlug);
    if (!requiresKeyId) {
      throw new Error(
        `${world.slug}: lock "${lock.title}" requires key "${lock.requiresKeySlug}", ` +
          "which is not one of this world's seeded keys",
      );
    }
    // Upserted on levelId: exactly one lock per level.
    await prisma.roomLock.upsert({
      where: { levelId: guardedLevelId },
      create: {
        worldId,
        levelId: guardedLevelId,
        title: lock.title,
        prompt: lock.prompt,
        requiresKeyId,
        isPublished: true,
      },
      update: {
        worldId,
        title: lock.title,
        prompt: lock.prompt,
        requiresKeyId,
        isPublished: true,
      },
    });
  }
}

async function main(): Promise<void> {
  const sortOrders = await resolveSortOrders(worlds);

  for (const world of worlds) {
    await seedWorld(world, sortOrders.get(world.slug) ?? 0);
  }

  // A GameLevel.challengeId is unique, so a challenge cannot anchor two levels.
  // Fail loudly rather than silently leaving a world unbound if content is edited
  // to reuse one.
  const bound = await prisma.gameLevel.count({ where: { challengeId: { not: null } } });
  const distinct = await prisma.gameLevel.findMany({
    where: { challengeId: { not: null } },
    select: { challengeId: true },
    distinct: ['challengeId'],
  });
  if (bound !== distinct.length) {
    throw new Error(
      `A challenge is bound to more than one level (${String(bound)} levels, ${String(
        distinct.length,
      )} distinct challenges). Give each challenge its own level.`,
    );
  }

  const unbound = await prisma.gameLevel.count({ where: { challengeId: null } });
  if (unbound > 0) {
    console.warn(
      `${String(unbound)} level(s) have no challenge bound. Run pnpm db:seed:beginner first, ` +
        'then re-run this script to attach them.',
    );
  }
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
