# Melhorias integradas: vendedores, entregas e API

## PWAs separados — solicitação adicional

### Clareza da instalação no iOS

- [x] Destacar nome e ícone do aplicativo selecionado, com prévia de identificação para conferir na confirmação do Safari.
- [x] Unificar título HTML, título Apple e nomes do manifesto; preservar IDs e destinos existentes.
- [x] Separar instruções por plataforma e orientar escolher outro app antes de adicionar à Tela de Início.
- [ ] Testar troca entre os três apps, ícones/metadados/instruções e publicar a melhoria.

- [x] Conferir os PWAs existentes e os requisitos Android/iOS nas referências oficiais.
- [x] Criar identidades, manifestos e ícones distintos para Cliente, Vendas e Entregas, preservando o app Entregas instalado.
- [x] Criar página pública `/aplicativos/` com seleção e instaladores individuais, botão Android quando disponível e instruções Safari/iOS.
- [x] Reutilizar os painéis, autenticação e permissões existentes; manter cache restrito ao aviso público de falta de conexão.
- [x] Validar instalação, cancelamento do convite, manifestos, isolamento de workers/cache, acesso protegido e responsividade nos testes de navegador.
- [x] Validar build/lint/tipos e publicar pela main via GitHub Actions; conferir produção.

Resultado: commit `5b10f6f`, [workflow 38624384470](https://github.com/fernandinhomartins40/rebequi/actions/runs/38624384470) aprovado e publicado. 39 testes integrados passaram, incluindo a nova suíte dos três PWAs; build, lint e tipos aprovados. Versão confirmada por `/release.txt`, API saudável e testes públicos de navegador repetidos em `https://www.rebequi.com.br/aplicativos/`, sem mutações comerciais. Instalação nativa em aparelhos físicos Android/iOS não foi executada; manifesto, convite, instruções iOS e comportamento offline foram verificados em navegador automatizado. [Documentação dos PWAs](docs/PWAS_CLIENTE_VENDAS_ENTREGAS.md).

Referências: [Google — instalação PWA](https://web.dev/learn/pwa/installation), [Apple — adicionar app web no iPhone](https://support.apple.com/guide/iphone/iphea86e5236/ios). A instalação nativa no iOS depende da confirmação manual no menu do navegador; testes automatizados validam o fluxo web, sem simular uma instalação real no sistema operacional.

## Análise e escopo

A base já possui perfis ADMIN/MANAGER/SALES/WAREHOUSE/DRIVER, carteiras e atribuições comerciais auditadas, pedidos/orçamentos assistidos, vendas transacionais com estoque, metas e desempenho individual. A logística já cria separação na venda paga, permite conferência, romaneios, motorista, ocorrências e comprovantes; o cliente acompanha pedidos do site. A API existente consulta catálogo/estoque/pedidos/orçamentos e recebe lotes para revisão, sem sincronização direta.

Reutilizar essas estruturas. Não criar painel paralelo, conector fictício, dados de demonstração em produção ou reformulação visual.

## Execução

- [x] Analisar permissões, vendas, estoque, logística, API e validação existente.
- [x] Vendedores: preservar isolamento por carteira e gestão por perfis; acrescentar consulta mensal de desempenho da equipe para proprietário/gerente na tela existente.
- [x] Entregas: preservar fluxo de separação até recebimento; incluir acompanhamento pelo cliente de vendas vinculadas ao seu cadastro sem pedido do site.
- [x] API: acrescentar escopos explícitos para escrita de produtos/preços, estoque, clientes e vendas, mantendo credenciais atuais sem novas permissões automáticas.
- [x] API: reutilizar vínculos externos, movimentos de estoque, venda e logística; validar reenvio, versão, reserva de estoque e colisões de cadastro.
- [x] Documentar contratos OpenAPI, exemplos de integração, limites e procedimentos de conciliação.
- [x] Testar contratos, autorização, transações, reenvios e interfaces responsivas; corrigir falhas.
- [x] Validar build/lint/tipos; commit e push diretamente na main; acompanhar testes isolados e deploy pelo GitHub Actions.
- [x] Conferir saúde da publicação e registrar resultado final.

## Dependências e limites

- ERP/PDV efetivamente utilizado, documentação e credenciais não informados. A API implementada permite integração pelo fornecedor; homologação/conector específico depende dessas informações.
- Docker local não está em execução. Testes mutantes com PostgreSQL e navegador serão executados no banco descartável do workflow existente, antes do deploy. Produção será consultada apenas para verificação.
- Preservar arquivos locais não rastreados anteriores ao trabalho.

## Resultado final

- 93 testes unitários/de contrato do backend aprovados; tipos e lint do frontend aprovados (somente avisos preexistentes).
- Testes integrados adicionados ao workflow existente: isolamento do desempenho por papel; concorrência e rotação de credenciais; produtos/preços/clientes; reserva e movimentos reais de estoque; venda/pagamento/cancelamento sem duplicação; recebimento e acompanhamento de venda avulsa; interface mobile.
- VPS consultada somente para leitura: contêineres rebequi-web, rebequi-api e rebequi-postgres identificados e saudáveis antes da publicação.
- Gestão de permissões continua pelos perfis existentes; sem mecanismo paralelo de permissões. Clientes existentes devem ser vinculados antes da sincronização; a API não modifica credenciais de acesso.
- Implementação publicada pelo commit `8863544` na main. [GitHub Actions 38501254995](https://github.com/fernandinhomartins40/rebequi/actions/runs/38501254995) concluído com sucesso: validação, imagens GHCR, integração e deploy.
- 38 testes integrados aprovados no PostgreSQL descartável, incluindo concorrência, reserva, venda/pagamento/cancelamento, isolamento de vendedores, recebimento e interface mobile; zero falhas. Também aprovados os testes existentes de migração, persistência, backup/restauração e rollback do deploy.
- Pós-publicação: API `status=ok`, frontend `healthy`, ambos os contêineres saudáveis; tabela aditiva de recibos confirmada via SELECT. OpenAPI 1.1.0 com 14 caminhos disponível; nova consulta de entregas sem sessão retorna 401.
- Três objetivos atendidos na aplicação. Dependência externa remanescente: identificar/homologar o ERP/PDV real e configurar o integrador com credencial emitida pelo proprietário, usando [o contrato documentado](docs/API_SINCRONIZACAO.md). Nenhuma credencial de teste emitida em produção.
