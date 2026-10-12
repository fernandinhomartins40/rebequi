CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');
CREATE TABLE "partner_profiles" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "referralCode" TEXT NOT NULL,
  "specialties" TEXT[] NOT NULL, "city" TEXT NOT NULL, "region" TEXT NOT NULL,
  "services" TEXT NOT NULL DEFAULT '', "experienceYears" INTEGER NOT NULL DEFAULT 0,
  "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING', "reviewReason" TEXT,
  "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3), "acceptedTermsVersion" TEXT NOT NULL,
  "acceptedTermsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partner_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partner_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_profiles_experience_check" CHECK ("experienceYears" BETWEEN 0 AND 80),
  CONSTRAINT "partner_profiles_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "partner_profiles_userId_key" ON "partner_profiles"("userId");
CREATE UNIQUE INDEX "partner_profiles_referralCode_key" ON "partner_profiles"("referralCode");
CREATE INDEX "partner_profiles_status_createdAt_idx" ON "partner_profiles"("status", "createdAt");
CREATE TABLE "partner_profile_audits" (
  "id" TEXT NOT NULL, "partnerId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "fromStatus" "PartnerStatus", "toStatus" "PartnerStatus" NOT NULL,
  "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_profile_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partner_profile_audits_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "partner_profile_audits_partnerId_createdAt_idx" ON "partner_profile_audits"("partnerId", "createdAt");
