-- AlterTable: add nullable first so existing rows can be backfilled.
ALTER TABLE "PlayerDailyReward"
  ADD COLUMN "claimDate" TIMESTAMP(3);

-- Backfill claimDate with the UTC midnight of claimedAt so the unique constraint
-- can be added without breaking existing rows.
UPDATE "PlayerDailyReward"
SET "claimDate" = date_trunc('day', "claimedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
WHERE "claimDate" IS NULL;

-- Non-null is now safe because every row has a value.
ALTER TABLE "PlayerDailyReward"
  ALTER COLUMN "claimDate" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "PlayerDailyReward_userId_claimedAt_idx";

-- CreateIndex: the authoritative one-claim-per-day guard. A concurrent second
-- claim hits this violation and the whole transaction rolls back, so XP and
-- coins cannot be paid twice.
CREATE UNIQUE INDEX "PlayerDailyReward_userId_claimDate_key" ON "PlayerDailyReward"("userId", "claimDate");

-- Restore the original lookup index used by the status endpoint.
CREATE INDEX "PlayerDailyReward_userId_claimedAt_idx" ON "PlayerDailyReward"("userId", "claimedAt");
