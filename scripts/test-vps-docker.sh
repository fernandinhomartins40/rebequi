#!/bin/bash

# Script para testar build VPS localmente
# Uso: ./scripts/test-vps-docker.sh

set -e

echo "=== Teste Local do Docker VPS ==="

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "docker-compose.vps.yml" ]; then
    log_error "docker-compose.vps.yml não encontrado"
    log_error "Execute este script do diretório raiz do projeto"
    exit 1
fi

log_info "Diretório correto verificado"

# Criar .env de teste se não existir
if [ ! -f ".env" ]; then
    log_warning "Criando .env de teste..."
    cat > .env << 'EOF'
# Node.js
NODE_ENV=production

# Application
PORT=3100

# PostgreSQL
POSTGRES_USER=rebequi_test
POSTGRES_PASSWORD=test123
POSTGRES_DB=rebequi_test

# Database URL
DATABASE_URL=postgresql://rebequi_test:test123@postgres:5432/rebequi_test

# JWT
JWT_SECRET=test-secret-key-not-for-production
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:3100
CORS_ORIGIN=http://localhost:3100
ALLOWED_ORIGINS=http://localhost:3100,http://localhost:8080

# Logs
LOG_LEVEL=debug
EOF
    log_info ".env de teste criado"
else
    log_info "Usando .env existente"
fi

# Parar containers existentes
log_info "Parando containers existentes..."
docker-compose -f docker-compose.vps.yml down -v || true

# Limpar imagens antigas
log_warning "Limpando imagens antigas..."
docker image prune -f

# Exportar BUILD_TIMESTAMP
export BUILD_TIMESTAMP=$(date +%s)
log_info "BUILD_TIMESTAMP=$BUILD_TIMESTAMP"

# Build da imagem
echo ""
log_info "=== Iniciando build da imagem ==="
if docker-compose -f docker-compose.vps.yml build --no-cache; then
    log_info "Build concluído com sucesso"
else
    log_error "Build falhou"
    exit 1
fi

# Iniciar containers
echo ""
log_info "=== Iniciando containers ==="
if docker-compose -f docker-compose.vps.yml up -d; then
    log_info "Containers iniciados"
else
    log_error "Falha ao iniciar containers"
    exit 1
fi

# Aguardar containers iniciarem
log_info "Aguardando 30s para containers iniciarem..."
sleep 30

# Verificar status dos containers
echo ""
log_info "=== Status dos containers ==="
docker-compose -f docker-compose.vps.yml ps

# Verificar se containers estão rodando
if ! docker ps | grep -q rebequi-vps; then
    log_error "Container rebequi-vps não está rodando!"
    echo ""
    log_error "Logs do container:"
    docker logs rebequi-vps
    exit 1
fi

if ! docker ps | grep -q rebequi-postgres; then
    log_error "Container rebequi-postgres não está rodando!"
    exit 1
fi

log_info "Todos os containers estão rodando"

# Verificar logs do supervisord
echo ""
log_info "=== Status do Supervisord ==="
docker exec rebequi-vps supervisorctl status || log_warning "Supervisord ainda não iniciou"

# Testar health check do backend
echo ""
log_info "=== Testando Health Checks ==="
RETRIES=15
for i in $(seq 1 $RETRIES); do
    if curl -f http://localhost:3101/health 2>/dev/null; then
        log_info "✓ Backend health check passou (tentativa $i/$RETRIES)"
        break
    else
        if [ $i -eq $RETRIES ]; then
            log_error "Backend health check falhou após $RETRIES tentativas"
            echo ""
            log_error "Logs do backend:"
            docker exec rebequi-vps cat /var/log/backend.stdout.log || echo "Sem logs stdout"
            docker exec rebequi-vps cat /var/log/backend.stderr.log || echo "Sem logs stderr"
            exit 1
        fi
        log_warning "Tentativa $i/$RETRIES falhou, aguardando 5s..."
        sleep 5
    fi
done

# Testar frontend (Nginx)
if curl -f http://localhost:8080/nginx-health 2>/dev/null; then
    log_info "✓ Frontend (Nginx) health check passou"
else
    log_error "Frontend health check falhou"
    docker exec rebequi-vps cat /var/log/nginx/error.log || echo "Sem logs nginx"
    exit 1
fi

# Testar API
echo ""
log_info "=== Testando API ==="
if curl -f http://localhost:3101/api/products 2>/dev/null; then
    log_info "✓ API /api/products acessível"
else
    log_warning "API /api/products retornou erro (pode ser normal se não houver produtos)"
fi

if curl -f http://localhost:3101/api/categories 2>/dev/null; then
    log_info "✓ API /api/categories acessível"
else
    log_warning "API /api/categories retornou erro (pode ser normal se não houver categorias)"
fi

# Mostrar logs recentes
echo ""
log_info "=== Logs recentes do backend ==="
docker exec rebequi-vps tail -20 /var/log/backend.stdout.log 2>/dev/null || echo "Sem logs"

echo ""
log_info "=== Logs recentes do Nginx ==="
docker exec rebequi-vps tail -20 /var/log/nginx/access.log 2>/dev/null || echo "Sem logs"

# Verificar se Prisma migrations foram executadas
echo ""
log_info "=== Verificando Prisma ==="
docker exec rebequi-vps sh -c "cd /app/apps/backend && npx prisma migrate status" || log_warning "Sem migrations"

# Sumário
echo ""
echo "========================================="
log_info "Teste concluído com sucesso!"
echo "========================================="
echo ""
echo "URLs de acesso:"
echo "  - Backend:  http://localhost:3101"
echo "  - Frontend: http://localhost:8080"
echo "  - Health:   http://localhost:3101/health"
echo "  - API:      http://localhost:3101/api"
echo ""
echo "Comandos úteis:"
echo "  docker-compose -f docker-compose.vps.yml logs -f        # Ver logs"
echo "  docker-compose -f docker-compose.vps.yml ps             # Status"
echo "  docker exec rebequi-vps supervisorctl status            # Supervisord"
echo "  docker-compose -f docker-compose.vps.yml down           # Parar"
echo ""
