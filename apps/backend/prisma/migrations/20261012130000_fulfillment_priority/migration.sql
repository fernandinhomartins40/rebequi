-- AlterTable
ALTER TABLE "fulfillments" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "fulfillments_priority_createdAt_id_idx" ON "fulfillments"("priority" DESC, "createdAt", "id");

ALTER TABLE fulfillments ADD CONSTRAINT fulfillment_priority_bounds CHECK (priority BETWEEN 0 AND 2);