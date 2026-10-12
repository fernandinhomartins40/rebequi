-- CreateTable
CREATE TABLE "partner_rewards" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "fulfilled" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_reward_revisions" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_reward_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_redemptions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "rewardId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "rewardVersion" INTEGER NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_rewards_enabled_createdAt_idx" ON "partner_rewards"("enabled", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_reward_revisions_rewardId_version_key" ON "partner_reward_revisions"("rewardId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "partner_redemptions_requestKey_key" ON "partner_redemptions"("requestKey");

-- CreateIndex
CREATE INDEX "partner_redemptions_partnerId_createdAt_idx" ON "partner_redemptions"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "partner_redemptions_status_createdAt_idx" ON "partner_redemptions"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "partner_reward_revisions" ADD CONSTRAINT "partner_reward_revisions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "partner_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_redemptions" ADD CONSTRAINT "partner_redemptions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_redemptions" ADD CONSTRAINT "partner_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "partner_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

