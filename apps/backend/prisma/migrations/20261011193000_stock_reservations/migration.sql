ALTER TABLE "products" ADD COLUMN "reservedStock" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "stock_reservations" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_reservations_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "stock_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "stock_reservations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "stock_reservations_orderId_productId_key" ON "stock_reservations"("orderId", "productId");
CREATE INDEX "stock_reservations_status_expiresAt_idx" ON "stock_reservations"("status", "expiresAt");
-- Historical negative balances, if any, remain visible; only new writes are constrained.
ALTER TABLE "products" ADD CONSTRAINT "products_available_stock_check" CHECK ("reservedStock" >= 0 AND "stock" >= "reservedStock") NOT VALID;
