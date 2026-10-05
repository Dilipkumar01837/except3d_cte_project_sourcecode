CREATE TABLE "UserFcmToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "deviceInfo" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserFcmToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserFcmToken_token_key" ON "UserFcmToken"("token");
CREATE INDEX "UserFcmToken_userId_enabled_lastUsedAt_idx" ON "UserFcmToken"("userId", "enabled", "lastUsedAt");
ALTER TABLE "UserFcmToken" ADD CONSTRAINT "UserFcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;