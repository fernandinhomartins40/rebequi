# Deploy Rebequi - VPS Production

Guia completo para deploy da aplicação Rebequi em VPS com Docker.

## 📋 Pré-requisitos

### No Servidor VPS

1. **Docker e Docker Compose instalados**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Nginx instalado e configurado**
   ```bash
   nginx -v
   ```

3. **Certificado SSL configurado** (Let's Encrypt)
   ```bash
   certbot --version
   ls -la /etc/letsencrypt/live/rebequi.com.br/
   ```

4. **Portas disponíveis**
   - 80 (HTTP - redireciona para HTTPS)
   - 443 (HTTPS)
   - 3100 (Acesso direto por IP)
   - 3101 (Backend interno - não exposta publicamente)
   - 5433 (PostgreSQL - apenas interno)
   - 8080 (Frontend interno - apenas interno)

### No GitHub

1. **Secret configurado**
   - `VPS_PASSWORD`: Senha SSH do servidor VPS

## 🚀 Deploy Automático (GitHub Actions)

O deploy é automático quando você faz push para a branch `main`:

```bash
git push origin main
```

O workflow `.github/workflows/deploy-vps.yml` irá:
1. Sincronizar código com rsync
2. Validar estrutura do projeto
3. Construir imagens Docker
4. Executar migrações do Prisma
5. Configurar Nginx
6. Verificar health checks
7. Disponibilizar aplicação

## 🔧 Deploy Manual

### 1. Conectar ao servidor

```bash
ssh root@rebequi.com.br
```

### 2. Navegar para o diretório

```bash
cd /root/rebequi
```

### 3. Criar arquivo .env

```bash
cat > .env << 'EOF'
# Node.js
NODE_ENV=production

# Application
PORT=3100

# PostgreSQL
POSTGRES_USER=rebequi
POSTGRES_PASSWORD=SEU_PASSWORD_SEGURO_AQUI
POSTGRES_DB=rebequi

# Database URL
DATABASE_URL=postgresql://rebequi:SEU_PASSWORD_SEGURO_AQUI@postgres:5432/rebequi

# JWT
JWT_SECRET=SEU_JWT_SECRET_AQUI
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://www.rebequi.com.br
CORS_ORIGIN=https://www.rebequi.com.br
ALLOWED_ORIGINS=https://www.rebequi.com.br,http://www.rebequi.com.br,https://rebequi.com.br,http://rebequi.com.br,http://72.60.10.108:3100

# Logs
LOG_LEVEL=info
EOF
```

### 4. Build e deploy

```bash
# Exportar timestamp para rebuild forçado
export BUILD_TIMESTAMP=$(date +%s)

# Build sem cache
docker-compose -f docker-compose.vps.yml build --no-cache --pull

# Iniciar containers
docker-compose -f docker-compose.vps.yml up -d

# Verificar logs
docker-compose -f docker-compose.vps.yml logs -f
```

### 5. Executar migrações (se necessário)

```bash
docker exec rebequi-vps npx prisma migrate deploy
```

### 6. Executar seed (opcional)

```bash
docker exec rebequi-vps npx prisma db seed
```

## 📊 Monitoramento

### Ver status dos containers

```bash
docker-compose -f docker-compose.vps.yml ps
```

### Ver logs da aplicação

```bash
# Logs completos
docker logs rebequi-vps -f

# Logs do backend
docker exec rebequi-vps tail -f /var/log/backend.stdout.log

# Logs do frontend/nginx
docker exec rebequi-vps tail -f /var/log/nginx/access.log

# Status do supervisord
docker exec rebequi-vps supervisorctl status
```

### Health checks

```bash
# Backend
curl http://localhost:3100/health

# Frontend
curl http://localhost:3100/

# API
curl http://localhost:3100/api/products
```

## 🔄 Atualizar aplicação

### Método 1: Automático (GitHub Actions)

Apenas faça push para a branch main:
```bash
git push origin main
```

### Método 2: Manual

```bash
cd /root/rebequi

# Parar containers
docker-compose -f docker-compose.vps.yml down

# Atualizar código
git pull origin main

# Rebuild e restart
export BUILD_TIMESTAMP=$(date +%s)
docker-compose -f docker-compose.vps.yml build --no-cache
docker-compose -f docker-compose.vps.yml up -d
```

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs completos
docker logs rebequi-vps

# Verificar se PostgreSQL está rodando
docker logs rebequi-postgres

# Entrar no container para debug
docker exec -it rebequi-vps sh
```

### Erro de conexão com banco

```bash
# Verificar se PostgreSQL está acessível
docker exec rebequi-vps pg_isready -h postgres -U rebequi

# Testar conexão
docker exec rebequi-postgres psql -U rebequi -d rebequi -c "SELECT 1"
```

### Nginx não está respondendo

```bash
# Verificar configuração do Nginx (no host)
nginx -t

# Recarregar Nginx
systemctl reload nginx

# Ver logs do Nginx
tail -f /var/log/nginx/rebequi-error.log
```

### Rebuild completo (limpar tudo)

```bash
# ATENÇÃO: Isso vai apagar o banco de dados!
docker-compose -f docker-compose.vps.yml down -v

# Limpar imagens antigas
docker system prune -af

# Rebuild do zero
export BUILD_TIMESTAMP=$(date +%s)
docker-compose -f docker-compose.vps.yml build --no-cache
docker-compose -f docker-compose.vps.yml up -d
```

### Preservar banco e limpar apenas aplicação

```bash
# Parar apenas o container da aplicação
docker stop rebequi-vps
docker rm rebequi-vps

# Rebuild apenas da aplicação (preserva volume do PostgreSQL)
export BUILD_TIMESTAMP=$(date +%s)
docker-compose -f docker-compose.vps.yml build app
docker-compose -f docker-compose.vps.yml up -d app
```

## 📦 Backup e Restore

### Backup do banco de dados

```bash
# Criar backup
docker exec rebequi-postgres pg_dump -U rebequi rebequi > backup-$(date +%Y%m%d-%H%M%S).sql

# Compactar
gzip backup-*.sql
```

### Restore do banco de dados

```bash
# Descompactar
gunzip backup-XXXXXXXX.sql.gz

# Restaurar
docker exec -i rebequi-postgres psql -U rebequi rebequi < backup-XXXXXXXX.sql
```

### Backup de uploads

```bash
# Backup dos uploads
docker run --rm \
  -v rebequi_uploads:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads-backup-$(date +%Y%m%d).tar.gz /data
```

## 🌐 URLs de Acesso

- **Produção (HTTPS)**: https://rebequi.com.br
- **Produção (HTTPS com www)**: https://www.rebequi.com.br
- **Acesso direto por IP**: http://72.60.10.108:3100
- **API**: https://rebequi.com.br/api
- **Health check**: https://rebequi.com.br/health

## 🔐 Segurança

### Variáveis sensíveis

Nunca commite o arquivo `.env` com valores de produção. Use:

```bash
# Gerar JWT_SECRET seguro
openssl rand -hex 32

# Gerar POSTGRES_PASSWORD seguro
openssl rand -base64 32
```

### Renovar certificado SSL

```bash
certbot renew --nginx
```

### Verificar portas abertas

```bash
netstat -tulpn | grep LISTEN
```

## 📝 Estrutura de Portas

| Serviço | Porta Interna | Porta Externa | Acesso |
|---------|---------------|---------------|--------|
| Backend | 3000 | 3101 | Apenas Nginx |
| Frontend (Nginx) | 8080 | 8080 | Apenas Nginx |
| PostgreSQL | 5432 | 5433 | Apenas interno |
| Nginx (Host) | - | 80, 443, 3100 | Público |

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas em `.env`
- [ ] JWT_SECRET gerado de forma segura
- [ ] POSTGRES_PASSWORD forte
- [ ] Certificado SSL configurado
- [ ] DNS apontando para o servidor
- [ ] Portas do firewall liberadas (80, 443, 3100)
- [ ] Backup do banco de dados feito
- [ ] Health checks passando
- [ ] Logs sendo monitorados

## 📞 Suporte

Para problemas ou dúvidas, verifique os logs e consulte este guia.
