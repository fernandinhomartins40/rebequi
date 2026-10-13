CREATE TABLE commercial_assignment_reads (
  id TEXT PRIMARY KEY,
  "assignmentId" TEXT NOT NULL REFERENCES commercial_assignment_audits(id) ON DELETE RESTRICT,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT commercial_assignment_read_unique UNIQUE ("assignmentId", "userId")
);
CREATE INDEX commercial_assignment_read_user ON commercial_assignment_reads ("userId", "readAt");
CREATE INDEX commercial_assignment_recipient_created ON commercial_assignment_audits ("nextSellerId", "createdAt" DESC);
CREATE FUNCTION rebequi_guard_commercial_assignment_read() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Commercial notification read receipt is immutable';
END; $$;
CREATE TRIGGER commercial_assignment_read_guard BEFORE UPDATE OR DELETE ON commercial_assignment_reads
FOR EACH ROW EXECUTE FUNCTION rebequi_guard_commercial_assignment_read();
