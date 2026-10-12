CREATE TABLE "partner_projects" (
  "id" TEXT NOT NULL PRIMARY KEY, "partnerId" TEXT NOT NULL, "requestKey" TEXT, "fingerprint" TEXT,
  "title" TEXT NOT NULL, "service" TEXT NOT NULL, "reference" TEXT NOT NULL DEFAULT '',
  "clientName" TEXT NOT NULL DEFAULT '', "notes" TEXT NOT NULL DEFAULT '', "rooms" JSONB NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partner_projects_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_projects_version_check" CHECK ("version" > 0)
);
CREATE INDEX "partner_projects_partnerId_archived_updatedAt_idx" ON "partner_projects"("partnerId", "archived", "updatedAt");
CREATE UNIQUE INDEX "partner_projects_requestKey_key" ON "partner_projects"("requestKey");
CREATE TABLE "product_technical_specs" (
  "productId" TEXT NOT NULL PRIMARY KEY, "parameters" JSONB NOT NULL, "sourceUrl" TEXT NOT NULL,
  "checkedById" TEXT NOT NULL, "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "product_technical_specs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_technical_specs_version_check" CHECK ("version" > 0)
);
CREATE TABLE "material_estimates" (
  "id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "requestKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL, "input" JSONB NOT NULL, "result" JSONB NOT NULL, "quoteId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "material_estimates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "partner_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "material_estimates_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "material_estimates_requestKey_key" ON "material_estimates"("requestKey");
CREATE UNIQUE INDEX "material_estimates_quoteId_key" ON "material_estimates"("quoteId");
CREATE INDEX "material_estimates_projectId_createdAt_idx" ON "material_estimates"("projectId", "createdAt");
