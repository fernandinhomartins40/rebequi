-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "accountingVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "returnVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "statusVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "partner_referrals" ADD COLUMN     "ruleId" TEXT;

-- CreateTable
CREATE TABLE "partner_program_rules" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "commissionBasisPoints" INTEGER NOT NULL,
    "pointsPerReal" INTEGER NOT NULL,
    "maturityDays" INTEGER NOT NULL,
    "terms" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_program_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_program_acceptances" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_program_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_ledger_entries" (
    "payoutReferenceKey" TEXT,
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "saleId" TEXT,
    "ruleId" TEXT,
    "eventKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "commissionCents" BIGINT NOT NULL DEFAULT 0,
    "points" BIGINT NOT NULL DEFAULT 0,
    "basisCents" BIGINT NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "refundCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_items" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "restock" BOOLEAN NOT NULL,
    "refundCents" BIGINT NOT NULL,

    CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_program_rules_version_key" ON "partner_program_rules"("version");

-- CreateIndex
CREATE UNIQUE INDEX "partner_program_acceptances_partnerId_ruleId_key" ON "partner_program_acceptances"("partnerId", "ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_ledger_entries_payoutReferenceKey_key" ON "partner_ledger_entries"("payoutReferenceKey");

-- CreateIndex
CREATE UNIQUE INDEX "partner_ledger_entries_eventKey_key" ON "partner_ledger_entries"("eventKey");

-- CreateIndex
CREATE INDEX "partner_ledger_entries_partnerId_availableAt_idx" ON "partner_ledger_entries"("partnerId", "availableAt");

-- CreateIndex
CREATE INDEX "partner_ledger_entries_saleId_kind_idx" ON "partner_ledger_entries"("saleId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_requestKey_key" ON "sale_returns"("requestKey");

-- CreateIndex
CREATE INDEX "sale_returns_saleId_createdAt_idx" ON "sale_returns"("saleId", "createdAt");

-- CreateIndex
CREATE INDEX "sale_return_items_saleItemId_idx" ON "sale_return_items"("saleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_return_items_returnId_saleItemId_key" ON "sale_return_items"("returnId", "saleItemId");

-- AddForeignKey
ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "partner_program_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_program_acceptances" ADD CONSTRAINT "partner_program_acceptances_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_program_acceptances" ADD CONSTRAINT "partner_program_acceptances_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "partner_program_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_ledger_entries" ADD CONSTRAINT "partner_ledger_entries_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_ledger_entries" ADD CONSTRAINT "partner_ledger_entries_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_ledger_entries" ADD CONSTRAINT "partner_ledger_entries_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "partner_program_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "sale_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
