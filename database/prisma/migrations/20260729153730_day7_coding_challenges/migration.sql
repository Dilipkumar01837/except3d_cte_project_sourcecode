-- CreateEnum
CREATE TYPE "ProgrammingLanguage" AS ENUM ('PYTHON', 'JAVA', 'JAVASCRIPT', 'TYPESCRIPT', 'CPP', 'GO', 'RUST');

-- CreateEnum
CREATE TYPE "ChallengeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('ALGORITHMS', 'DATA_STRUCTURES', 'DEBUGGING', 'OUTPUT_PREDICTION', 'FILL_IN_THE_BLANK', 'CODE_COMPLETION');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('QUEUED', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'INTERNAL_ERROR');

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "constraints" TEXT,
    "starterCode" JSONB NOT NULL DEFAULT '{}',
    "difficulty" "ChallengeDifficulty" NOT NULL,
    "type" "ChallengeType" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportedLanguages" "ProgrammingLanguage"[],
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "timeLimitMs" INTEGER NOT NULL DEFAULT 2000,
    "memoryLimitMb" INTEGER NOT NULL DEFAULT 128,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeTestCase" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "explanation" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChallengeTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeSolution" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "language" "ProgrammingLanguage" NOT NULL,
    "code" TEXT NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "ChallengeSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeHint" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "xpPenalty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChallengeHint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "language" "ProgrammingLanguage" NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "executionTimeMs" INTEGER,
    "memoryUsedKb" INTEGER,
    "compilerOutput" TEXT,
    "runtimeOutput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionTestResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "executionTimeMs" INTEGER,
    "memoryUsedKb" INTEGER,
    "output" TEXT,

    CONSTRAINT "SubmissionTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE INDEX "Challenge_isPublished_difficulty_idx" ON "Challenge"("isPublished", "difficulty");

-- CreateIndex
CREATE INDEX "Challenge_type_idx" ON "Challenge"("type");

-- CreateIndex
CREATE INDEX "ChallengeTestCase_challengeId_isHidden_idx" ON "ChallengeTestCase"("challengeId", "isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeSolution_challengeId_language_key" ON "ChallengeSolution"("challengeId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeHint_challengeId_level_key" ON "ChallengeHint"("challengeId", "level");

-- CreateIndex
CREATE INDEX "Submission_userId_challengeId_createdAt_idx" ON "Submission"("userId", "challengeId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_status_createdAt_idx" ON "Submission"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionTestResult_submissionId_testCaseId_key" ON "SubmissionTestResult"("submissionId", "testCaseId");

-- AddForeignKey
ALTER TABLE "ChallengeTestCase" ADD CONSTRAINT "ChallengeTestCase_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeSolution" ADD CONSTRAINT "ChallengeSolution_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeHint" ADD CONSTRAINT "ChallengeHint_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionTestResult" ADD CONSTRAINT "SubmissionTestResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
