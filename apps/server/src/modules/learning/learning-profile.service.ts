import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';

export interface LearningActivity {
  language?: string;
  challengeId?: string;
  concept?: string;
  errorType?: string;
  timeTakenMs?: number;
  solved?: boolean;
  hintType?: string;
}

const jsonInput = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

/** Best-effort durable learner summary; activity must never block the user action. */
export async function recordLearningActivity(
  userId: string,
  activity: LearningActivity,
): Promise<void> {
  try {
    const profile = await prisma.userLearningProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const skillLevels = (profile.skillLevels ?? {}) as Record<string, number>;
    const errorPatterns = (profile.errorPatterns ?? {}) as Record<string, number>;
    const hintHistorySummary = (profile.hintHistorySummary ?? {}) as Record<string, number>;
    const completionHistory = Array.isArray(profile.challengeCompletionHistory)
      ? [...profile.challengeCompletionHistory]
      : [];
    if (activity.language)
      skillLevels[activity.language] =
        (skillLevels[activity.language] ?? 0) + (activity.solved ? 1 : 0);
    if (activity.concept)
      skillLevels[activity.concept] =
        (skillLevels[activity.concept] ?? 0) + (activity.solved ? 1 : 0);
    if (activity.errorType)
      errorPatterns[activity.errorType] = (errorPatterns[activity.errorType] ?? 0) + 1;
    if (activity.hintType)
      hintHistorySummary[activity.hintType] = (hintHistorySummary[activity.hintType] ?? 0) + 1;
    if (activity.challengeId) {
      completionHistory.push({
        challengeId: activity.challengeId,
        language: activity.language,
        timeTakenMs: activity.timeTakenMs ?? null,
        solved: activity.solved ?? false,
        at: new Date().toISOString(),
      });
    }
    const totalRuns = profile.totalRuns + (activity.timeTakenMs !== undefined ? 1 : 0);
    const successfulRuns = profile.successfulRuns + (activity.solved ? 1 : 0);
    await prisma.userLearningProfile.update({
      where: { userId },
      data: {
        skillLevels: jsonInput(skillLevels),
        errorPatterns: jsonInput(errorPatterns),
        hintHistorySummary: jsonInput(hintHistorySummary),
        challengeCompletionHistory: jsonInput(completionHistory.slice(-100)),
        totalRuns,
        successfulRuns,
        recentPerformanceTrend: totalRuns
          ? successfulRuns / totalRuns
          : profile.recentPerformanceTrend,
      },
    });
  } catch {
    // Learning summaries are secondary to the code execution/submission path.
  }
}
