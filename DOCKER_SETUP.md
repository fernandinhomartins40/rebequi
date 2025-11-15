# 🐳 Docker Setup - Rebequi

Este guia explica como executar a aplicação Rebequi usando Docker.

## 📋 Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+

## 🏗️ Arquitetura

A aplicação é composta por 4 containers:

```
┌─────────────────────────────────────────┐
│           Nginx (Port 80)               │
│         Reverse Proxy Gateway           │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌──────────┐      ┌──────────┐
│ Frontend │      │ Backend  │
│ (React)  │      │ (Express)│
│ Port 8080│      │ Port 3000│
└──────────┘      └─────┬────┘
                        │
                        ▼
                  ┌───────────┐
                  │ PostgreSQL│
                  │ Port 5432 │
                  └───────────┘
```

## 🚀 Início Rápido

### 1. Build e Start

```bash
# Build e iniciar todos os serviços
docker-compose up --build -d

# Ou usando Make (se disponível)
make up
```

### 2. Verificar Status

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f nginx

# Verificar containers rodando
docker-compose ps
```

### 3. Acessar a Aplicação

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Backend Health**: http://localhost/api/health
- **PostgreSQL**: localhost:5432

## 📦 Serviços

### PostgreSQL
- **Porta**: 5432
- **Usuário**: rebequi
- **Senha**: rebequi123
- **Database**: rebequi
- **Volume**: postgres_data (persistente)

### Backend
- **Porta**: 3000 (interna), 80/api (via nginx)
- **Framework**: Express + TypeScript
- **ORM**: Prisma
- **API**: RESTful
- **Health Check**: http://localhost/api/health

### Frontend
- **Porta**: 8080 (interna), 80 (via nginx)
- **Framework**: React + Vite
- **UI**: Tailwind CSS + Shadcn/ui

### Nginx
- **Porta**: 80
- **Função**: Reverse Proxy
- **Roteamento**:
  - `/api/*` → Backend
  - `/*` → Frontend

## 🔧 Comandos Úteis

### Gerenciamento de Containers

```bash
# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga o banco!)
docker-compose down -v

# Rebuild de um serviço específico
docker-compose up -d --build backend

# Reiniciar um serviço
docker-compose restart backend

# Ver logs em tempo real
docker-compose logs -f

# Executar comando em um container
docker-compose exec backend sh
docker-compose exec postgres psql -U rebequi -d rebequi
```

### Database Management

```bash
# Acessar PostgreSQL CLI
docker-compose exec postgres psql -U rebequi -d rebequi

# Executar migrations
docker-compose exec backend npx prisma migrate deploy

# Executar seeds
docker-compose exec backend npx prisma db seed

# Reset database (CUIDADO: apaga todos os dados!)
docker-compose exec backend npx prisma migrate reset --force

# Abrir Prisma Studio
docker-compose exec backend npx prisma studio
```

### Logs e Debug

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend

# Ver últimas 100 linhas
docker-compose logs --tail=100 backend

# Inspecionar container
docker inspect rebequi-backend

# Ver uso de recursos
docker stats
```

## 🔄 Desenvolvimento

### Modo Desenvolvimento

Para desenvolvimento local, é recomendado rodar apenas o PostgreSQL via Docker:

```bash
# Iniciar apenas o PostgreSQL
docker-compose up -d postgres

# Rodar backend localmente
cd apps/backend
npm install
npm run dev

# Rodar frontend localmente (outro terminal)
cd apps/frontend
npm install
npm run dev
```

### Rebuild Após Mudanças

```bash
# Rebuild completo
docker-compose down
docker-compose up --build -d

# Rebuild apenas um serviço
docker-compose up -d --no-deps --build backend
```

## 🧪 Testes

### Health Checks

```bash
# Backend
curl http://localhost/api/health

# Frontend
curl http://localhost/health

# PostgreSQL
docker-compose exec postgres pg_isready -U rebequi
```

### Testar API

```bash
# Listar produtos
curl http://localhost/api/products

# Listar categorias
curl http://localhost/api/categories

# Produto específico
curl http://localhost/api/products/{id}

# Produtos por categoria
curl http://localhost/api/products/category/ferramentas
```

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs de erro
docker-compose logs backend

# Verificar configuração
docker-compose config

# Rebuild forçado
docker-compose build --no-cache backend
```

### Database Connection Error

```bash
# Verificar se PostgreSQL está rodando
docker-compose ps postgres

# Verificar logs do PostgreSQL
docker-compose logs postgres

# Testar conexão
docker-compose exec postgres psql -U rebequi -d rebequi
```

### Port Already in Use

```bash
# Encontrar processo usando a porta
lsof -i :80
lsof -i :3000
lsof -i :5432

# Parar containers em conflito
docker-compose down

# Alterar portas no docker-compose.yml se necessário
```

### Limpar Tudo

```bash
# Parar e remover containers, networks, volumes
docker-compose down -v

# Remover imagens não utilizadas
docker image prune -a

# Limpar sistema completo do Docker (CUIDADO!)
docker system prune -a --volumes
```

## 📊 Monitoramento

### Container Stats

```bash
# Ver uso de CPU, memória, rede
docker stats

# Stats de um container específico
docker stats rebequi-backend
```

### Logs Estruturados

```bash
# Backend logs
docker-compose logs -f backend | grep ERROR

# Nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Nginx error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

## 🔒 Segurança

### Produção

Para deploy em produção, altere:

1. **Senhas**: Mude credenciais do PostgreSQL
2. **Environment**: Configure NODE_ENV=production
3. **CORS**: Restrinja ALLOWED_ORIGINS
4. **Secrets**: Use Docker Secrets ou variáveis de ambiente seguras
5. **HTTPS**: Configure SSL/TLS no Nginx

```bash
# Exemplo com secrets
docker-compose -f docker-compose.prod.yml up -d
```

## 📁 Estrutura de Volumes

```bash
# Listar volumes
docker volume ls

# Inspecionar volume do PostgreSQL
docker volume inspect rebequi_postgres_data

# Backup do banco
docker-compose exec postgres pg_dump -U rebequi rebequi > backup.sql

# Restore do banco
docker-compose exec -T postgres psql -U rebequi rebequi < backup.sql
```

## 🎯 Próximos Passos

1. ✅ Aplicação rodando em Docker
2. 🔄 Configurar CI/CD (GitHub Actions, GitLab CI)
3. ☁️ Deploy em cloud (AWS, GCP, Azure, DigitalOcean)
4. 📊 Monitoring (Prometheus + Grafana)
5. 🔍 Logging centralizado (ELK Stack)
6. 🔐 Secrets management (Vault, AWS Secrets Manager)

## 📚 Referências

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)
