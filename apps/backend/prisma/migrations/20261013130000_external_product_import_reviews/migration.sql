CREATE TABLE external_product_import_reviews (
  id TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL REFERENCES external_product_import_batches(id) ON DELETE RESTRICT,
  "requestKey" TEXT NOT NULL UNIQUE,
  "actorId" TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  summary JSONB NOT NULL,
  "changedRows" INTEGER[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX external_product_import_review_history ON external_product_import_reviews ("batchId", "createdAt");
CREATE FUNCTION rebequi_guard_external_product_import_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'External product import review history is immutable';
END; $$;
CREATE TRIGGER external_product_import_review_guard BEFORE UPDATE OR DELETE ON external_product_import_reviews
FOR EACH ROW EXECUTE FUNCTION rebequi_guard_external_product_import_review();
