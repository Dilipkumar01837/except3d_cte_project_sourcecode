-- Interactive 2D escape room: persist whether the player has read a room's clue.
--
-- Purely cosmetic discovery state. It grants no XP, keys, or completion, so it is
-- intentionally a single defaulted column on the existing level-progress row
-- rather than a new table. Completion and rewards remain server-authoritative.

-- AlterTable
ALTER TABLE "PlayerLevelProgress" ADD COLUMN "clueRead" BOOLEAN NOT NULL DEFAULT false;
