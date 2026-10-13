CREATE TABLE external_product_links (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  "requestKey" TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revokedReason" TEXT,
  CONSTRAINT external_product_link_bounds CHECK (
    length(source) BETWEEN 1 AND 120 AND source ~ '^[A-Za-z0-9._:-]+$'
    AND length("externalId") BETWEEN 1 AND 120 AND "externalId" ~ '^[A-Za-z0-9._:-]+$'
    AND ("revokedAt" IS NULL AND "revokedById" IS NULL AND "revokedReason" IS NULL
      OR "revokedAt" IS NOT NULL AND "revokedById" IS NOT NULL AND length("revokedReason") BETWEEN 3 AND 300)
  )
);
CREATE UNIQUE INDEX external_product_link_active_id ON external_product_links (source, "externalId") WHERE "revokedAt" IS NULL;
CREATE UNIQUE INDEX external_product_link_active_product ON external_product_links (source, "productId") WHERE "revokedAt" IS NULL;
CREATE INDEX external_product_link_product ON external_product_links ("productId");
CREATE INDEX external_product_link_history ON external_product_links (source, "externalId", "createdAt");
CREATE FUNCTION rebequi_guard_external_product_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'External product link history is immutable'; END IF;
  IF OLD."revokedAt" IS NOT NULL OR NEW.id <> OLD.id OR NEW.source <> OLD.source
    OR NEW."externalId" <> OLD."externalId" OR NEW."productId" <> OLD."productId"
    OR NEW."requestKey" <> OLD."requestKey" OR NEW.fingerprint <> OLD.fingerprint
    OR NEW."actorId" <> OLD."actorId" OR NEW."createdAt" <> OLD."createdAt"
    OR NEW."revokedAt" IS NULL THEN
    RAISE EXCEPTION 'External product link may only be revoked once';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER external_product_link_guard BEFORE UPDATE OR DELETE ON external_product_links
FOR EACH ROW EXECUTE FUNCTION rebequi_guard_external_product_link();
