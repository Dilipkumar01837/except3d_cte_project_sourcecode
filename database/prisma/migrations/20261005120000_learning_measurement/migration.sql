-- Learning outcome measurement and opt-in research analytics.
CREATE TYPE "AssessmentType" AS ENUM ('PRE', 'POST');

CREATE TABLE "Assessment" (
  "id" TEXT NOT NULL,
  "worldId" TEXT,
  "levelId" TEXT,
  "type" "AssessmentType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AssessmentQuestion" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB,
  "answer" JSONB NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 1,
  "objective" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AssessmentAttempt" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "timeTakenMs" INTEGER NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "responses" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Experiment" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "variants" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExperimentAssignment" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "telemetry" BOOLEAN NOT NULL DEFAULT false,
  "consentAt" TIMESTAMP(3),
  "withdrawnAt" TIMESTAMP(3),
  "version" TEXT,
  CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Experiment_key_key" ON "Experiment"("key");
CREATE UNIQUE INDEX "ExperimentAssignment_experimentId_userId_key" ON "ExperimentAssignment"("experimentId", "userId");
CREATE UNIQUE INDEX "UserConsent_userId_key" ON "UserConsent"("userId");
CREATE INDEX "Assessment_worldId_type_isPublished_idx" ON "Assessment"("worldId", "type", "isPublished");
CREATE INDEX "Assessment_levelId_type_isPublished_idx" ON "Assessment"("levelId", "type", "isPublished");
CREATE INDEX "AssessmentQuestion_assessmentId_sortOrder_idx" ON "AssessmentQuestion"("assessmentId", "sortOrder");
CREATE INDEX "AssessmentAttempt_userId_assessmentId_completedAt_idx" ON "AssessmentAttempt"("userId", "assessmentId", "completedAt");
CREATE INDEX "AssessmentAttempt_assessmentId_completedAt_idx" ON "AssessmentAttempt"("assessmentId", "completedAt");
CREATE INDEX "Experiment_isActive_createdAt_idx" ON "Experiment"("isActive", "createdAt");
CREATE INDEX "ExperimentAssignment_experimentId_variant_assignedAt_idx" ON "ExperimentAssignment"("experimentId", "variant", "assignedAt");
CREATE INDEX "ExperimentAssignment_userId_assignedAt_idx" ON "ExperimentAssignment"("userId", "assignedAt");
CREATE INDEX "UserEvent_userId_createdAt_idx" ON "UserEvent"("userId", "createdAt");
CREATE INDEX "UserEvent_eventType_createdAt_idx" ON "UserEvent"("eventType", "createdAt");
CREATE INDEX "UserConsent_telemetry_consentAt_idx" ON "UserConsent"("telemetry", "consentAt");

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "GameLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;