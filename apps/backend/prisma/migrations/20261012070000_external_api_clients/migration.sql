-- CreateTable
CREATE TABLE "external_api_clients" (
    "requestKey" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_api_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_api_clients_requestKey_key" ON "external_api_clients"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "external_api_clients_tokenHash_key" ON "external_api_clients"("tokenHash");

-- CreateIndex
CREATE INDEX "external_api_clients_createdAt_idx" ON "external_api_clients"("createdAt");

