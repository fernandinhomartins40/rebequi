ALTER TABLE fulfillments DROP CONSTRAINT fulfillment_mode_status_bounds;
ALTER TABLE fulfillments ADD CONSTRAINT fulfillment_mode_status_bounds CHECK (mode IN ('UNDEFINED','PICKUP','DELIVERY') AND status IN ('AWAITING_DETAILS','PICKING','CHECKING','READY','CANCELED','PARTIALLY_RECEIVED','RECEIVED') AND version>=1);
