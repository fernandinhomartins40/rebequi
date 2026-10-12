-- CreateTable
CREATE TABLE "logistics_vehicles" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maxLoadKg" DECIMAL(12,3),
    "maxVolumeM3" DECIMAL(12,3),
    "restrictions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_vehicle_events" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_vehicle_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "logistics_vehicles_plate_key" ON "logistics_vehicles"("plate");

-- CreateIndex
CREATE INDEX "logistics_vehicles_active_createdAt_idx" ON "logistics_vehicles"("active", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_vehicle_events_requestKey_key" ON "logistics_vehicle_events"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_vehicle_events_vehicleId_version_key" ON "logistics_vehicle_events"("vehicleId", "version");

-- AddForeignKey
ALTER TABLE "logistics_vehicle_events" ADD CONSTRAINT "logistics_vehicle_events_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "logistics_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE logistics_vehicles ADD CONSTRAINT logistics_vehicle_capacity_bounds CHECK (("maxLoadKg" IS NULL OR "maxLoadKg" > 0) AND ("maxVolumeM3" IS NULL OR "maxVolumeM3" > 0) AND version >= 1);
CREATE TRIGGER logistics_vehicle_history_immutable BEFORE UPDATE OR DELETE ON logistics_vehicle_events FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();
