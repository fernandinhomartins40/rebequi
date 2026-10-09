# Deploy Rebequi

Existe um único workflow ativo: [deploy-production.yml](.github/workflows/deploy-production.yml). Push em `main` e execução manual publicam imagens; pull requests validam e compilam sem publicar nem acessar a VPS.

## Fluxo

1. `validate`: textos, tipos, testes, lint e invariantes de infraestrutura.
2. `build-backend` e `build-frontend`: jobs independentes e simultâneos em runners GitHub. API e migrator compartilham o estágio de compilação do backend. Cache BuildKit separado por imagem; modelos OCR ficam em camada independente do código e do SHA.
3. GHCR privado: `ghcr.io/fernandinhomartins40/rebequi-api`, `rebequi-migrator` e `rebequi-web`, tags por SHA. Deploy usa os digests retornados pelo build, nunca `latest`.
4. `integration`: em runner descartável, testa migrations, bootstrap sem sobrescrever alterações, auth, OCR local, upload/download, recriação de contêiner e backup/restore.
5. `deploy`: envia somente Compose, script e referências de imagens. A VPS faz pull, backup, migrations, troca API/web e valida saúde/TLS/release. Nenhum npm, TypeScript, Vite ou Docker build na VPS.

## Acesso e secrets

- VPS: `root@72.60.10.108`, x86_64. Docker Compose v2+, Nginx, Certbot, curl, openssl e flock devem existir.
- Preserva o secret GitHub existente `VPS_PASSWORD`. Ele é consumido pelo `sshpass -e` no runner; nunca solicitar a senha em chat ou armazená-la no repositório. Após reinstalar a VPS, o usuário deve conferir esse secret diretamente nas configurações do GitHub.
- GHCR usa `GITHUB_TOKEN` temporário, com `packages:write` somente nos builds e `packages:read` em integração/deploy. Autenticação remota vai pelo stdin SSH; Docker usa diretório temporário, removido ao terminar. Não altera o login de outras aplicações.
- [deploy-known-hosts](scripts/deploy-known-hosts) fixa a chave pública do servidor registrada na configuração inicial SSH. Mudança de identidade deve ser verificada antes de atualizar o arquivo; não usar `StrictHostKeyChecking=no`.
- O acesso local do Codex continua por chave dedicada e `ssh rebequi-vps`.

## Primeira instalação

O workflow cria somente `/opt/rebequi`, os três volumes `rebequi-*`, a rede da aplicação e o vhost do Rebequi. Não remove o vhost default nem altera aplicações vizinhas. O domínio e `www` devem apontar para a VPS para emissão TLS via HTTP-01.

Credenciais de banco, JWT, chave de criptografia e senhas iniciais da aplicação são aleatórias e ficam em `/opt/rebequi/.env.production`, modo `600`. Não são impressas no Actions. O usuário pode consultar as credenciais da **aplicação** no próprio terminal autorizado; nunca copiar a senha SSH para esse arquivo. Em updates o arquivo é preservado integralmente. Se já há um env operacional, não trocar `JWT_SECRET` nem `SETTINGS_ENCRYPTION_KEY`, pois protegem sessões e integrações.

Migrations são obrigatórias e interrompem o deploy em caso de falha. Bootstrap ocorre somente quando o banco inicialmente não tem a tabela de usuários; um marcador permite retentar uma primeira instalação incompleta. O bootstrap preserva credenciais, usuários, categorias, preço e estoque existentes. Não executar `prisma:seed` em produção.

## Persistência e rollback

- Banco: volume externo `rebequi-postgres-data`, mount `/var/lib/postgresql/data`.
- Uploads: volume externo `rebequi-uploads`, mount `/app/uploads`.
- Logs: volume externo `rebequi-logs`, mount `/app/logs`.
- Releases: `/opt/rebequi/releases/<SHA>-<run>-<attempt>`; `current` aponta para a release validada; `previous` preserva a anterior.
- Cada deploy gera dump PostgreSQL custom antes das migrations em `/opt/rebequi/backups` e confere seu catálogo com `pg_restore --list`. Restore real é exercitado no CI.
- Falhas após trocar a aplicação tentam restaurar as imagens anteriores e o vhost anterior. Não revertem migrations nem restauram o banco automaticamente. Migrations de updates devem manter compatibilidade com a release anterior; mudanças incompatíveis precisam de plano específico.
- PostgreSQL existente não é recriado no deploy de código. API/web têm uma janela curta de troca; não se promete zero downtime.
- Não há prune nem remoção automática de volumes, uploads, backups, releases ou imagens. Retenção de backups/releases exige política aprovada, dimensionamento e recuperação; backup local não cobre perda da VPS.

Logs Docker: 10 MiB × 3 por serviço. Winston: 10 MiB × 5 por arquivo (`error` e `combined`). Valores limitam crescimento futuro; não representam espaço já recuperado. OCR, Sharp, CLI de migrations e observabilidade são mantidos. Nenhum limite de RAM/pool é reduzido sem medir picos/carga.

## Verificação

```powershell
ssh rebequi-vps "docker stats --no-stream rebequi-api rebequi-web rebequi-postgres"
ssh rebequi-vps "docker ps --filter name=rebequi"
```

Plano e resultados: [plano](docs/VPS_OPTIMIZATION_PLAN.md) e [relatório](docs/VPS_OPTIMIZATION_REPORT.md).

`docker-compose.production.yml` é a fonte de verdade; `docker-compose.vps.yml` inclui esse arquivo como alias. Dockerfiles/Compose de desenvolvimento ou monolíticos legados não são usados pelo workflow de produção.

Referências: [GHCR no GitHub Actions](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [cache BuildKit](https://docs.docker.com/build/ci/github-actions/cache/), [Compose up](https://docs.docker.com/reference/cli/docker/compose/up/).
