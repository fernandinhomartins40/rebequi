CREATE TABLE "partner_labor_quotes" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "requestKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "projectTitleSnapshot" TEXT NOT NULL,
  "professionalNameSnapshot" TEXT NOT NULL,
  "clientNameSnapshot" TEXT NOT NULL DEFAULT '',
  "items" JSONB NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "totalCents" BIGINT NOT NULL CHECK ("totalCents" >= 0),
  "validUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_labor_quotes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_labor_quotes_requestKey_key" ON "partner_labor_quotes"("requestKey");
CREATE UNIQUE INDEX "partner_labor_quotes_projectId_version_key" ON "partner_labor_quotes"("projectId", "version");
CREATE INDEX "partner_labor_quotes_projectId_createdAt_idx" ON "partner_labor_quotes"("projectId", "createdAt");
ALTER TABLE "partner_labor_quotes" ADD CONSTRAINT "partner_labor_quotes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "partner_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
