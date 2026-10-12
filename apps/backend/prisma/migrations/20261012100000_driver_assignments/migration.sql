-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';

-- AlterTable
ALTER TABLE "fulfillments" ADD COLUMN     "driverId" TEXT;

-- CreateIndex
CREATE INDEX "fulfillments_driverId_status_createdAt_idx" ON "fulfillments"("driverId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Older application images must also remove the assignment before changing to pickup.
ALTER TABLE fulfillments ADD CONSTRAINT fulfillment_driver_delivery_only CHECK ("driverId" IS NULL OR mode = 'DELIVERY');
