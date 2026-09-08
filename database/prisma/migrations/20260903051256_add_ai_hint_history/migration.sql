-- CreateTable
CREATE TABLE "AiHintHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "language" "ProgrammingLanguage" NOT NULL,
    "hint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiHintHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiHintHistory_userId_createdAt_idx" ON "AiHintHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiHintHistory_challengeId_createdAt_idx" ON "AiHintHistory"("challengeId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiHintHistory" ADD CONSTRAINT "AiHintHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiHintHistory" ADD CONSTRAINT "AiHintHistory_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
