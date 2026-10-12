-- AlterTable
ALTER TABLE "users" ADD COLUMN     "assignedSellerId" TEXT,
ADD COLUMN     "assignmentVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "lead_captures" ADD COLUMN     "assignedSellerId" TEXT,
ADD COLUMN     "assignmentVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "assignedSellerId" TEXT,
ADD COLUMN     "assignmentVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "customer_orders" ADD COLUMN     "assignedSellerId" TEXT,
ADD COLUMN     "assignmentVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "assignedSellerId" TEXT,
ADD COLUMN     "assignmentVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "commercial_assignment_audits" (
    "id" TEXT NOT NULL,
    "resourceKind" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "previousSellerId" TEXT,
    "nextSellerId" TEXT,
    "version" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_assignment_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commercial_assignment_audits_resourceKind_resourceId_create_idx" ON "commercial_assignment_audits"("resourceKind", "resourceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_assignment_audits_resourceKind_resourceId_versio_key" ON "commercial_assignment_audits"("resourceKind", "resourceId", "version");

-- CreateIndex
CREATE INDEX "users_assignedSellerId_role_idx" ON "users"("assignedSellerId", "role");

-- CreateIndex
CREATE INDEX "lead_captures_assignedSellerId_createdAt_idx" ON "lead_captures"("assignedSellerId", "createdAt");

-- CreateIndex
CREATE INDEX "quote_requests_assignedSellerId_createdAt_idx" ON "quote_requests"("assignedSellerId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_orders_assignedSellerId_createdAt_idx" ON "customer_orders"("assignedSellerId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_assignedSellerId_fkey" FOREIGN KEY ("assignedSellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_captures" ADD CONSTRAINT "lead_captures_assignedSellerId_fkey" FOREIGN KEY ("assignedSellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_assignedSellerId_fkey" FOREIGN KEY ("assignedSellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_assignedSellerId_fkey" FOREIGN KEY ("assignedSellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_assignedSellerId_fkey" FOREIGN KEY ("assignedSellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TRIGGER commercial_assignment_history_immutable BEFORE UPDATE OR DELETE ON commercial_assignment_audits FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();
