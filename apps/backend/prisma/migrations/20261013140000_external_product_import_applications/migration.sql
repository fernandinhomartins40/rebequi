CREATE TABLE external_product_import_applications (
  id TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL UNIQUE REFERENCES external_product_import_batches(id) ON DELETE RESTRICT,
  "reviewId" TEXT NOT NULL REFERENCES external_product_import_reviews(id) ON DELETE RESTRICT,
  "requestKey" TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  products JSONB NOT NULL,
  "skippedRows" INTEGER[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE FUNCTION rebequi_guard_external_product_import_application() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'External product import application history is immutable';
END; $$;
CREATE TRIGGER external_product_import_application_guard BEFORE UPDATE OR DELETE ON external_product_import_applications
FOR EACH ROW EXECUTE FUNCTION rebequi_guard_external_product_import_application();
