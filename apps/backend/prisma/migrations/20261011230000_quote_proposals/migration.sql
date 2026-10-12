ALTER TABLE "quote_requests" ADD COLUMN "proposalOrderId" TEXT,
 ADD COLUMN "acceptedProposalVersion" INTEGER, ADD COLUMN "proposalAcceptedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "quote_requests_proposalOrderId_key" ON "quote_requests"("proposalOrderId");
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_proposalOrderId_fkey" FOREIGN KEY ("proposalOrderId") REFERENCES "customer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "quote_proposals" (
 "id" TEXT NOT NULL, "quoteId" TEXT NOT NULL, "version" INTEGER NOT NULL CHECK ("version" > 0),
 "requestKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL, "createdById" TEXT NOT NULL,
 "items" JSONB NOT NULL, "notes" TEXT NOT NULL DEFAULT '', "totalCents" BIGINT NOT NULL CHECK ("totalCents" >= 0),
 "validUntil" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "quote_proposals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quote_proposals_requestKey_key" ON "quote_proposals"("requestKey");
CREATE UNIQUE INDEX "quote_proposals_quoteId_version_key" ON "quote_proposals"("quoteId", "version");
CREATE INDEX "quote_proposals_quoteId_createdAt_idx" ON "quote_proposals"("quoteId", "createdAt");
ALTER TABLE "quote_proposals" ADD CONSTRAINT "quote_proposals_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
