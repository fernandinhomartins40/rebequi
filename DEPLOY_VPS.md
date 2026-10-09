# Deploy na VPS

O procedimento ativo está em [DEPLOY_README.md](DEPLOY_README.md).

Um workflow com builds paralelos no GitHub publica imagens no GHCR. A VPS apenas baixa imagens, aplica migrations e executa a aplicação. Deploy manual por SSH e builds na VPS não fazem parte do fluxo autorizado.
