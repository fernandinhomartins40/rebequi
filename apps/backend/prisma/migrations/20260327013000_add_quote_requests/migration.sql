ALTER TABLE "users"
ADD COLUMN "whatsapp" TEXT,
ADD COLUMN "isProvisional" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX "users_whatsapp_key" ON "users"("whatsapp");
CREATE INDEX "users_whatsapp_idx" ON "users"("whatsapp");
CREATE INDEX "users_isProvisional_idx" ON "users"("isProvisional");

CREATE TYPE "LeadStatus" AS ENUM ('STARTED', 'QUOTE_DRAFTED', 'QUOTE_SUBMITTED', 'CONTACTED', 'ARCHIVED');
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'RESPONDED', 'ARCHIVED');

CREATE TABLE "lead_captures" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nameSnapshot" TEXT NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'public_quote',
  "status" "LeadStatus" NOT NULL DEFAULT 'STARTED',
  "notes" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lead_captures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_requests" (
  "id" TEXT NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "leadId" TEXT,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "source" TEXT NOT NULL DEFAULT 'customer_dashboard',
  "title" TEXT,
  "customerNote" TEXT,
  "ocrText" TEXT,
  "ocrConfidence" DOUBLE PRECISION,
  "documentUrl" TEXT NOT NULL,
  "documentStorageKey" TEXT,
  "documentFilename" TEXT,
  "documentMimeType" TEXT,
  "documentSize" INTEGER,
  "documentWidth" INTEGER,
  "documentHeight" INTEGER,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_items" (
  "id" TEXT NOT NULL,
  "quoteRequestId" TEXT NOT NULL,
  "productId" TEXT,
  "name" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unit" TEXT,
  "notes" TEXT,
  "confidence" DOUBLE PRECISION,
  "recognitionSourceLine" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quote_requests_referenceCode_key" ON "quote_requests"("referenceCode");
CREATE INDEX "lead_captures_userId_idx" ON "lead_captures"("userId");
CREATE INDEX "lead_captures_whatsapp_idx" ON "lead_captures"("whatsapp");
CREATE INDEX "lead_captures_status_idx" ON "lead_captures"("status");
CREATE INDEX "quote_requests_referenceCode_idx" ON "quote_requests"("referenceCode");
CREATE INDEX "quote_requests_userId_idx" ON "quote_requests"("userId");
CREATE INDEX "quote_requests_leadId_idx" ON "quote_requests"("leadId");
CREATE INDEX "quote_requests_status_idx" ON "quote_requests"("status");
CREATE INDEX "quote_requests_submittedAt_idx" ON "quote_requests"("submittedAt");
CREATE INDEX "quote_items_quoteRequestId_position_idx" ON "quote_items"("quoteRequestId", "position");
CREATE INDEX "quote_items_productId_idx" ON "quote_items"("productId");

ALTER TABLE "lead_captures"
ADD CONSTRAINT "lead_captures_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_requests"
ADD CONSTRAINT "quote_requests_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_requests"
ADD CONSTRAINT "quote_requests_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "lead_captures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quote_items"
ADD CONSTRAINT "quote_items_quoteRequestId_fkey"
FOREIGN KEY ("quoteRequestId") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_items"
ADD CONSTRAINT "quote_items_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
