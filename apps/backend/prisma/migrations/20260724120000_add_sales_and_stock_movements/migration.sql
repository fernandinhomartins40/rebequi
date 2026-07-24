-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'CARD', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PAID', 'PENDING_PAYMENT', 'CANCELED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN');

-- CreateTable
CREATE TABLE "sales" (
  "id" TEXT NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "status" "SaleStatus" NOT NULL DEFAULT 'PAID',
  "paymentMethod" "PaymentMethod" NOT NULL,
  "customerId" TEXT,
  "orderId" TEXT,
  "registeredById" TEXT,
  "customerNameSnapshot" TEXT,
  "customerWhatsapp" TEXT,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "paidAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "productId" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "productSkuSnapshot" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "stockBefore" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "reason" TEXT,
  "saleId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_referenceCode_key" ON "sales"("referenceCode");
CREATE UNIQUE INDEX "sales_orderId_key" ON "sales"("orderId");
CREATE INDEX "sales_referenceCode_idx" ON "sales"("referenceCode");
CREATE INDEX "sales_status_idx" ON "sales"("status");
CREATE INDEX "sales_paymentMethod_idx" ON "sales"("paymentMethod");
CREATE INDEX "sales_customerId_idx" ON "sales"("customerId");
CREATE INDEX "sales_registeredById_idx" ON "sales"("registeredById");
CREATE INDEX "sales_createdAt_idx" ON "sales"("createdAt");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");
CREATE INDEX "stock_movements_type_idx" ON "stock_movements"("type");
CREATE INDEX "stock_movements_saleId_idx" ON "stock_movements"("saleId");
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- AddForeignKey
ALTER TABLE "sales"
ADD CONSTRAINT "sales_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales"
ADD CONSTRAINT "sales_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "customer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales"
ADD CONSTRAINT "sales_registeredById_fkey"
FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items"
ADD CONSTRAINT "sale_items_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sale_items"
ADD CONSTRAINT "sale_items_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
