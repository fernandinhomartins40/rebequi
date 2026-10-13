ALTER TABLE sales ADD COLUMN "creditedSellerId" TEXT;
CREATE INDEX sales_credited_seller_paid_at_idx ON sales ("creditedSellerId", "paidAt");
CREATE FUNCTION rebequi_guard_sale_credited_seller() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."creditedSellerId" IS DISTINCT FROM OLD."creditedSellerId" THEN
    RAISE EXCEPTION 'Sale credited seller is immutable';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER sale_credited_seller_guard BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION rebequi_guard_sale_credited_seller();
