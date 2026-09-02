-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('OPEN', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DuelMatch" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "opponentId" TEXT,
    "status" "DuelStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DuelMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuelMatch_status_createdAt_idx" ON "DuelMatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DuelMatch_creatorId_createdAt_idx" ON "DuelMatch"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "DuelMatch_opponentId_createdAt_idx" ON "DuelMatch"("opponentId", "createdAt");

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
