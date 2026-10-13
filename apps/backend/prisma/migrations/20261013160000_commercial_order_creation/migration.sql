ALTER TABLE "customer_orders" ADD COLUMN "commercialCreationKey" TEXT,
ADD COLUMN "commercialCreationFingerprint" TEXT;

CREATE UNIQUE INDEX "customer_orders_commercialCreationKey_key"
ON "customer_orders"("commercialCreationKey");

ALTER TABLE "customer_orders" ADD CONSTRAINT "order_commercial_creation_complete" CHECK (
  ("commercialCreationKey" IS NULL AND "commercialCreationFingerprint" IS NULL)
  OR ("commercialCreationKey" IS NOT NULL AND "commercialCreationFingerprint" IS NOT NULL)
);

CREATE FUNCTION guard_commercial_order_creation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."commercialCreationKey" IS DISTINCT FROM NEW."commercialCreationKey"
    OR OLD."commercialCreationFingerprint" IS DISTINCT FROM NEW."commercialCreationFingerprint" THEN
    RAISE EXCEPTION 'Commercial order creation identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "order_commercial_creation_immutable" BEFORE UPDATE ON "customer_orders"
FOR EACH ROW EXECUTE FUNCTION guard_commercial_order_creation();
