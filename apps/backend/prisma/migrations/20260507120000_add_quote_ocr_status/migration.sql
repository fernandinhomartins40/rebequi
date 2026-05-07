CREATE TYPE "QuoteOcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

ALTER TABLE "quote_requests"
ADD COLUMN "ocrStatus" "QuoteOcrStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "ocrError" TEXT;

CREATE INDEX "quote_requests_ocrStatus_idx" ON "quote_requests"("ocrStatus");
