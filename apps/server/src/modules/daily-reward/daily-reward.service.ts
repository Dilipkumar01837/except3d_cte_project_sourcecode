import { prisma } from '../../shared/lib/prisma.js';
import { updateLeaderboard } from '../../shared/lib/leaderboard.js';
import { evaluateAchievements } from '../challenges/achievement.service.js';

function utcDateString(date: Date): string {
  const parts = date.toISOString().split('T');
  return parts[0] ?? '';
}

function todayUtc(): string {
  return utcDateString(new Date());
}

export async function getDailyRewardStatus(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    throw Object.assign(new Error('Profile not found'), { statusCode: 404 });
  }

  const todayStart = new Date(todayUtc() + 'T00:00:00.000Z');
  const todayClaim = await prisma.playerDailyReward.findFirst({
    where: { userId, claimedAt: { gte: todayStart } },
    include: { reward: true },
  });

  const claimedToday = Boolean(todayClaim);
  const currentStreak = profile.codingStreak;

  // Determine what day the next unclaimed reward would be
  const nextStreakIfClaim = claimedToday ? currentStreak : currentStreak + 1;
  const nextRewardDay = ((nextStreakIfClaim - 1) % 7) + 1;

  const nextReward = await prisma.dailyReward.findFirst({
    where: { day: nextRewardDay, isActive: true },
  });

  return {
    canClaim: !claimedToday,
    streak: currentStreak,
    nextRewardDay,
    nextReward,
    claimedToday,
    todayClaim: todayClaim ?? null,
  };
}

/** Returns or creates the 7 default daily reward definitions. */
async function getOrCreateDefaultRewards() {
  const defaults = [
    { day: 1, xpAmount: 25, coinAmount: 10 },
    { day: 2, xpAmount: 30, coinAmount: 15 },
    { day: 3, xpAmount: 40, coinAmount: 20 },
    { day: 4, xpAmount: 50, coinAmount: 25 },
    { day: 5, xpAmount: 60, coinAmount: 30 },
    { day: 6, xpAmount: 75, coinAmount: 40 },
    { day: 7, xpAmount: 100, coinAmount: 50 },
  ];
  await Promise.all(
    defaults.map((d) =>
      prisma.dailyReward.upsert({
        where: { day: d.day },
        update: {},
        create: { day: d.day, xpAmount: d.xpAmount, coinAmount: d.coinAmount, isActive: true },
      }),
    ),
  );
}

export async function claimDailyReward(userId: string) {
  const todayStr = todayUtc();
  const todayStart = new Date(todayStr + 'T00:00:00.000Z');

  // Ensure reward config rows exist (idempotent)
  await getOrCreateDefaultRewards();

  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw Object.assign(new Error('Profile not found'), { statusCode: 404 });
    }

    // Duplicate claim protection — timezone safe UTC comparison
    const existing = await tx.playerDailyReward.findFirst({
      where: { userId, claimedAt: { gte: todayStart } },
    });
    if (existing) {
      throw Object.assign(new Error('Daily reward already claimed today'), { statusCode: 409 });
    }

    // Streak calculation
    const lastDate = profile.lastStreakDate ? utcDateString(profile.lastStreakDate) : null;
    const yesterday = utcDateString(new Date(Date.now() - 86_400_000));

    let newStreak: number;
    if (lastDate === yesterday) {
      newStreak = profile.codingStreak + 1;
    } else {
      newStreak = 1; // first claim or streak broken
    }

    const rewardDay = ((newStreak - 1) % 7) + 1;
    const reward = await tx.dailyReward.findFirstOrThrow({
      where: { day: rewardDay, isActive: true },
    });

    const xpAmount = reward.xpAmount;
    const coinAmount = reward.coinAmount;

    // Insert first and let the (userId, claimDate) unique constraint arbitrate.
    // The findFirst above is only a fast path; it cannot observe a concurrent
    // uncommitted insert, so a P2002 here is the real guard and must abort the
    // whole transaction rather than double-paying the reward.
    await tx.playerDailyReward.create({
      data: { userId, rewardId: reward.id, claimDate: todayStart },
    });

    // Update profile
    const updatedProfile = await tx.profile.update({
      where: { userId },
      data: {
        xp: { increment: xpAmount },
        coins: { increment: coinAmount },
        codingStreak: newStreak,
        lastStreakDate: new Date(),
        longestStreak: Math.max(profile.longestStreak, newStreak),
      },
    });

    // Notification
    await tx.playerNotification.create({
      data: {
        userId,
        type: 'DAILY_REWARD',
        title: 'Daily reward claimed!',
        body: `+${String(xpAmount)} XP and +${String(coinAmount)} coins. Streak: ${String(newStreak)} day${newStreak !== 1 ? 's' : ''}!`,
      },
    });

    // Update leaderboard outside transaction (non-critical)
    if (xpAmount > 0) {
      void updateLeaderboard(userId, xpAmount);
    }

    // Evaluate streak achievements (non-blocking)
    void evaluateAchievements({ userId, trigger: 'STREAK_REACHED', streak: newStreak });
    void evaluateAchievements({ userId, trigger: 'DAILY_REWARD_STREAK', streak: newStreak });

    return {
      reward,
      xpEarned: xpAmount,
      coinsEarned: coinAmount,
      newXp: updatedProfile.xp,
      newCoins: updatedProfile.coins,
      streak: newStreak,
    };
  });
}
