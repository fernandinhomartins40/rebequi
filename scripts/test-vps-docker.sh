#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}OK${NC} $1"
}

log_error() {
  echo -e "${RED}ERRO${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}AVISO${NC} $1"
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose --env-file .env -f docker-compose.vps.yml "$@"
    return
  fi

  docker-compose --env-file .env -f docker-compose.vps.yml "$@"
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-24}"

  for attempt in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log_info "$label respondeu em $url"
      return 0
    fi

    sleep 5
  done

  log_error "$label nao respondeu em $url"
  return 1
}

if [ ! -f "docker-compose.vps.yml" ]; then
  log_error "Execute este script na raiz do projeto."
  exit 1
fi

if [ ! -f ".env" ]; then
  log_warning "Criando .env local compatível com a topologia de producao."
  cat > .env <<'EOF'
RELEASE_VERSION=local-test
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DEPLOY_PORT=3190
POSTGRES_DB=rebequi_test
POSTGRES_USER=rebequi_test
POSTGRES_PASSWORD=test123
DATABASE_URL=postgresql://rebequi_test:test123@postgres:5432/rebequi_test
JWT_SECRET=test-secret-key-not-for-production-123456
JWT_EXPIRES_IN=7d
AUTH_COOKIE_NAME=rebequi_token
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_MAX_AGE_MS=604800000
AUTH_COOKIE_PATH=/
ALLOWED_ORIGINS=http://localhost:3190,http://127.0.0.1:3190
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
LOG_LEVEL=debug
BOOTSTRAP_ADMIN_EMAIL=admin@rebequi.com.br
BOOTSTRAP_ADMIN_PASSWORD=ChangeMe123!
BOOTSTRAP_ADMIN_NAME=Administrador Rebequi
BOOTSTRAP_CUSTOMER_EMAIL=cliente@rebequi.com.br
BOOTSTRAP_CUSTOMER_PASSWORD=Cliente123!
BOOTSTRAP_CUSTOMER_NAME=Cliente de Teste
EOF
fi

if ! grep -q '^RELEASE_VERSION=' .env; then
  printf 'RELEASE_VERSION=local-test\n' >> .env
fi

DEPLOY_PORT="${DEPLOY_PORT:-$(sed -n 's/^DEPLOY_PORT=//p' .env | tail -n 1)}"
DEPLOY_PORT="${DEPLOY_PORT:-3190}"

log_info "Parando stack anterior sem remover volumes persistentes"
compose down --remove-orphans || true

log_warning "Limpando imagens dangling"
docker image prune -f >/dev/null

export BUILD_TIMESTAMP
BUILD_TIMESTAMP="$(date +%s)"
log_info "BUILD_TIMESTAMP=${BUILD_TIMESTAMP}"

log_info "Buildando migrator, api e web"
compose build --no-cache migrator api web

log_info "Subindo postgres"
compose up -d postgres

log_info "Executando migracoes/bootstrap"
compose run --rm migrator

log_info "Subindo api e web"
compose up -d api web

log_info "Status atual dos containers"
compose ps

for container in rebequi-postgres rebequi-api rebequi-web; do
  if ! docker ps --format '{{.Names}}' | grep -qx "$container"; then
    log_error "Container ausente: $container"
    compose logs --tail=200
    exit 1
  fi
done

wait_for_url "http://127.0.0.1:${DEPLOY_PORT}/health" "Health do frontend"
wait_for_url "http://127.0.0.1:${DEPLOY_PORT}/api/health" "Health da API"

log_info "Validando cabecalho de cache do frontend"
curl -fsSI "http://127.0.0.1:${DEPLOY_PORT}/" | grep -qi '^Cache-Control: no-store, no-cache, must-revalidate'

echo
log_info "Logs recentes da API"
docker logs rebequi-api --tail 20

echo
log_info "Logs recentes do frontend"
docker logs rebequi-web --tail 20

echo
echo "URLs locais:"
echo "  Frontend: http://127.0.0.1:${DEPLOY_PORT}/"
echo "  API:      http://127.0.0.1:${DEPLOY_PORT}/api/health"
echo
echo "Comandos uteis:"
echo "  docker compose -f docker-compose.vps.yml ps"
echo "  docker compose -f docker-compose.vps.yml logs -f"
echo "  docker compose -f docker-compose.vps.yml down"
