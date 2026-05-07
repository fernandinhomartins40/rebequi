CREATE TYPE "OrderStatus" AS ENUM ('PENDING_WHATSAPP', 'WHATSAPP_REDIRECTED', 'IN_RECOVERY', 'COMPLETED', 'CANCELED');

CREATE TABLE "customer_orders" (
  "id" TEXT NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_WHATSAPP',
  "source" TEXT NOT NULL DEFAULT 'public_cart',
  "customerNameSnapshot" TEXT NOT NULL,
  "customerWhatsapp" TEXT NOT NULL,
  "customerNote" TEXT,
  "internalNotes" TEXT,
  "whatsappUrl" TEXT,
  "whatsappMessage" TEXT,
  "whatsappRedirectedAt" TIMESTAMP(3),
  "recoveryStartedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_order_items" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "productSlugSnapshot" TEXT NOT NULL,
  "productImageUrlSnapshot" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "originalPrice" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_orders_referenceCode_key" ON "customer_orders"("referenceCode");
CREATE INDEX "customer_orders_referenceCode_idx" ON "customer_orders"("referenceCode");
CREATE INDEX "customer_orders_userId_idx" ON "customer_orders"("userId");
CREATE INDEX "customer_orders_status_idx" ON "customer_orders"("status");
CREATE INDEX "customer_orders_customerWhatsapp_idx" ON "customer_orders"("customerWhatsapp");
CREATE INDEX "customer_orders_whatsappRedirectedAt_idx" ON "customer_orders"("whatsappRedirectedAt");
CREATE INDEX "customer_order_items_orderId_idx" ON "customer_order_items"("orderId");
CREATE INDEX "customer_order_items_productId_idx" ON "customer_order_items"("productId");

ALTER TABLE "customer_orders"
ADD CONSTRAINT "customer_orders_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_order_items"
ADD CONSTRAINT "customer_order_items_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_order_items"
ADD CONSTRAINT "customer_order_items_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
