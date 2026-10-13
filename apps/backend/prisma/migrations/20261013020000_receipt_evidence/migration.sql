-- CreateTable
CREATE TABLE "fulfillment_evidence" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_evidence_requestKey_key" ON "fulfillment_evidence"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_evidence_storageKey_key" ON "fulfillment_evidence"("storageKey");

-- CreateIndex
CREATE INDEX "fulfillment_evidence_receiptId_createdAt_idx" ON "fulfillment_evidence"("receiptId", "createdAt");

-- AddForeignKey
ALTER TABLE "fulfillment_evidence" ADD CONSTRAINT "fulfillment_evidence_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "fulfillment_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE fulfillment_evidence ADD CONSTRAINT receipt_evidence_bounds CHECK (
 size BETWEEN 1 AND 256000 AND width=1000 AND height=750
 AND "consentVersion"='receipt-evidence-2026-10'
 AND "storageKey" ~ '^receipts/[0-9]{4}/[0-9]{2}/[0-9]+-[a-f0-9]{12}\.webp$'
);
CREATE TRIGGER receipt_evidence_immutable BEFORE UPDATE OR DELETE ON fulfillment_evidence FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();
CREATE FUNCTION rebequi_guard_receipt_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('rebequi-receipt-evidence-quota'));
 IF NOT EXISTS (SELECT 1 FROM fulfillment_events WHERE id=NEW."receiptId" AND kind IN ('PICKUP_RECEIVED','DELIVERY_RECEIVED')) THEN
  RAISE EXCEPTION 'Evidence must refer to a recorded physical receipt';
 END IF;
 IF (SELECT count(*) FROM fulfillment_evidence WHERE "receiptId"=NEW."receiptId")>=3 THEN
  RAISE EXCEPTION 'Receipt evidence count exceeded';
 END IF;
 IF (SELECT COALESCE(sum(size),0) FROM fulfillment_evidence)+NEW.size>268435456 THEN
  RAISE EXCEPTION 'Receipt evidence storage quota exceeded';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER receipt_evidence_insert_guard BEFORE INSERT ON fulfillment_evidence FOR EACH ROW EXECUTE FUNCTION rebequi_guard_receipt_evidence();

