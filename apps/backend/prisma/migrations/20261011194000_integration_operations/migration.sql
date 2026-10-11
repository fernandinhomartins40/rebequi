ALTER TYPE "ChannelType" ADD VALUE 'MAGALU';
ALTER TYPE "ChannelType" ADD VALUE 'CASAS_BAHIA';
ALTER TYPE "ChannelType" ADD VALUE 'AMERICANAS';
ALTER TYPE "ChannelType" ADD VALUE 'SHEIN';
CREATE TABLE "integration_audits" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "integration_audits_jobId_createdAt_idx" ON "integration_audits"("jobId", "createdAt");
CREATE INDEX "integration_audits_createdAt_idx" ON "integration_audits"("createdAt");
