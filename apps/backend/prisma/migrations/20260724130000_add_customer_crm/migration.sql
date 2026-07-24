-- CreateEnum
CREATE TYPE "CustomerStage" AS ENUM ('NEW', 'QUOTING', 'NEGOTIATING', 'CUSTOMER', 'RECURRING', 'INACTIVE');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "customerStage" "CustomerStage" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "customerStageManual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customerTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "followUpAt" TIMESTAMP(3),
  ADD COLUMN "lastContactedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_customerStage_idx" ON "users"("customerStage");
CREATE INDEX "users_followUpAt_idx" ON "users"("followUpAt");

-- CreateTable
CREATE TABLE "customer_notes" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_notes_customerId_createdAt_idx" ON "customer_notes"("customerId", "createdAt");
CREATE INDEX "customer_notes_authorId_idx" ON "customer_notes"("authorId");

-- AddForeignKey
ALTER TABLE "customer_notes"
ADD CONSTRAINT "customer_notes_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_notes"
ADD CONSTRAINT "customer_notes_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
