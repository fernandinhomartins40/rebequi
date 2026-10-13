-- AlterTable
ALTER TABLE "sale_return_items" ADD COLUMN     "physicalOrigin" TEXT;
ALTER TABLE "sale_return_items" ADD CONSTRAINT sale_return_physical_origin_bounds CHECK ("physicalOrigin" IS NULL OR "physicalOrigin" IN ('NOT_RECEIVED','RECEIVED_FROM_CUSTOMER'));
