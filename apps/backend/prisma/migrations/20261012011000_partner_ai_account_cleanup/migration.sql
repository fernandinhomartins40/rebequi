-- Preserve aggregate usage costs without preventing the existing account removal.
ALTER TABLE "partner_ai_runs" DROP CONSTRAINT "partner_ai_runs_partnerId_fkey";
ALTER TABLE "partner_ai_runs" ALTER COLUMN "partnerId" DROP NOT NULL;
ALTER TABLE "partner_ai_runs" ADD CONSTRAINT "partner_ai_runs_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
