CREATE TYPE "PromotionOfferPricingMode" AS ENUM (
  'FIXED_PRICE',
  'PERCENTAGE_DISCOUNT',
  'BUY_X_PAY_Y',
  'BULK_PERCENTAGE'
);

ALTER TABLE "promotions"
ADD COLUMN "offerPricingMode" "PromotionOfferPricingMode",
ADD COLUMN "offerPromotionalPrice" DOUBLE PRECISION,
ADD COLUMN "offerDiscountPercentage" DOUBLE PRECISION,
ADD COLUMN "offerMinimumQuantity" INTEGER,
ADD COLUMN "offerPayQuantity" INTEGER;

CREATE INDEX "promotions_offerPricingMode_idx" ON "promotions"("offerPricingMode");
