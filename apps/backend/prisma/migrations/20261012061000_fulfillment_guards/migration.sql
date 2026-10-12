ALTER TABLE fulfillments ADD CONSTRAINT fulfillment_mode_status_bounds CHECK (mode IN ('UNDEFINED','PICKUP','DELIVERY') AND status IN ('AWAITING_DETAILS','PICKING','CHECKING','READY','CANCELED') AND version >= 1);
CREATE FUNCTION rebequi_guard_fulfillment_cancel() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='CANCELED' AND OLD.status IS DISTINCT FROM NEW.status AND EXISTS (SELECT 1 FROM fulfillments WHERE "saleId"=NEW.id AND status<>'CANCELED') THEN
   RAISE EXCEPTION 'Cancel the fulfillment in the same sale transaction';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER sale_fulfillment_cancel BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION rebequi_guard_fulfillment_cancel();
