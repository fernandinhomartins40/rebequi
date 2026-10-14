# Melhorias integradas: vendedores, entregas e API

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
- [ ] Testar contratos, autorização, transações, reenvios e interfaces responsivas; corrigir falhas.
- [ ] Validar build/lint/tipos; commit e push diretamente na main; acompanhar testes isolados e deploy pelo GitHub Actions.
- [ ] Conferir saúde da publicação e registrar resultado final.

## Dependências e limites

- ERP/PDV efetivamente utilizado, documentação e credenciais não informados. A API implementada permite integração pelo fornecedor; homologação/conector específico depende dessas informações.
- Docker local não está em execução. Testes mutantes com PostgreSQL e navegador serão executados no banco descartável do workflow existente, antes do deploy. Produção será consultada apenas para verificação.
- Preservar arquivos locais não rastreados anteriores ao trabalho.

## Validação em andamento

- 93 testes unitários/de contrato do backend aprovados; tipos e lint do frontend aprovados (somente avisos preexistentes).
- Testes integrados adicionados ao workflow existente: isolamento do desempenho por papel; concorrência e rotação de credenciais; produtos/preços/clientes; reserva e movimentos reais de estoque; venda/pagamento/cancelamento sem duplicação; recebimento e acompanhamento de venda avulsa; interface mobile.
- VPS consultada somente para leitura: contêineres rebequi-web, rebequi-api e rebequi-postgres identificados e saudáveis antes da publicação.
- Gestão de permissões continua pelos perfis existentes; sem mecanismo paralelo de permissões. Clientes existentes devem ser vinculados antes da sincronização; a API não modifica credenciais de acesso.
