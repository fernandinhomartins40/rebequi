ALTER TABLE "partner_program_rules" ADD CONSTRAINT "partner_program_bounds" CHECK ("commissionBasisPoints" BETWEEN 0 AND 10000 AND "pointsPerReal" BETWEEN 0 AND 1000 AND "maturityDays" BETWEEN 0 AND 365);
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_return_refund_nonnegative" CHECK ("refundCents" >= 0);
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_item_bounds" CHECK ("quantity" BETWEEN 1 AND 9999 AND "refundCents" >= 0);

-- Financial values and accepted policy versions cannot be edited or deleted.
-- FK anonymization preserves existing account/sale cleanup without losing amounts.
CREATE FUNCTION rebequi_guard_partner_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Partner ledger is append-only'; END IF;
 IF (to_jsonb(NEW) - 'partnerId' - 'saleId') IS DISTINCT FROM (to_jsonb(OLD) - 'partnerId' - 'saleId')
    OR (NEW."partnerId" IS DISTINCT FROM OLD."partnerId" AND NEW."partnerId" IS NOT NULL)
    OR (NEW."saleId" IS DISTINCT FROM OLD."saleId" AND NEW."saleId" IS NOT NULL) THEN
   RAISE EXCEPTION 'Partner ledger is append-only';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER partner_ledger_append_only BEFORE UPDATE OR DELETE ON "partner_ledger_entries" FOR EACH ROW EXECUTE FUNCTION rebequi_guard_partner_ledger();

CREATE FUNCTION rebequi_guard_financial_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Financial snapshot is immutable';
END;
$$;
CREATE TRIGGER partner_rule_immutable BEFORE UPDATE OR DELETE ON "partner_program_rules" FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();
CREATE TRIGGER sale_return_immutable BEFORE UPDATE OR DELETE ON "sale_returns" FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();
CREATE TRIGGER sale_return_item_immutable BEFORE UPDATE OR DELETE ON "sale_return_items" FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();

-- An older image may be used by deploy rollback. It must never double-restock
-- partial returns or ignore benefit accounting on existing financial orders.
CREATE FUNCTION rebequi_guard_sale_accounting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE financial_order boolean;
BEGIN
 SELECT EXISTS (SELECT 1 FROM partner_referrals WHERE "orderId" = NEW."orderId" AND "ruleId" IS NOT NULL) INTO financial_order;
 IF TG_OP = 'INSERT' THEN
   IF financial_order AND NEW."accountingVersion" < 1 THEN RAISE EXCEPTION 'This order requires the current accounting application'; END IF;
 ELSIF NEW.status IS DISTINCT FROM OLD.status AND
   (financial_order OR EXISTS (SELECT 1 FROM sale_returns WHERE "saleId" = NEW.id) OR EXISTS (SELECT 1 FROM partner_ledger_entries WHERE "saleId" = NEW.id)) THEN
   IF NEW."accountingVersion" < 1 OR NEW."statusVersion" <> OLD."statusVersion" + 1 THEN RAISE EXCEPTION 'This sale requires the current accounting application'; END IF;
   IF NEW.status IN ('CANCELED', 'PENDING_PAYMENT') AND EXISTS (
     SELECT 1 FROM partner_ledger_entries WHERE "saleId" = NEW.id GROUP BY "saleId"
     HAVING SUM("commissionCents") <> 0 OR SUM(points) <> 0
   ) THEN RAISE EXCEPTION 'Sale benefits must be reversed or held in the same transaction'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER sale_accounting_compatibility BEFORE INSERT OR UPDATE ON "sales" FOR EACH ROW EXECUTE FUNCTION rebequi_guard_sale_accounting();
