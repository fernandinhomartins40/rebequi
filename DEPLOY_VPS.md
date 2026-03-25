# Deploy VPS

Este documento foi consolidado.

O workflow legado `deploy-vps.yml` foi removido para eliminar um erro de validacao do GitHub Actions causado por uso invalido do contexto `secrets` em `job.if`.

Use apenas:

- [`.github/workflows/deploy-production.yml`](./.github/workflows/deploy-production.yml)
- [`docker-compose.production.yml`](./docker-compose.production.yml)
- [`docker-compose.vps.yml`](./docker-compose.vps.yml) apenas como alias manual compativel com a mesma topologia de producao

## Requisitos

- Secret configurado no GitHub: `VPS_PASSWORD`
- VPS com `docker`, `nginx`, `certbot`, `curl`, `openssl` e `tar`
- DNS de `rebequi.com.br` e `www.rebequi.com.br` apontando para a VPS

## Comportamento do deploy atual

- Build e subida da stack Docker em producao
- PostgreSQL persistido em volume Docker
- Frontend exposto apenas em `127.0.0.1:3190`
- Proxy reverso pelo Nginx do host
- Emissao e renovacao inicial de certificado para os dois dominios
- Health checks finais em `/health` e `/api/health`
