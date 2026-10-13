CREATE TABLE seller_goal_revisions (
  id TEXT PRIMARY KEY,
  "sellerId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  month TEXT NOT NULL,
  version INTEGER NOT NULL,
  "targetCents" BIGINT NOT NULL,
  "requestKey" TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  reason TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT seller_goal_revision_bounds CHECK (
    month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'
    AND version > 0 AND "targetCents" > 0 AND "targetCents" <= 999999999999
    AND length(reason) BETWEEN 3 AND 500
  ),
  CONSTRAINT seller_goal_revision_version UNIQUE ("sellerId", month, version)
);
CREATE INDEX seller_goal_revision_seller_month ON seller_goal_revisions ("sellerId", month);
CREATE FUNCTION rebequi_guard_seller_goal_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Seller goal revision history is immutable';
END; $$;
CREATE TRIGGER seller_goal_revision_guard BEFORE UPDATE OR DELETE ON seller_goal_revisions
FOR EACH ROW EXECUTE FUNCTION rebequi_guard_seller_goal_revision();
