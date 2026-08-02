import type { ChallengeDifficulty } from '@prisma/client';

const DIFFICULTY_MULTIPLIER: Record<ChallengeDifficulty, number> = {
  EASY: 1,
  MEDIUM: 1.5,
  HARD: 2,
};

export function calculateScore(input: {
  baseXp: number;
  difficulty: ChallengeDifficulty;
  passed: number;
  total: number;
  elapsedMs: number;
  timeLimitMs: number;
  priorAttempts: number;
}): { score: number; xp: number; coins: number } {
  const accuracy = input.total === 0 ? 0 : input.passed / input.total;
  const speedBonus = input.elapsedMs <= input.timeLimitMs * 0.5 ? 0.2 : 0;
  const retryPenalty = Math.min(input.priorAttempts * 0.1, 0.4);
  const xp = Math.max(
    0,
    Math.round(
      input.baseXp *
        DIFFICULTY_MULTIPLIER[input.difficulty] *
        accuracy *
        (1 + speedBonus - retryPenalty),
    ),
  );
  return { score: Math.round(accuracy * 100), xp, coins: Math.max(1, Math.floor(xp / 10)) };
}

export function nextRank(
  level: number,
): 'BEGINNER' | 'NOVICE' | 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER' {
  if (level >= 50) return 'GRANDMASTER';
  if (level >= 35) return 'MASTER';
  if (level >= 25) return 'EXPERT';
  if (level >= 15) return 'JOURNEYMAN';
  if (level >= 8) return 'APPRENTICE';
  if (level >= 3) return 'NOVICE';
  return 'BEGINNER';
}
