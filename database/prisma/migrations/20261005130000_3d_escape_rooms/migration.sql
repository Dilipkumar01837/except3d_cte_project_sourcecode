CREATE TABLE "SceneDefinition" (
  "id" TEXT NOT NULL,
  "levelId" TEXT NOT NULL,
  "modelUrl" TEXT,
  "objects" JSONB NOT NULL,
  "settings" JSONB,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SceneDefinition_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlayerSceneState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "levelId" TEXT NOT NULL,
  "playerPosition" JSONB NOT NULL,
  "unlockedObjects" JSONB NOT NULL,
  "sceneProgress" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerSceneState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SceneDefinition_levelId_key" ON "SceneDefinition"("levelId");
CREATE INDEX "SceneDefinition_isPublished_updatedAt_idx" ON "SceneDefinition"("isPublished", "updatedAt");
CREATE UNIQUE INDEX "PlayerSceneState_userId_levelId_key" ON "PlayerSceneState"("userId", "levelId");
CREATE INDEX "PlayerSceneState_userId_updatedAt_idx" ON "PlayerSceneState"("userId", "updatedAt");
CREATE INDEX "PlayerSceneState_levelId_updatedAt_idx" ON "PlayerSceneState"("levelId", "updatedAt");
ALTER TABLE "SceneDefinition" ADD CONSTRAINT "SceneDefinition_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "GameLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerSceneState" ADD CONSTRAINT "PlayerSceneState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerSceneState" ADD CONSTRAINT "PlayerSceneState_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "GameLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;