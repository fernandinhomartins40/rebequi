CREATE TYPE "PromotionTheme" AS ENUM ('GOLD', 'BLUE', 'GREEN', 'RED', 'SLATE');
CREATE TYPE "PromotionKind" AS ENUM ('COLLECTION', 'SINGLE_PRODUCT');

CREATE TABLE "promotions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "kind" "PromotionKind" NOT NULL DEFAULT 'COLLECTION',
  "eyebrow" TEXT,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT,
  "badgeText" TEXT,
  "ctaLabel" TEXT,
  "disclaimer" TEXT,
  "themeTone" "PromotionTheme" NOT NULL DEFAULT 'GOLD',
  "imageUrl" TEXT NOT NULL,
  "imageAlt" TEXT,
  "imageStorageKey" TEXT,
  "imageFilename" TEXT,
  "imageMimeType" TEXT,
  "imageSize" INTEGER,
  "imageWidth" INTEGER,
  "imageHeight" INTEGER,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotion_products" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotion_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotions_slug_key" ON "promotions"("slug");
CREATE INDEX "promotions_slug_idx" ON "promotions"("slug");
CREATE INDEX "promotions_kind_idx" ON "promotions"("kind");
CREATE INDEX "promotions_themeTone_idx" ON "promotions"("themeTone");
CREATE INDEX "promotions_sortOrder_idx" ON "promotions"("sortOrder");
CREATE INDEX "promotions_isActive_idx" ON "promotions"("isActive");
CREATE INDEX "promotions_startsAt_idx" ON "promotions"("startsAt");
CREATE INDEX "promotions_expiresAt_idx" ON "promotions"("expiresAt");
CREATE INDEX "promotions_deletedAt_idx" ON "promotions"("deletedAt");

CREATE UNIQUE INDEX "promotion_products_promotionId_productId_key"
  ON "promotion_products"("promotionId", "productId");
CREATE INDEX "promotion_products_promotionId_order_idx"
  ON "promotion_products"("promotionId", "order");
CREATE INDEX "promotion_products_productId_idx"
  ON "promotion_products"("productId");

ALTER TABLE "promotion_products"
  ADD CONSTRAINT "promotion_products_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "promotions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promotion_products"
  ADD CONSTRAINT "promotion_products_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
