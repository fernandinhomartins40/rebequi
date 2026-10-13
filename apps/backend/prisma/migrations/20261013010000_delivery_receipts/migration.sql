-- Keep planned material/configuration immutable except for a receipt supported by
-- an immutable event for the next fulfillment/run version and the exact balances.
CREATE OR REPLACE FUNCTION rebequi_guard_planned_material() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM delivery_run_stops WHERE "fulfillmentId"=OLD."fulfillmentId" AND active)
 AND (NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.picked IS DISTINCT FROM OLD.picked OR NEW.checked IS DISTINCT FROM OLD.checked OR NEW.delivered IS DISTINCT FROM OLD.delivered OR NEW.location IS DISTINCT FROM OLD.location) THEN
  IF NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.picked IS DISTINCT FROM OLD.picked OR NEW.checked IS DISTINCT FROM OLD.checked OR NEW.location IS DISTINCT FROM OLD.location OR NEW.delivered<=OLD.delivered
  OR NOT EXISTS (
   SELECT 1 FROM fulfillments f JOIN fulfillment_events e ON e."fulfillmentId"=f.id AND e.version=f.version+1
   JOIN delivery_run_stops s ON s."fulfillmentId"=f.id AND s.active
   JOIN delivery_runs r ON r.id=s."runId" AND r.status='IN_TRANSIT'
   CROSS JOIN LATERAL jsonb_array_elements(e.details->'items') receipt
   JOIN delivery_run_items i ON i.id=receipt->>'runItemId' AND i."stopId"=s.id AND i."fulfillmentItemId"=OLD.id
   WHERE f.id=OLD."fulfillmentId" AND e.kind='DELIVERY_RECEIVED'
    AND e.details->>'runId'=r.id AND (e.details->>'runVersion')::integer=r.version+1
    AND receipt->>'id'=OLD.id AND (receipt->>'previousReceived')::integer=OLD.delivered
    AND (receipt->>'receivedQuantity')::integer=NEW.delivered
    AND (receipt->>'quantity')::integer=NEW.delivered-OLD.delivered
    AND i.delivered>=(receipt->>'quantity')::integer
  ) THEN RAISE EXCEPTION 'Cancel the delivery plan before changing materials'; END IF;
 END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION rebequi_guard_planned_fulfillment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE planned_driver TEXT;
BEGIN
 SELECT r."driverId" INTO planned_driver FROM delivery_run_stops s JOIN delivery_runs r ON r.id=s."runId" WHERE s."fulfillmentId"=NEW.id AND s.active;
 IF planned_driver IS NOT NULL AND (NEW.mode IS DISTINCT FROM OLD.mode OR NEW.address IS DISTINCT FROM OLD.address OR NEW.region IS DISTINCT FROM OLD.region OR NEW."scheduledAt" IS DISTINCT FROM OLD."scheduledAt" OR NEW.status IS DISTINCT FROM OLD.status OR NEW."driverId" IS DISTINCT FROM planned_driver) THEN
  IF NEW.mode IS DISTINCT FROM OLD.mode OR NEW.address IS DISTINCT FROM OLD.address OR NEW.region IS DISTINCT FROM OLD.region OR NEW."scheduledAt" IS DISTINCT FROM OLD."scheduledAt" OR NEW."driverId" IS DISTINCT FROM planned_driver
  OR NEW.version<>OLD.version+1 OR NEW.status NOT IN ('PARTIALLY_RECEIVED','RECEIVED')
  OR NOT EXISTS (
   SELECT 1 FROM fulfillment_events e JOIN delivery_run_stops s ON s."fulfillmentId"=e."fulfillmentId" AND s.active
   JOIN delivery_runs r ON r.id=s."runId" AND r.status='IN_TRANSIT'
   WHERE e."fulfillmentId"=NEW.id AND e.version=NEW.version AND e.kind='DELIVERY_RECEIVED'
    AND e.details->>'runId'=r.id AND e.details->>'status'=NEW.status
    AND (e.details->>'runVersion')::integer=r.version+1
  ) THEN RAISE EXCEPTION 'Cancel the delivery plan before changing the fulfillment'; END IF;
 END IF;
 RETURN NEW;
END; $$;
