-- CreateTable
CREATE TABLE "delivery_runs" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_run_stops" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "loadKg" DECIMAL(12,3),
    "volumeM3" DECIMAL(12,3),
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "delivery_run_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_run_events" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_run_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_runs_requestKey_key" ON "delivery_runs"("requestKey");

-- CreateIndex
CREATE INDEX "delivery_runs_status_scheduledAt_idx" ON "delivery_runs"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "delivery_runs_driverId_status_scheduledAt_idx" ON "delivery_runs"("driverId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "delivery_run_stops_fulfillmentId_active_idx" ON "delivery_run_stops"("fulfillmentId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_run_stops_runId_position_key" ON "delivery_run_stops"("runId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_run_stops_runId_fulfillmentId_key" ON "delivery_run_stops"("runId", "fulfillmentId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_run_events_requestKey_key" ON "delivery_run_events"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_run_events_runId_version_key" ON "delivery_run_events"("runId", "version");

-- AddForeignKey
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "logistics_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_run_stops" ADD CONSTRAINT "delivery_run_stops_runId_fkey" FOREIGN KEY ("runId") REFERENCES "delivery_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_run_stops" ADD CONSTRAINT "delivery_run_stops_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "fulfillments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_run_events" ADD CONSTRAINT "delivery_run_events_runId_fkey" FOREIGN KEY ("runId") REFERENCES "delivery_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX delivery_stop_one_active_run ON delivery_run_stops("fulfillmentId") WHERE active;
ALTER TABLE delivery_runs ADD CONSTRAINT delivery_run_state_bounds CHECK (status IN ('PLANNED','CANCELED') AND version >= 1);
ALTER TABLE delivery_run_stops ADD CONSTRAINT delivery_stop_bounds CHECK (position BETWEEN 1 AND 20 AND ("loadKg" IS NULL OR "loadKg">0) AND ("volumeM3" IS NULL OR "volumeM3">0));
CREATE TRIGGER delivery_run_event_immutable BEFORE UPDATE OR DELETE ON delivery_run_events FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();

CREATE FUNCTION rebequi_guard_planned_fulfillment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE planned_driver TEXT;
BEGIN
 SELECT r."driverId" INTO planned_driver FROM delivery_run_stops s JOIN delivery_runs r ON r.id=s."runId" WHERE s."fulfillmentId"=NEW.id AND s.active;
 IF planned_driver IS NOT NULL AND (NEW.mode IS DISTINCT FROM OLD.mode OR NEW.address IS DISTINCT FROM OLD.address OR NEW.region IS DISTINCT FROM OLD.region OR NEW."scheduledAt" IS DISTINCT FROM OLD."scheduledAt" OR NEW.status IS DISTINCT FROM OLD.status OR NEW."driverId" IS DISTINCT FROM planned_driver) THEN
  RAISE EXCEPTION 'Cancel the delivery plan before changing the fulfillment';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER planned_fulfillment_guard BEFORE UPDATE ON fulfillments FOR EACH ROW EXECUTE FUNCTION rebequi_guard_planned_fulfillment();

CREATE FUNCTION rebequi_guard_planned_material() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM delivery_run_stops WHERE "fulfillmentId"=OLD."fulfillmentId" AND active) AND (NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.picked IS DISTINCT FROM OLD.picked OR NEW.checked IS DISTINCT FROM OLD.checked OR NEW.delivered IS DISTINCT FROM OLD.delivered OR NEW.location IS DISTINCT FROM OLD.location) THEN
  RAISE EXCEPTION 'Cancel the delivery plan before changing materials';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER planned_material_guard BEFORE UPDATE ON fulfillment_items FOR EACH ROW EXECUTE FUNCTION rebequi_guard_planned_material();

CREATE FUNCTION rebequi_guard_planned_sale() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status<>'PAID' AND EXISTS (SELECT 1 FROM fulfillments f JOIN delivery_run_stops s ON s."fulfillmentId"=f.id WHERE f."saleId"=NEW.id AND s.active) THEN
  RAISE EXCEPTION 'Cancel the delivery plan before changing payment status';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER planned_sale_guard BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION rebequi_guard_planned_sale();

CREATE FUNCTION rebequi_guard_run_stop_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Delivery history cannot be deleted'; END IF;
 IF NEW."runId" IS DISTINCT FROM OLD."runId" OR NEW."fulfillmentId" IS DISTINCT FROM OLD."fulfillmentId" OR NEW.position IS DISTINCT FROM OLD.position OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW."loadKg" IS DISTINCT FROM OLD."loadKg" OR NEW."volumeM3" IS DISTINCT FROM OLD."volumeM3" OR (NOT OLD.active AND NEW.active) THEN
  RAISE EXCEPTION 'Delivery stop snapshots cannot be rewritten';
 END IF;
 IF OLD.active AND NOT NEW.active AND NOT EXISTS(SELECT 1 FROM delivery_runs WHERE id=NEW."runId" AND status='CANCELED') THEN
  RAISE EXCEPTION 'Cancel the plan before releasing a stop';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER run_stop_snapshot_guard BEFORE UPDATE OR DELETE ON delivery_run_stops FOR EACH ROW EXECUTE FUNCTION rebequi_guard_run_stop_snapshot();

CREATE FUNCTION rebequi_guard_run_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Delivery history cannot be deleted'; END IF;
 IF NEW.label IS DISTINCT FROM OLD.label OR NEW."driverId" IS DISTINCT FROM OLD."driverId" OR NEW."vehicleId" IS DISTINCT FROM OLD."vehicleId" OR NEW."scheduledAt" IS DISTINCT FROM OLD."scheduledAt" OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW."requestKey" IS DISTINCT FROM OLD."requestKey" OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint THEN
  RAISE EXCEPTION 'Delivery plan snapshots cannot be rewritten';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER run_snapshot_guard BEFORE UPDATE OR DELETE ON delivery_runs FOR EACH ROW EXECUTE FUNCTION rebequi_guard_run_snapshot();
