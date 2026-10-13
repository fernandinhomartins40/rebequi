CREATE TABLE seller_commission_drafts (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  "requestKey" TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL,
  "effectiveMonth" TEXT NOT NULL,
  basis TEXT NOT NULL,
  "eligibleRole" TEXT NOT NULL,
  "basisPoints" INTEGER NOT NULL,
  "maturityDays" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  reason TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT seller_commission_draft_bounds CHECK (
    version > 0 AND "effectiveMonth" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'
    AND basis = 'NET_PAID_SALE_AFTER_RETURNS' AND "eligibleRole" = 'SALES'
    AND "basisPoints" BETWEEN 0 AND 10000 AND "maturityDays" BETWEEN 0 AND 365
    AND length(reason) BETWEEN 3 AND 500
  )
);
CREATE FUNCTION rebequi_guard_seller_commission_draft() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Seller commission draft history is immutable';
END; $$;
CREATE TRIGGER seller_commission_draft_guard BEFORE UPDATE OR DELETE ON seller_commission_drafts
FOR EACH ROW EXECUTE FUNCTION rebequi_guard_seller_commission_draft();
