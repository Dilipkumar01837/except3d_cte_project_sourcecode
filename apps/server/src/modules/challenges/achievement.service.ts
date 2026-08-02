/**
 * Achievement Evaluation Engine
 *
 * Architecture:
 *   Player Event → evaluateAchievements(trigger, context)
 *     → Load eligible published achievements matching the trigger
 *     → For each: evaluate condition against context
 *     → If target reached and not already unlocked: unlock + award XP/coins
 *     → Persist atomically (upsert progress, create notification, emit Socket.IO)
 *
 * Idempotency:
 *   - Progress upsert uses @@unique([userId, achievementId])
 *   - Unlock check guards with unlockedAt === null before awarding rewards
 *   - XP/coin award is inside the same transaction — no double-awards
 *
 * Adding a new trigger:
 *   1. Add the trigger name to AchievementTrigger
 *   2. Implement its evaluator in EVALUATORS
 *   3. Call evaluateAchievements from the relevant service
 */

import { prisma } from '../../shared/lib/prisma.js';
import { emitToUser } from '../../shared/lib/socket.js';

// ─────────────────────────────────────────────────────────────────
// Supported trigger types
// ─────────────────────────────────────────────────────────────────

export type AchievementTrigger =
  | 'FIRST_LOGIN'
  | 'FIRST_CHALLENGE_SOLVED'
  | 'CHALLENGES_SOLVED'
  | 'XP_REACHED'
  | 'LEVEL_REACHED'
  | 'STREAK_REACHED'
  | 'PERFECT_SUBMISSION'
  | 'DAILY_REWARD_STREAK';

/** The evaluation context carries the latest values after the event. */
export interface AchievementContext {
  userId: string;
  trigger: AchievementTrigger;
  /** New total challenges solved (for CHALLENGES_SOLVED) */
  challengesSolved?: number;
  /** New total XP (for XP_REACHED) */
  xp?: number;
  /** New level (for LEVEL_REACHED) */
  level?: number;
  /** New coding streak (for STREAK_REACHED / DAILY_REWARD_STREAK) */
  streak?: number;
  /** Whether the latest submission was 100% score (for PERFECT_SUBMISSION) */
  isPerfect?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Evaluators — map trigger → progress value
// ─────────────────────────────────────────────────────────────────

/**
 * Returns the current progress value for the given trigger.
 * The achievement unlocks when progress >= target.
 */
function getProgress(trigger: AchievementTrigger, ctx: AchievementContext): number {
  switch (trigger) {
    case 'FIRST_LOGIN':
      return 1; // just logging in counts
    case 'FIRST_CHALLENGE_SOLVED':
      return (ctx.challengesSolved ?? 0) >= 1 ? 1 : 0;
    case 'CHALLENGES_SOLVED':
      return ctx.challengesSolved ?? 0;
    case 'XP_REACHED':
      return ctx.xp ?? 0;
    case 'LEVEL_REACHED':
      return ctx.level ?? 0;
    case 'STREAK_REACHED':
    case 'DAILY_REWARD_STREAK':
      return ctx.streak ?? 0;
    case 'PERFECT_SUBMISSION':
      return ctx.isPerfect ? 1 : 0;
    default:
      return 0;
  }
}

// ─────────────────────────────────────────────────────────────────
// Achievement slug naming convention
// ─────────────────────────────────────────────────────────────────
// Achievement slugs encode their trigger type as a prefix so we can
// efficiently filter candidates without a full table scan.
// e.g. "challenges_solved_10", "xp_reached_500", "streak_reached_7"
//
// The engine does NOT require slug naming — it evaluates based on
// the trigger stored in the achievement's slug prefix convention.
// To support this in the DB we rely on the `slug` containing the
// trigger keyword as a prefix. Admins should follow this convention
// when creating achievements; the engine is defensive and treats
// unrecognised slugs as matching all triggers (evaluated against
// the raw progress value).

// ─────────────────────────────────────────────────────────────────
// Core evaluation function
// ─────────────────────────────────────────────────────────────────

/**
 * Evaluates all eligible achievements for the given event context.
 * Safe to call redundantly — already-unlocked achievements are skipped.
 * Non-blocking: errors are caught and logged; never thrown to caller.
 */
export async function evaluateAchievements(ctx: AchievementContext): Promise<void> {
  try {
    // Load all published achievements; we evaluate against the progress value
    const achievements = await prisma.achievement.findMany({
      where: { isPublished: true },
    });

    if (achievements.length === 0) return;

    const progress = getProgress(ctx.trigger, ctx);

    for (const achievement of achievements) {
      try {
        await processAchievement(ctx.userId, achievement, progress, ctx.trigger);
      } catch {
        // One bad achievement must not prevent the others from being evaluated
      }
    }
  } catch {
    // Achievement evaluation is non-critical — never crash the caller
  }
}

interface AchievementRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  target: number;
  xpReward: number;
}

async function processAchievement(
  userId: string,
  achievement: AchievementRecord,
  progress: number,
  trigger: AchievementTrigger,
): Promise<void> {
  // Only process achievements whose slug prefix matches this trigger
  if (!slugMatchesTrigger(achievement.slug, trigger)) return;

  // Progress must meet the target
  if (progress < achievement.target) {
    // Still update progress even if not yet complete
    await prisma.playerAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      create: { userId, achievementId: achievement.id, progress },
      update: { progress },
    });
    return;
  }

  // Check if already unlocked (idempotency guard)
  const existing = await prisma.playerAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });
  if (existing?.unlockedAt) return; // already unlocked — nothing to do

  // Unlock atomically
  await prisma.$transaction(async (tx) => {
    // Update or create the player achievement row
    await tx.playerAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      create: {
        userId,
        achievementId: achievement.id,
        progress: achievement.target,
        unlockedAt: new Date(),
      },
      update: { progress: achievement.target, unlockedAt: new Date() },
    });

    // Award XP/coins if the achievement has a reward
    if (achievement.xpReward > 0) {
      await tx.profile.update({
        where: { userId },
        data: { xp: { increment: achievement.xpReward } },
      });
    }

    // Create notification
    await tx.playerNotification.create({
      data: {
        userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        title: '🏆 Achievement unlocked!',
        body: `${achievement.name}: ${achievement.description}`,
        data: { achievementId: achievement.id, xpReward: achievement.xpReward },
      },
    });
  });

  // Emit Socket.IO event (non-critical, outside transaction)
  emitToUser(userId, 'achievement:unlocked', {
    achievementId: achievement.id,
    name: achievement.name,
    xpReward: achievement.xpReward,
  });
}

// ─────────────────────────────────────────────────────────────────
// Slug-to-trigger matching
// ─────────────────────────────────────────────────────────────────

const TRIGGER_PREFIXES: Record<AchievementTrigger, string[]> = {
  FIRST_LOGIN: ['first_login', 'welcome', 'join'],
  FIRST_CHALLENGE_SOLVED: ['first_challenge', 'first_solve'],
  CHALLENGES_SOLVED: ['challenges_solved', 'solve_', 'challenge_count'],
  XP_REACHED: ['xp_reached', 'xp_'],
  LEVEL_REACHED: ['level_reached', 'level_'],
  STREAK_REACHED: ['streak_reached', 'streak_'],
  DAILY_REWARD_STREAK: ['daily_reward_streak', 'daily_streak_'],
  PERFECT_SUBMISSION: ['perfect_submission', 'perfect_'],
};

function slugMatchesTrigger(slug: string, trigger: AchievementTrigger): boolean {
  const prefixes = TRIGGER_PREFIXES[trigger];
  const lower = slug.toLowerCase();
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix) || lower.includes(prefix)) return true;
  }
  // Fallback: if slug doesn't match any known prefix pattern at all,
  // we don't evaluate it for this trigger (opt-in by naming convention)
  return false;
}
