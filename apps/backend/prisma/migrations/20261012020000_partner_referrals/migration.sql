CREATE TABLE "partner_referrals" (
 "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "partnerId" TEXT,
 "codeSnapshot" TEXT NOT NULL, "consentVersion" TEXT NOT NULL,
 "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "partner_referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_referrals_orderId_key" ON "partner_referrals"("orderId");
CREATE INDEX "partner_referrals_partnerId_consentedAt_idx" ON "partner_referrals"("partnerId", "consentedAt");
ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
