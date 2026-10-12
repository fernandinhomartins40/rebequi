ALTER TABLE partner_rewards ADD CONSTRAINT partner_reward_bounds CHECK (points BETWEEN 1 AND 10000000 AND capacity BETWEEN 0 AND 100000 AND reserved >= 0 AND fulfilled >= 0 AND reserved + fulfilled <= capacity AND version >= 1);
ALTER TABLE partner_redemptions ADD CONSTRAINT partner_redemption_bounds CHECK (points BETWEEN 1 AND 10000000 AND version >= 1 AND "rewardVersion" >= 1 AND status IN ('PENDING','APPROVED','CANCELED','REJECTED','FULFILLED'));
CREATE TRIGGER partner_reward_revision_immutable BEFORE UPDATE OR DELETE ON partner_reward_revisions FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();
CREATE FUNCTION rebequi_guard_redemption_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Redemption history cannot be deleted'; END IF;
 IF (to_jsonb(NEW) - 'partnerId' - 'status' - 'version' - 'reason' - 'actorId' - 'updatedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'partnerId' - 'status' - 'version' - 'reason' - 'actorId' - 'updatedAt')
    OR (NEW."partnerId" IS DISTINCT FROM OLD."partnerId" AND NEW."partnerId" IS NOT NULL) THEN
   RAISE EXCEPTION 'Redemption snapshot is immutable';
 END IF;
 IF NEW.status IS DISTINCT FROM OLD.status THEN
   IF NEW.version <> OLD.version + 1 OR OLD.status NOT IN ('PENDING','APPROVED') OR NEW.status NOT IN ('APPROVED','CANCELED','REJECTED','FULFILLED') OR (NEW.status='APPROVED' AND OLD.status<>'PENDING') OR (NEW.status='FULFILLED' AND OLD.status<>'APPROVED') THEN
     RAISE EXCEPTION 'Invalid redemption transition';
   END IF;
 ELSIF (to_jsonb(NEW) - 'partnerId' - 'updatedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'partnerId' - 'updatedAt') THEN
   RAISE EXCEPTION 'Redemption transition requires a status change';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER partner_redemption_snapshot BEFORE UPDATE OR DELETE ON partner_redemptions FOR EACH ROW EXECUTE FUNCTION rebequi_guard_redemption_snapshot();
