-- Escape-room locks and keys.
--
-- The mechanic is: completing a level can award a key, and a key opens a lock
-- guarding a later level. This lets a player skip ahead once they have solved
-- enough, instead of only ever walking the levels in order.

-- CreateTable
CREATE TABLE "RoomKey" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "artKey" TEXT,
    "grantedByLevelId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomLock" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "requiresKeyId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRoomKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerRoomKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomKey_slug_key" ON "RoomKey"("slug");

-- One level awards at most one key. Enforced in the schema so the worker's award
-- is never ambiguous about which level produced it.
CREATE UNIQUE INDEX "RoomKey_grantedByLevelId_key" ON "RoomKey"("grantedByLevelId");

CREATE INDEX "RoomKey_worldId_isPublished_idx" ON "RoomKey"("worldId", "isPublished");

-- One lock per level.
CREATE UNIQUE INDEX "RoomLock_levelId_key" ON "RoomLock"("levelId");

CREATE UNIQUE INDEX "RoomLock_worldId_levelId_key" ON "RoomLock"("worldId", "levelId");

CREATE INDEX "RoomLock_requiresKeyId_idx" ON "RoomLock"("requiresKeyId");

-- A player holds a key at most once, so re-solving the granting level cannot
-- duplicate rows or double-count it.
CREATE UNIQUE INDEX "PlayerRoomKey_userId_keyId_key" ON "PlayerRoomKey"("userId", "keyId");

CREATE INDEX "PlayerRoomKey_userId_idx" ON "PlayerRoomKey"("userId");

-- AddForeignKey
ALTER TABLE "RoomKey" ADD CONSTRAINT "RoomKey_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ON DELETE SET NULL, not CASCADE: deleting the granting level must not delete a
-- key players may already hold. The key survives as an unearnable collectible.
ALTER TABLE "RoomKey" ADD CONSTRAINT "RoomKey_grantedByLevelId_fkey" FOREIGN KEY ("grantedByLevelId") REFERENCES "GameLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomLock" ADD CONSTRAINT "RoomLock_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomLock" ADD CONSTRAINT "RoomLock_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "GameLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomLock" ADD CONSTRAINT "RoomLock_requiresKeyId_fkey" FOREIGN KEY ("requiresKeyId") REFERENCES "RoomKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerRoomKey" ADD CONSTRAINT "PlayerRoomKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerRoomKey" ADD CONSTRAINT "PlayerRoomKey_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "RoomKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
