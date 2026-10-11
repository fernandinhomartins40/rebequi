CREATE TABLE "integration_jobs" (
  "id" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "productId" TEXT,
  "channelId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3),
  "leaseToken" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "integration_jobs_dedupeKey_key" ON "integration_jobs"("dedupeKey");
CREATE INDEX "integration_jobs_status_nextAttemptAt_idx" ON "integration_jobs"("status", "nextAttemptAt");
CREATE INDEX "integration_jobs_leaseUntil_idx" ON "integration_jobs"("leaseUntil");
CREATE INDEX "integration_jobs_channelId_createdAt_idx" ON "integration_jobs"("channelId", "createdAt");
-- Existing placeholders must not remain advertised as verified connections.
UPDATE "channels" SET "status" = 'DISCONNECTED' WHERE "type" <> 'MANUAL';
UPDATE "channel_listings" SET "syncStatus" = 'OUT_OF_SYNC', "lastError" = 'Autorização e confirmação externa necessárias' WHERE "channelId" IN (SELECT id FROM "channels" WHERE "type" <> 'MANUAL');
