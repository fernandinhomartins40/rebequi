-- CreateTable
CREATE TABLE "fulfillments" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'UNDEFINED',
    "status" TEXT NOT NULL DEFAULT 'AWAITING_DETAILS',
    "version" INTEGER NOT NULL DEFAULT 1,
    "address" TEXT,
    "region" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfillments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_items" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "picked" INTEGER NOT NULL DEFAULT 0,
    "checked" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,

    CONSTRAINT "fulfillment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_events" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fulfillments_saleId_key" ON "fulfillments"("saleId");

-- CreateIndex
CREATE INDEX "fulfillments_status_createdAt_idx" ON "fulfillments"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_items_fulfillmentId_saleItemId_key" ON "fulfillment_items"("fulfillmentId", "saleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_events_requestKey_key" ON "fulfillment_events"("requestKey");

-- CreateIndex
CREATE INDEX "fulfillment_events_fulfillmentId_createdAt_idx" ON "fulfillment_events"("fulfillmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_events_fulfillmentId_version_key" ON "fulfillment_events"("fulfillmentId", "version");

-- AddForeignKey
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "fulfillments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "fulfillments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER fulfillment_history_immutable BEFORE UPDATE OR DELETE ON fulfillment_events FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();
ALTER TABLE fulfillment_items ADD CONSTRAINT fulfillment_quantity_bounds CHECK (quantity > 0 AND picked BETWEEN 0 AND quantity AND checked BETWEEN 0 AND picked AND delivered BETWEEN 0 AND checked);
