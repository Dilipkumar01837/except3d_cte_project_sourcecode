-- CreateEnum
CREATE TYPE "HintType" AS ENUM ('CONCEPTUAL', 'DIRECTIONAL', 'SPECIFIC', 'EXAMPLE', 'DEBUGGING');

-- CreateTable
CREATE TABLE "UserLearningProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillLevels" JSONB NOT NULL DEFAULT '{}',
    "errorPatterns" JSONB NOT NULL DEFAULT '{}',
    "preferredLearningStyle" TEXT,
    "personalizedHintsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "recentPerformanceTrend" DOUBLE PRECISION,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "successfulRuns" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserLearningProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HintHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "language" "ProgrammingLanguage" NOT NULL,
    "hintType" "HintType" NOT NULL,
    "hintText" TEXT NOT NULL,
    "contextSnapshot" JSONB NOT NULL,
    "helpfulRating" BOOLEAN,
    "attemptsBefore" INTEGER NOT NULL DEFAULT 0,
    "attemptsAfter" INTEGER,
    "solvedAfter" BOOLEAN NOT NULL DEFAULT false,
    "requestedAnother" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HintHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLearningProfile_userId_key" ON "UserLearningProfile"("userId");
CREATE INDEX "UserLearningProfile_updatedAt_idx" ON "UserLearningProfile"("updatedAt");
CREATE INDEX "HintHistory_userId_createdAt_idx" ON "HintHistory"("userId", "createdAt");
CREATE INDEX "HintHistory_challengeId_createdAt_idx" ON "HintHistory"("challengeId", "createdAt");
CREATE INDEX "HintHistory_hintType_helpfulRating_idx" ON "HintHistory"("hintType", "helpfulRating");

ALTER TABLE "UserLearningProfile" ADD CONSTRAINT "UserLearningProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HintHistory" ADD CONSTRAINT "HintHistory_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HintHistory" ADD CONSTRAINT "HintHistory_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HintHistory" ADD CONSTRAINT "HintHistory_profile_fkey" FOREIGN KEY ("userId") REFERENCES "UserLearningProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
