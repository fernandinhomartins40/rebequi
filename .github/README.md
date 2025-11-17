# GitHub Actions - Deploy Automático

Este diretório contém os workflows do GitHub Actions para deploy automático da aplicação Rebequi.

## 📋 Workflows Disponíveis

### deploy-vps.yml

Deploy automático para VPS em produção.

**Trigger:**
- Push para branch `main`
- Manual via GitHub Actions UI (workflow_dispatch)

**O que faz:**
1. Sincroniza código via rsync
2. Valida estrutura do projeto
3. Cria arquivo `.env` de produção
4. Faz build das imagens Docker
5. Executa migrações do Prisma
6. Configura Nginx
7. Inicia aplicação
8. Executa health checks

## 🔐 Secrets Necessários

Configure os seguintes secrets no GitHub (Settings → Secrets and variables → Actions):

### VPS_PASSWORD

Senha SSH do usuário root no servidor VPS.

**Como configurar:**

1. Vá para: `Settings` → `Secrets and variables` → `Actions`
2. Clique em `New repository secret`
3. Nome: `VPS_PASSWORD`
4. Value: Sua senha SSH
5. Clique em `Add secret`

## 🧪 Testar Localmente

Antes de fazer deploy para produção, teste o build localmente:

```bash
# Dar permissão de execução
chmod +x scripts/test-vps-docker.sh

# Executar teste
./scripts/test-vps-docker.sh
```

O script irá:
- Criar `.env` de teste
- Build da imagem VPS
- Iniciar containers localmente
- Executar health checks
- Mostrar logs e status

## 📊 Monitorar Deploy

### Via GitHub Actions

1. Vá para a aba `Actions` no repositório
2. Clique no workflow em execução
3. Acompanhe os logs em tempo real

### Via SSH no Servidor

```bash
# Conectar ao servidor
ssh root@rebequi.com.br

# Ver logs do deploy
cd /root/rebequi
docker-compose -f docker-compose.vps.yml logs -f
```

## 🔄 Fazer Deploy Manual

Se precisar fazer deploy manual (sem GitHub Actions):

```bash
# Conectar ao servidor
ssh root@rebequi.com.br

# Navegar para o diretório
cd /root/rebequi

# Atualizar código
git pull origin main

# Rebuild e restart
export BUILD_TIMESTAMP=$(date +%s)
docker-compose -f docker-compose.vps.yml build --no-cache
docker-compose -f docker-compose.vps.yml up -d

# Verificar status
docker-compose -f docker-compose.vps.yml ps
docker logs rebequi-vps -f
```

## 🐛 Troubleshooting

### Workflow falhou na etapa de rsync

**Problema:** Erro de autenticação SSH

**Solução:**
1. Verifique se o secret `VPS_PASSWORD` está correto
2. Teste SSH manualmente: `ssh root@rebequi.com.br`

### Workflow falhou no build

**Problema:** Erro durante `docker build`

**Solução:**
1. Verifique os logs do GitHub Actions
2. Teste o build localmente com `./scripts/test-vps-docker.sh`
3. Verifique se todos os arquivos necessários estão commitados

### Workflow falhou no health check

**Problema:** Aplicação não responde após 15 tentativas

**Solução:**
1. Conecte ao servidor via SSH
2. Verifique logs: `docker logs rebequi-vps`
3. Verifique status do supervisord: `docker exec rebequi-vps supervisorctl status`
4. Verifique PostgreSQL: `docker logs rebequi-postgres`

### Deploy bem-sucedido mas site não carrega

**Problema:** Nginx no host não está configurado

**Solução:**
1. Verifique configuração do Nginx: `nginx -t`
2. Verifique se o site está habilitado: `ls -la /etc/nginx/sites-enabled/rebequi.conf`
3. Recarregue Nginx: `systemctl reload nginx`

## 📝 Customizar Workflow

Para modificar o workflow de deploy, edite:

`.github/workflows/deploy-vps.yml`

Principais seções customizáveis:

### Portas

```yaml
# No arquivo docker-compose.vps.yml
ports:
  - "3101:3000"  # Backend
  - "8080:8080"  # Frontend
```

### Variáveis de Ambiente

```yaml
# No script de deploy (seção "Criar arquivo .env")
PORT=3100
POSTGRES_PASSWORD=senha_segura
JWT_SECRET=chave_segura
```

### Timeout

```yaml
# Na configuração do ssh-action
timeout: 300s        # Timeout total
command_timeout: 300s # Timeout de cada comando
```

## ✅ Checklist Pré-Deploy

Antes de fazer push para `main`:

- [ ] Código testado localmente
- [ ] Build VPS testado com `./scripts/test-vps-docker.sh`
- [ ] Secret `VPS_PASSWORD` configurado no GitHub
- [ ] DNS apontando para o servidor
- [ ] Certificado SSL configurado no servidor
- [ ] Nginx configurado no servidor
- [ ] Backup do banco de dados feito (se houver dados em produção)

## 🔗 Links Úteis

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)

## 📞 Suporte

Para problemas com o workflow:
1. Verifique os logs do GitHub Actions
2. Teste localmente com o script de teste
3. Verifique este README para troubleshooting
4. Consulte o arquivo `DEPLOY_VPS.md` para mais detalhes de deploy
