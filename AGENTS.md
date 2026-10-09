# Acesso à produção

- Trabalhar exclusivamente na branch `main`. Fazer commit e push diretamente para `main`; não criar novas branches.

- Destino do workflow `.github/workflows/deploy-production.yml`: `root@72.60.10.108`, aplicação em `/opt/rebequi`. Por preferência do usuário, o apelido local `rebequi-vps` aponta diretamente para esse IP; usar a chave `~/.ssh/rebequi_codex_vps`.

- Consultas somente de leitura (status, logs e SELECT sem efeitos de escrita) podem ser executadas diretamente.
- Antes de qualquer escrita ou mudança em produção, explicar a ação, o impacto e obter aprovação explícita do usuário para aquela ação.
- A solicitação atual autoriza implementar otimizações seguras e reversíveis e instalar a aplicação na VPS reinstalada pelo GitHub Actions, com imagens GHCR. Não repetir pedidos de aprovação dentro desse escopo; consultar apenas diante de bloqueio real, ação destrutiva, custo adicional ou decisão irreversível.
- A VPS é compartilhada. Limitar operações aos contêineres, volumes, redes e arquivos desta aplicação Rebequi; confirmar a identificação antes de agir. Não alterar outras aplicações nem serviços compartilhados.
- Deploy exclusivamente pelo GitHub Actions. Não realizar deploy manual por SSH.
- Nunca pedir, ler, registrar ou enviar senha da VPS pelo chat ou em arquivos. Se necessário, o usuário digita a senha diretamente no próprio terminal.
- Usar chave SSH dedicada ao Codex. A chave privada fica apenas no computador local, fora do repositório; nunca exibir seu conteúdo nem transferi-la para a VPS.
- Preservar o login por senha e os mecanismos de deploy existentes.
- Verificar a identidade SSH do servidor com known_hosts; não usar StrictHostKeyChecking=no nem UserKnownHostsFile=/dev/null. Se a chave do servidor mudar, interromper e verificar a mudança com o usuário.
