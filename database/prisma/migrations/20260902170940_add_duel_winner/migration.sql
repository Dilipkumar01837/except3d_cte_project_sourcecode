-- AlterTable
ALTER TABLE "DuelMatch" ADD COLUMN     "winnerId" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "duelId" TEXT;

-- CreateIndex
CREATE INDEX "DuelMatch_winnerId_idx" ON "DuelMatch"("winnerId");

-- CreateIndex
CREATE INDEX "Submission_duelId_userId_createdAt_idx" ON "Submission"("duelId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "DuelMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
