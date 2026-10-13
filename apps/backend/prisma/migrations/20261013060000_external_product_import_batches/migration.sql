CREATE TABLE external_product_import_batches (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  "requestKey" TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  rows JSONB NOT NULL,
  preview JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT external_product_import_batch_bounds CHECK (
    length(source) BETWEEN 1 AND 120 AND source ~ '^[A-Za-z0-9._:-]+$'
    AND jsonb_typeof(rows) = 'array' AND jsonb_array_length(rows) BETWEEN 1 AND 100
    AND jsonb_typeof(preview) = 'object'
  )
);
CREATE INDEX external_product_import_batch_source_created ON external_product_import_batches (source, "createdAt" DESC);
CREATE FUNCTION rebequi_guard_external_product_import_batch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'External product import review is immutable';
END; $$;
CREATE TRIGGER external_product_import_batch_guard BEFORE UPDATE OR DELETE ON external_product_import_batches
FOR EACH ROW EXECUTE FUNCTION rebequi_guard_external_product_import_batch();
