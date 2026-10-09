#!/bin/sh
# Apply versioned migrations without db push, data loss or guessed baselines.
set -eu
cd "$(dirname "$0")/.."
PRISMA="${PRISMA_BIN:-npx --no-install prisma}"
SCHEMA=prisma/schema.prisma

table_exists() {
  printf 'SELECT 1 FROM "%s" LIMIT 1;\n' "$1" \
    | $PRISMA db execute --stdin --schema "$SCHEMA" >/dev/null 2>&1 \
    && echo yes || echo no
}

has_history=$(table_exists _prisma_migrations)
has_schema=$(table_exists products)
if [ "$has_schema" = yes ] && [ "$has_history" = no ]; then
  echo 'Legacy database without migration history detected.' >&2
  echo 'Refusing to mark migrations as applied without verifying their effects.' >&2
  echo 'Preserve the database and perform an explicit, reviewed baseline.' >&2
  exit 1
fi

echo 'Applying versioned database migrations...'
$PRISMA migrate deploy
$PRISMA migrate status
echo 'Database migrations completed.'
