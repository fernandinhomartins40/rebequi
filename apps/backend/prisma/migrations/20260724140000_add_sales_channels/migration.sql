-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MANUAL');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ListingSyncStatus" AS ENUM ('DRAFT', 'SYNCED', 'OUT_OF_SYNC', 'ERROR');

-- CreateTable
CREATE TABLE "channels" (
  "id" TEXT NOT NULL,
  "type" "ChannelType" NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ChannelStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "credentials" TEXT,
  "externalId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_listings" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "externalListingId" TEXT,
  "externalUrl" TEXT,
  "syncStatus" "ListingSyncStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedPrice" DOUBLE PRECISION,
  "publishedStock" INTEGER,
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "channel_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channels_type_idx" ON "channels"("type");
CREATE INDEX "channels_status_idx" ON "channels"("status");
CREATE INDEX "channels_isActive_idx" ON "channels"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "channel_listings_channelId_productId_key" ON "channel_listings"("channelId", "productId");
CREATE INDEX "channel_listings_channelId_syncStatus_idx" ON "channel_listings"("channelId", "syncStatus");
CREATE INDEX "channel_listings_productId_idx" ON "channel_listings"("productId");

-- AddForeignKey
ALTER TABLE "channel_listings"
ADD CONSTRAINT "channel_listings_channelId_fkey"
FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "channel_listings"
ADD CONSTRAINT "channel_listings_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
