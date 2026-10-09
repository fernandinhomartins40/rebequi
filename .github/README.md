# GitHub Actions

Há um único workflow: [deploy-production.yml](workflows/deploy-production.yml).

Validação e builds de backend/frontend iniciam simultaneamente. Integração testa imagens com banco descartável; o deploy em `main` baixa imagens GHCR por digest e preserva volumes, configuração, backup e release anterior.

Configuração e operação: [DEPLOY_README.md](../DEPLOY_README.md).
