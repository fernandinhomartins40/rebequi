CREATE TABLE "partner_portfolio_images" (
 "id" TEXT NOT NULL, "partnerId" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "url" TEXT NOT NULL,
 "caption" TEXT NOT NULL DEFAULT '', "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 256000),
 "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "requestKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "partner_portfolio_images_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_portfolio_images_storageKey_key" ON "partner_portfolio_images"("storageKey");
CREATE UNIQUE INDEX "partner_portfolio_images_requestKey_key" ON "partner_portfolio_images"("requestKey");
CREATE INDEX "partner_portfolio_images_partnerId_createdAt_idx" ON "partner_portfolio_images"("partnerId", "createdAt");
ALTER TABLE "partner_portfolio_images" ADD CONSTRAINT "partner_portfolio_images_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
