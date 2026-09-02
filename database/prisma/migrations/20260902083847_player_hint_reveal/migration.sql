-- CreateTable
CREATE TABLE "PlayerHintReveal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hintId" TEXT NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerHintReveal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerHintReveal_userId_revealedAt_idx" ON "PlayerHintReveal"("userId", "revealedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerHintReveal_userId_hintId_key" ON "PlayerHintReveal"("userId", "hintId");

-- AddForeignKey
ALTER TABLE "PlayerHintReveal" ADD CONSTRAINT "PlayerHintReveal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerHintReveal" ADD CONSTRAINT "PlayerHintReveal_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "ChallengeHint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
