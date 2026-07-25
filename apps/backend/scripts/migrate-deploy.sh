#!/bin/sh
# =============================================================================
# Aplicação de migrations em produção.
#
# CONTEXTO
# O banco de produção nasceu de `prisma db push`, sem nenhuma migration
# registrada. Isso quebrava o deploy de duas formas:
#
#   1. `migrate deploy` falha com P3005 ("database schema is not empty") porque
#      as tabelas existem mas a tabela _prisma_migrations está vazia.
#   2. Por causa disso, o compose caía em `prisma db push --accept-data-loss`,
#      que aplica o schema DROPANDO o que estiver no caminho — sem perguntar e
#      sem falhar o deploy. Um erro de migration virava perda de dados silenciosa.
#
# O QUE ESTE SCRIPT FAZ
# Se o banco tem schema mas não tem histórico, faz o baseline: marca como
# aplicadas as migrations cujo efeito JÁ ESTÁ no banco, e deixa as pendentes
# rodarem normalmente. Depois disso, todo deploy é um `migrate deploy` comum.
#
# Nunca usa `db push` e nunca usa `--accept-data-loss`. Se a migration falhar,
# o script sai com erro e o deploy para.
# =============================================================================

set -eu

cd "$(dirname "$0")/.."

PRISMA="${PRISMA_BIN:-npx prisma}"
SCHEMA="prisma/schema.prisma"

# Executa um SELECT sonda; retorna "yes" se a tabela existe, "no" caso contrário.
table_exists() {
  printf 'SELECT 1 FROM "%s" LIMIT 1;\n' "$1" \
    | $PRISMA db execute --stdin --schema "$SCHEMA" >/dev/null 2>&1 \
    && echo "yes" || echo "no"
}

echo "==> Verificando estado das migrations..."

has_history=$(table_exists "_prisma_migrations")
has_schema=$(table_exists "products")

echo "    histórico de migrations: $has_history"
echo "    schema da aplicação:     $has_schema"

if [ "$has_schema" = "yes" ] && [ "$has_history" = "no" ]; then
  echo "==> Banco legado detectado (schema existe, histórico vazio)."
  echo "    Fazendo baseline das migrations já refletidas no banco."

  # Ordem cronológica. Só entram aqui migrations cujo efeito comprovadamente já
  # está no banco de produção. Migrations novas NÃO devem ser adicionadas nesta
  # lista — elas precisam rodar de verdade.
  for migration in \
    20260326000000_baseline \
    20260326160000_add_promotions \
    20260327013000_add_quote_requests \
    20260328090000_add_offer_pricing_to_promotions \
    20260328103000_add_staff_roles \
    20260328160000_add_customer_orders \
    20260507120000_add_quote_ocr_status \
    20260724120000_add_sales_and_stock_movements \
    20260724130000_add_customer_crm \
    20260724140000_add_sales_channels
  do
    echo "    baseline: $migration"
    $PRISMA migrate resolve --applied "$migration"
  done

  echo "==> Baseline concluído."
fi

echo "==> Estado atual das migrations:"
$PRISMA migrate status || true

echo "==> Aplicando migrations pendentes..."
$PRISMA migrate deploy

echo "==> Migrations aplicadas com sucesso."

echo "==> Verificando drift entre banco e schema..."
# Um diff não-vazio significa que o banco não bate com schema.prisma — sinal de
# migration faltando. Não derruba o deploy, mas fica registrado no log.
drift=$($PRISMA migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script 2>/dev/null || true)

if printf '%s' "$drift" | grep -q "This is an empty migration"; then
  echo "    OK: banco em sincronia com o schema."
else
  echo "    AVISO: divergência entre banco e schema.prisma:"
  printf '%s\n' "$drift" | head -40
fi
