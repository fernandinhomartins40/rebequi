ALTER TABLE external_api_clients ADD COLUMN source TEXT;
ALTER TABLE external_api_clients ADD CONSTRAINT external_api_client_source_bounds CHECK (
  source IS NULL OR (length(source) BETWEEN 1 AND 120 AND source ~ '^[A-Za-z0-9._:-]+$')
);
