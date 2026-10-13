-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "commercialCreationFingerprint" TEXT,
ADD COLUMN     "commercialCreationKey" TEXT,
ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "quote_requests_commercialCreationKey_key" ON "quote_requests"("commercialCreationKey");

ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_commercial_creation_complete" CHECK (
  ("commercialCreationKey" IS NULL AND "commercialCreationFingerprint" IS NULL AND "createdById" IS NULL)
  OR ("commercialCreationKey" IS NOT NULL AND "commercialCreationFingerprint" IS NOT NULL AND "createdById" IS NOT NULL)
);

CREATE FUNCTION guard_commercial_quote_creation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."commercialCreationKey" IS DISTINCT FROM NEW."commercialCreationKey"
    OR OLD."commercialCreationFingerprint" IS DISTINCT FROM NEW."commercialCreationFingerprint"
    OR OLD."createdById" IS DISTINCT FROM NEW."createdById" THEN
    RAISE EXCEPTION 'Commercial quote creation identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "quote_commercial_creation_immutable" BEFORE UPDATE ON "quote_requests"
FOR EACH ROW EXECUTE FUNCTION guard_commercial_quote_creation();
