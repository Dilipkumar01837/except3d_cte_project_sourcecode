/*
  Warnings:

  - A unique constraint covering the columns `[challengeId]` on the table `GameLevel` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "GameLevel" ADD COLUMN     "challengeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GameLevel_challengeId_key" ON "GameLevel"("challengeId");

-- AddForeignKey
ALTER TABLE "GameLevel" ADD CONSTRAINT "GameLevel_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
