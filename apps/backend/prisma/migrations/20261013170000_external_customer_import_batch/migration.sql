CREATE TABLE "external_customer_import_batches" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "rows" JSONB NOT NULL,
  "preview" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_customer_import_batches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "external_customer_import_batches_requestKey_key"
ON "external_customer_import_batches"("requestKey");
CREATE INDEX "external_customer_import_batches_source_createdAt_idx"
ON "external_customer_import_batches"("source", "createdAt");

CREATE FUNCTION guard_external_customer_import_batch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'External customer import batches are immutable';
END;
$$;
CREATE TRIGGER "external_customer_import_batch_immutable" BEFORE UPDATE OR DELETE
ON "external_customer_import_batches" FOR EACH ROW EXECUTE FUNCTION guard_external_customer_import_batch();
