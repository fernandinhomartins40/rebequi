-- Modernização do pipeline de orçamentos.
--
-- 1. Rascunho anônimo: a foto vem antes do cadastro, então userId passa a ser
--    opcional e o rascunho carrega um token próprio até ser enviado.
-- 2. Telemetria de OCR (ocr_runs): permite responder se a IA está valendo a pena.
-- 3. Aliases aprendidos: correções do cliente viram vocabulário permanente.
--
-- Migration aditiva: nenhuma linha existente fica inválida.

-- ── 1. quote_requests ────────────────────────────────────────────────────────
ALTER TABLE "quote_requests" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "quote_requests"
  ADD COLUMN "ocrAttempts"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ocrEngine"          TEXT,
  ADD COLUMN "ocrModelId"         TEXT,
  ADD COLUMN "anonymousToken"     TEXT,
  ADD COLUMN "anonymousExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "quote_requests_anonymousToken_key"
  ON "quote_requests"("anonymousToken");

CREATE INDEX "quote_requests_anonymousExpiresAt_idx"
  ON "quote_requests"("anonymousExpiresAt");

-- A FK precisa ser recriada porque a coluna deixou de ser NOT NULL.
ALTER TABLE "quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_userId_fkey";
ALTER TABLE "quote_requests"
  ADD CONSTRAINT "quote_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 2. ocr_runs ──────────────────────────────────────────────────────────────
CREATE TABLE "ocr_runs" (
    "id"                    TEXT NOT NULL,
    "quoteRequestId"        TEXT NOT NULL,
    "engine"                TEXT NOT NULL,
    "modelId"               TEXT,
    "success"               BOOLEAN NOT NULL DEFAULT false,
    "durationMs"            INTEGER NOT NULL DEFAULT 0,
    "promptTokens"          INTEGER,
    "completionTokens"      INTEGER,
    "costUsd"               DOUBLE PRECISION,
    "itemsDetected"         INTEGER NOT NULL DEFAULT 0,
    "itemsMatched"          INTEGER NOT NULL DEFAULT 0,
    "itemsEditedByCustomer" INTEGER,
    "errorMessage"          TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ocr_runs_quoteRequestId_idx" ON "ocr_runs"("quoteRequestId");
CREATE INDEX "ocr_runs_createdAt_idx"      ON "ocr_runs"("createdAt");
CREATE INDEX "ocr_runs_engine_success_idx" ON "ocr_runs"("engine", "success");

ALTER TABLE "ocr_runs"
  ADD CONSTRAINT "ocr_runs_quoteRequestId_fkey"
  FOREIGN KEY ("quoteRequestId") REFERENCES "quote_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. product_aliases ───────────────────────────────────────────────────────
CREATE TABLE "product_aliases" (
    "id"             TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "productId"      TEXT NOT NULL,
    "occurrences"    INTEGER NOT NULL DEFAULT 1,
    "isApproved"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_aliases_normalizedText_productId_key"
  ON "product_aliases"("normalizedText", "productId");

CREATE INDEX "product_aliases_normalizedText_isApproved_idx"
  ON "product_aliases"("normalizedText", "isApproved");

ALTER TABLE "product_aliases"
  ADD CONSTRAINT "product_aliases_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
