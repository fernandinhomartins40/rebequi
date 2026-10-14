CREATE TABLE external_sync_receipts (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  result JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX external_sync_receipts_source_kind_externalId_idx ON external_sync_receipts(source, kind, "externalId");
