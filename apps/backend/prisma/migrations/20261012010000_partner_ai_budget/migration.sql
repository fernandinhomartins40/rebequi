CREATE TABLE "partner_ai_runs" (
 "id" TEXT NOT NULL, "partnerId" TEXT NOT NULL, "requestKey" TEXT NOT NULL, "inputHash" TEXT NOT NULL,
 "provider" TEXT NOT NULL, "model" TEXT NOT NULL, "promptVersion" TEXT NOT NULL, "month" TEXT NOT NULL, "day" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'RESERVED', "reservedMicroUsd" BIGINT NOT NULL CHECK ("reservedMicroUsd" >= 0),
 "chargedMicroUsd" BIGINT NOT NULL CHECK ("chargedMicroUsd" >= 0), "inputRateMicroUsd" INTEGER NOT NULL, "outputRateMicroUsd" INTEGER NOT NULL,
 "promptTokens" INTEGER, "completionTokens" INTEGER, "durationMs" INTEGER, "errorCode" TEXT, "result" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
 CONSTRAINT "partner_ai_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_ai_runs_requestKey_key" ON "partner_ai_runs"("requestKey");
CREATE INDEX "partner_ai_runs_month_idx" ON "partner_ai_runs"("month");
CREATE INDEX "partner_ai_runs_partnerId_day_idx" ON "partner_ai_runs"("partnerId", "day");
CREATE INDEX "partner_ai_runs_partnerId_inputHash_createdAt_idx" ON "partner_ai_runs"("partnerId", "inputHash", "createdAt");
ALTER TABLE "partner_ai_runs" ADD CONSTRAINT "partner_ai_runs_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
