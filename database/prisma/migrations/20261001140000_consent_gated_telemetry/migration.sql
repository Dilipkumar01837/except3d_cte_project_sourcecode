-- Consent-gated engagement telemetry.
--
-- Telemetry is opt-in: nothing is recorded until the player explicitly enables
-- it in Settings. The consent timestamp and policy version make the decision
-- auditable. Events are engagement signals only and must not be read as
-- evidence of learning. No IP address or user agent is stored.

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "telemetryOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "telemetryConsentAt" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "telemetryConsentVersion" TEXT;

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelemetryEvent_userId_createdAt_idx" ON "TelemetryEvent"("userId", "createdAt");

CREATE INDEX "TelemetryEvent_name_createdAt_idx" ON "TelemetryEvent"("name", "createdAt");

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
