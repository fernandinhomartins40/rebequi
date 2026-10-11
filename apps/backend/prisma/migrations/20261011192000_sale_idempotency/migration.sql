ALTER TABLE "sales" ADD COLUMN "idempotencyKey" TEXT, ADD COLUMN "requestFingerprint" TEXT;
CREATE UNIQUE INDEX "sales_idempotencyKey_key" ON "sales"("idempotencyKey");
