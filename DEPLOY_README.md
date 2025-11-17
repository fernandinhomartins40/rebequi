# Deploy Rebequi - Guia Rápido

## 🚀 Deploy Automático (Recomendado)

### 1. Configurar Secret no GitHub

Antes do primeiro deploy, configure o secret necessário:

1. Acesse: `Settings` → `Secrets and variables` → `Actions`
2. Clique em `New repository secret`
3. Nome: `VPS_PASSWORD`
4. Value: Senha SSH do servidor VPS
5. Clique em `Add secret`

### 2. Fazer Deploy

O deploy é automático quando você faz push para as seguintes branches:

- `main` - Deploy de produção
- `claude/*` - Deploy de desenvolvimento/teste

```bash
# Push para disparar deploy
git push origin <branch-name>

# Ou disparar manualmente via GitHub Actions UI
# Vá para Actions → Deploy Rebequi to VPS → Run workflow
```

### 3. Monitorar Deploy

**Via GitHub:**
1. Vá para aba `Actions` no repositório
2. Clique no workflow em execução
3. Acompanhe os logs

**Via SSH:**
```bash
ssh root@rebequi.com.br
cd /root/rebequi
docker-compose -f docker-compose.vps.yml logs -f
```

## 🧪 Testar Localmente ANTES do Deploy

Sempre teste o build VPS localmente antes de fazer deploy:

```bash
# Dar permissão ao script
chmod +x scripts/test-vps-docker.sh

# Executar teste
./scripts/test-vps-docker.sh
```

O script irá:
- ✅ Criar `.env` de teste
- ✅ Build da imagem Docker VPS
- ✅ Iniciar containers (PostgreSQL + App)
- ✅ Executar health checks
- ✅ Testar API endpoints
- ✅ Mostrar logs e status

## 📦 O que o Deploy Faz

1. **Sincroniza código** via rsync para `/root/rebequi`
2. **Valida estrutura** do projeto (controllers, routes, middleware)
3. **Cria arquivo .env** de produção no servidor
4. **Build Docker** sem cache com timestamp
5. **Executa migrações** do Prisma automaticamente
6. **Configura Nginx** (portas 80, 443, 3100)
7. **Inicia aplicação** com supervisord
8. **Verifica health checks** (15 tentativas)

## 🌐 URLs Após Deploy

- **HTTPS**: https://rebequi.com.br
- **HTTPS www**: https://www.rebequi.com.br
- **IP:Porta**: http://72.60.10.108:3100
- **API**: https://rebequi.com.br/api
- **Health**: https://rebequi.com.br/health

## 🔧 Comandos Úteis na VPS

```bash
# Conectar ao servidor
ssh root@rebequi.com.br

# Navegar para diretório
cd /root/rebequi

# Ver status dos containers
docker-compose -f docker-compose.vps.yml ps

# Ver logs da aplicação
docker logs rebequi-vps -f

# Ver logs do PostgreSQL
docker logs rebequi-postgres -f

# Ver status do supervisord
docker exec rebequi-vps supervisorctl status

# Restart da aplicação
docker-compose -f docker-compose.vps.yml restart app

# Rebuild completo
export BUILD_TIMESTAMP=$(date +%s)
docker-compose -f docker-compose.vps.yml build --no-cache
docker-compose -f docker-compose.vps.yml up -d
```

## 🐛 Troubleshooting

### Deploy falhou no GitHub Actions

1. **Erro de SSH**: Verifique se `VPS_PASSWORD` está correto
2. **Erro de rsync**: Verifique se o servidor está acessível
3. **Erro de build**: Teste localmente com `./scripts/test-vps-docker.sh`
4. **Health check falhou**: Verifique logs no servidor

### Site não carrega após deploy

```bash
# No servidor
ssh root@rebequi.com.br

# Verificar nginx
nginx -t
systemctl status nginx
systemctl reload nginx

# Verificar containers
docker ps
docker logs rebequi-vps --tail=50

# Verificar portas
netstat -tulpn | grep -E ":80 |:443 |:3100 |:3101 "
```

### Erro de conexão com banco

```bash
# Verificar PostgreSQL
docker logs rebequi-postgres

# Testar conexão
docker exec rebequi-vps pg_isready -h postgres -U rebequi

# Entrar no PostgreSQL
docker exec -it rebequi-postgres psql -U rebequi -d rebequi
```

## 📚 Documentação Completa

- **DEPLOY_VPS.md** - Guia completo de deploy, backup, restore
- **.github/README.md** - Documentação dos workflows GitHub Actions
- **docker-compose.vps.yml** - Configuração Docker para produção
- **Dockerfile.vps** - Imagem Docker otimizada para VPS

## ✅ Checklist Pré-Deploy

Antes de fazer push para produção:

- [ ] Código testado localmente (`npm run dev`)
- [ ] Build VPS testado (`./scripts/test-vps-docker.sh`)
- [ ] Secret `VPS_PASSWORD` configurado no GitHub
- [ ] Certificado SSL válido no servidor
- [ ] Backup do banco de dados feito (se houver dados)
- [ ] DNS apontando para o servidor (72.60.10.108)

## 🔐 Segurança

### Gerar Secrets Seguros

```bash
# JWT_SECRET
openssl rand -hex 32

# POSTGRES_PASSWORD
openssl rand -base64 32
```

### Variáveis Sensíveis

Nunca commite:
- `.env` com valores de produção
- Senhas ou tokens
- Certificados SSL privados

## 📞 Suporte

Para problemas:
1. Verifique os logs (GitHub Actions ou servidor)
2. Teste localmente
3. Consulte `DEPLOY_VPS.md`
4. Verifique troubleshooting acima
