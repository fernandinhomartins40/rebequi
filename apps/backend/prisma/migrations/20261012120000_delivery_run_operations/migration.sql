-- AlterTable
ALTER TABLE "delivery_runs" ADD COLUMN     "departedAt" TIMESTAMP(3),
ADD COLUMN     "loadSnapshot" JSONB,
ADD COLUMN     "loadedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "delivery_run_items" (
    "id" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "fulfillmentItemId" TEXT NOT NULL,
    "planned" INTEGER NOT NULL,
    "loaded" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "returnedToWarehouse" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_run_items_stopId_fulfillmentItemId_key" ON "delivery_run_items"("stopId", "fulfillmentItemId");

-- AddForeignKey
ALTER TABLE "delivery_run_items" ADD CONSTRAINT "delivery_run_items_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "delivery_run_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_run_items" ADD CONSTRAINT "delivery_run_items_fulfillmentItemId_fkey" FOREIGN KEY ("fulfillmentItemId") REFERENCES "fulfillment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the exact allocations already captured by prior planning snapshots.
INSERT INTO delivery_run_items (id,"stopId","fulfillmentItemId",planned,loaded,delivered,"returnedToWarehouse")
SELECT 'legacy_run_item_' || md5(s.id || (material->>'id')),s.id,material->>'id',(material->>'quantity')::INTEGER,0,0,0
FROM delivery_run_stops s CROSS JOIN LATERAL jsonb_array_elements(s.snapshot->'items') material
JOIN fulfillment_items item ON item.id=material->>'id' AND item."fulfillmentId"=s."fulfillmentId"
WHERE (material->>'quantity')::INTEGER>0;

ALTER TABLE delivery_run_items ADD CONSTRAINT run_item_bounds CHECK (planned>0 AND loaded BETWEEN 0 AND planned AND delivered>=0 AND "returnedToWarehouse">=0 AND delivered+"returnedToWarehouse"<=loaded);
ALTER TABLE delivery_runs DROP CONSTRAINT delivery_run_state_bounds;
ALTER TABLE delivery_runs ADD CONSTRAINT delivery_run_state_bounds CHECK (
 version>=1 AND ((status IN ('PLANNED','CANCELED') AND "loadSnapshot" IS NULL AND "loadedAt" IS NULL AND "departedAt" IS NULL)
 OR (status='LOADED' AND "loadSnapshot" IS NOT NULL AND "loadedAt" IS NOT NULL AND "departedAt" IS NULL)
 OR (status IN ('IN_TRANSIT','CLOSED') AND "loadSnapshot" IS NOT NULL AND "loadedAt" IS NOT NULL AND "departedAt" IS NOT NULL)));
CREATE FUNCTION rebequi_guard_run_item_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Delivery allocations cannot be deleted'; END IF;
 IF NEW."stopId" IS DISTINCT FROM OLD."stopId" OR NEW."fulfillmentItemId" IS DISTINCT FROM OLD."fulfillmentItemId" OR NEW.planned IS DISTINCT FROM OLD.planned THEN
  RAISE EXCEPTION 'Delivery allocations cannot be rewritten';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER run_item_allocation_guard BEFORE UPDATE OR DELETE ON delivery_run_items FOR EACH ROW EXECUTE FUNCTION rebequi_guard_run_item_allocation();

CREATE OR REPLACE FUNCTION rebequi_guard_run_stop_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Delivery history cannot be deleted'; END IF;
 IF NEW."runId" IS DISTINCT FROM OLD."runId" OR NEW."fulfillmentId" IS DISTINCT FROM OLD."fulfillmentId" OR NEW.position IS DISTINCT FROM OLD.position OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW."loadKg" IS DISTINCT FROM OLD."loadKg" OR NEW."volumeM3" IS DISTINCT FROM OLD."volumeM3" OR (NOT OLD.active AND NEW.active) THEN
  RAISE EXCEPTION 'Delivery stop snapshots cannot be rewritten';
 END IF;
 IF OLD.active AND NOT NEW.active AND NOT EXISTS(SELECT 1 FROM delivery_runs WHERE id=NEW."runId" AND status IN ('CANCELED','CLOSED')) THEN
  RAISE EXCEPTION 'Close or cancel the plan before releasing a stop';
 END IF;
 RETURN NEW;
END; $$;
