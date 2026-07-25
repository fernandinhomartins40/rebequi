-- Baseline do schema: users, categories, products, product_images, settings.
--
-- POR QUE ESTA MIGRATION EXISTE
-- O banco original foi criado com `prisma db push`, sem migration nenhuma.
-- Por isso a primeira migration (add_promotions) referenciava "products" sem
-- que nada tivesse criado essa tabela, e `prisma migrate deploy` falhava com
-- 42P01 em qualquer banco novo. Era exatamente por isso que o deploy tinha um
-- fallback para `db push --accept-data-loss` — que mascarava o problema real e
-- podia destruir dados em silêncio.
--
-- TUDO AQUI É IDEMPOTENTE (IF NOT EXISTS)
-- O banco de produção já tem estas tabelas. Esta migration precisa ser
-- inofensiva lá e, ao mesmo tempo, capaz de criar o schema do zero em bancos
-- novos (staging, CI, máquina de dev).
--
-- Só contém o estado ANTERIOR à primeira migration existente. Colunas de CRM,
-- pedidos, vendas e canais continuam sendo criadas pelas suas próprias
-- migrations, na ordem.

-- ── Enums ────────────────────────────────────────────────────────────────────
-- Só os papéis originais: MANAGER/CATALOG_MANAGER/MARKETING/SALES entram
-- depois, em 20260328103000_add_staff_roles.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER');
  END IF;
END
$$;

-- ── users ────────────────────────────────────────────────────────────────────
-- whatsapp/isProvisional/mustChangePassword são adicionados em
-- 20260327013000_add_quote_requests; não podem existir já aqui.
CREATE TABLE IF NOT EXISTS "users" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "password"  TEXT NOT NULL,
    "role"      "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key"       ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_email_idx"              ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx"               ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_isActive_idx"           ON "users"("isActive");

-- ── categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "categories" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "icon"        TEXT,
    "image"       TEXT,
    "description" TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "deletedAt"   TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key"   ON "categories"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key"   ON "categories"("slug");
CREATE INDEX IF NOT EXISTS "categories_slug_idx"          ON "categories"("slug");
CREATE INDEX IF NOT EXISTS "categories_isActive_idx"      ON "categories"("isActive");
CREATE INDEX IF NOT EXISTS "categories_deletedAt_idx"     ON "categories"("deletedAt");

-- ── products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "products" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "sku"           TEXT,
    "price"         DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "description"   TEXT,
    "shortDesc"     TEXT,
    "isOffer"       BOOLEAN NOT NULL DEFAULT false,
    "isNew"         BOOLEAN NOT NULL DEFAULT false,
    "isFeatured"    BOOLEAN NOT NULL DEFAULT false,
    "discount"      INTEGER,
    "stock"         INTEGER NOT NULL DEFAULT 0,
    "minStock"      INTEGER NOT NULL DEFAULT 0,
    "weight"        DOUBLE PRECISION,
    "dimensions"    TEXT,
    "categoryId"    TEXT NOT NULL,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "deletedAt"     TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_key"     ON "products"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key"      ON "products"("sku");
CREATE INDEX IF NOT EXISTS "products_categoryId_idx"      ON "products"("categoryId");
CREATE INDEX IF NOT EXISTS "products_slug_idx"            ON "products"("slug");
CREATE INDEX IF NOT EXISTS "products_sku_idx"             ON "products"("sku");
CREATE INDEX IF NOT EXISTS "products_isOffer_idx"         ON "products"("isOffer");
CREATE INDEX IF NOT EXISTS "products_isNew_idx"           ON "products"("isNew");
CREATE INDEX IF NOT EXISTS "products_isFeatured_idx"      ON "products"("isFeatured");
CREATE INDEX IF NOT EXISTS "products_isActive_idx"        ON "products"("isActive");
CREATE INDEX IF NOT EXISTS "products_deletedAt_idx"       ON "products"("deletedAt");
CREATE INDEX IF NOT EXISTS "products_price_idx"           ON "products"("price");

-- ── product_images ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "product_images" (
    "id"         TEXT NOT NULL,
    "url"        TEXT NOT NULL,
    "alt"        TEXT,
    "order"      INTEGER NOT NULL DEFAULT 0,
    "isPrimary"  BOOLEAN NOT NULL DEFAULT false,
    "storageKey" TEXT,
    "filename"   TEXT,
    "mimeType"   TEXT,
    "size"       INTEGER,
    "width"      INTEGER,
    "height"     INTEGER,
    "productId"  TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_images_productId_idx"  ON "product_images"("productId");
CREATE INDEX IF NOT EXISTS "product_images_isPrimary_idx"  ON "product_images"("isPrimary");
CREATE INDEX IF NOT EXISTS "product_images_order_idx"      ON "product_images"("order");
CREATE INDEX IF NOT EXISTS "product_images_storageKey_idx" ON "product_images"("storageKey");

-- ── settings ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "settings" (
    "key"         TEXT NOT NULL,
    "value"       TEXT NOT NULL,
    "isSecret"    BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- ── Chaves estrangeiras ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_categoryId_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_images_productId_fkey') THEN
    ALTER TABLE "product_images"
      ADD CONSTRAINT "product_images_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
