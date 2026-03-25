# Deploy Rebequi

O fluxo de deploy ativo do repositório e o arquivo [`.github/workflows/deploy-production.yml`](./.github/workflows/deploy-production.yml).

O workflow legado `deploy-vps.yml` foi removido porque continha uma expressao invalida em GitHub Actions e nao representa mais a arquitetura atual de producao.

## Fluxo atual

- Disparo automatico em push para `main`
- Disparo manual por `workflow_dispatch`
- Unico secret exigido: `VPS_PASSWORD`
- Dominio principal: `rebequi.com.br`
- Dominio secundario: `www.rebequi.com.br`
- Aplicacao web exposta apenas em `127.0.0.1:3190` na VPS
- Nginx do host faz o proxy para as portas internas dos containers

## Artefatos oficiais de producao

- Workflow: [`.github/workflows/deploy-production.yml`](./.github/workflows/deploy-production.yml)
- Compose: [`docker-compose.production.yml`](./docker-compose.production.yml)
- Ponteiro raiz: [`deploy-production.yml`](./deploy-production.yml)
- Alias manual compativel: [`docker-compose.vps.yml`](./docker-compose.vps.yml)

## Resumo operacional

1. O GitHub Actions empacota o repositorio e envia para a VPS com `sshpass`, usando apenas `VPS_PASSWORD`.
2. A stack Docker sobe `postgres`, aplica migracoes e depois sobe `api` e `web`.
3. O Nginx do host publica `rebequi.com.br` e `www.rebequi.com.br` apontando internamente para `127.0.0.1:3190`.
4. O workflow valida `/health` e `/api/health` antes de concluir o deploy.
