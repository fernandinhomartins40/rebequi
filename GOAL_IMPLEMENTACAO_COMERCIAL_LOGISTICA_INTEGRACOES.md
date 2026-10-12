# Gestão comercial, logística e integrações — roteiro de execução

## Objetivo e autorização

Implementar vendedores com carteira e atribuição, operação de depósito/entregas e integração ERP/PDV usando os módulos existentes. Solicitação de 12/10/2026: execução incremental autônoma, dados reais, testes e publicação na main. Não criar branches, ativar conexões externas, alterar regras financeiras sensíveis, contratar serviços ou executar operações destrutivas. Deploy somente GitHub Actions/GHCR. Este arquivo é roteiro de trabalho, não indicação de conclusão.

## Diagnóstico verificado

- React/Vite/React Query; Express/Prisma/PostgreSQL; uma instalação da loja Rebequi. Não existe tenancy entre lojas: não anunciar isolamento multiempresa sem implementá-lo. Contas da equipe são internas a esta instalação; não aceitar storeId arbitrário do cliente.
- Sessão JWT em cookie HttpOnly, conta ativa e papel revalidados no servidor. Matriz compartilhada `packages/shared/src/constants/access.ts`: ADMIN, MANAGER, CATALOG_MANAGER, MARKETING, SALES e CUSTOMER. Cadastro/ativação/desativação da equipe já existem. Reutilizar essa matriz; permissões por registro precisam ser acrescentadas.
- SALES tem pedidos, vendas, clientes e orçamentos; atualmente listas, métricas e alguns documentos abrangem a equipe inteira. Prioridade: atribuição de registro, filtros e autorização de detalhe/mutação/mídia no backend. Ocultar botões é insuficiente. OCR global e indicadores administrativos exigem permissão apropriada.
- Cliente é User CUSTOMER; CRM mantém estágio/tags/notas/follow-up. Pedidos CustomerOrder e orçamentos QuoteRequest têm proprietário cliente. Propostas versionadas preservam preço/validade e geram um pedido único após aceite.
- Sale guarda operador que registrou, pagamento, itens e snapshots; venda abate estoque transacionalmente. `registeredById` é auditoria da operação, não substitui vendedor responsável. Cancelamento/devolução parcial, rateio, ledger de parceiros e proteção de rollback existem; preservar esses contratos.
- Estoque usa Product.stock/reservedStock, StockMovement e StockReservation. Itens de venda/pedido são inteiros; QuoteItem aceita quantidade fracionada. Granel/unidades físicas exigem evolução explícita, sem interpretar saco como tonelada ou m³.
- Não existe entidade logística, endereço de entrega confiável, romaneio, frota, motorista, prova de entrega, capacidade ou rastreamento real.
- Marketplace tem conectores, credenciais protegidas, identificadores externos e outbox PostgreSQL com lease/retentativas. Worker atual invalida catálogo local; tarefa concluída não significa sincronização externa. Não reutilizar status de marketplace como ERP funcionando.
- Imagens públicas de produto e documentos privados têm tratamento distinto; crop/compressão WebP e volume local existentes. Provas logísticas devem ter ownership próprio, limites e acesso autenticado.
- Padrões de painel, listas, formulários, impressão e PWA reutilizáveis. Builds paralelos no GitHub, migração aditiva e teste com PostgreSQL/API/navegador descartáveis antes de deploy.

## Arquitetura e decisões

1. **Atribuição:** responsável comercial explícito em cliente, lead, orçamento, pedido e venda; FK para colaborador com remoção SetNull e versão de atribuição. Histórico append-only com operador/motivo/anterior/novo. ADMIN/MANAGER redistribuem; SALES só consulta e opera vínculos autorizados. Sem atribuir registros históricos em massa automaticamente.
2. **Continuidade:** orçamento → proposta → pedido → venda preserva responsável; operador continua registrado separadamente. Pedido sem vendedor fica na fila administrativa. Carteira do cliente não deve expor vendas/notas de outro atendente. Reatribuição revoga acesso e precisa ser conferida junto à escrita, evitando TOCTOU.
3. **Logística:** Fulfillment ligado à venda, itens com quantidade operacional e unidade física, eventos imutáveis e versão esperada; separação, conferência, pronto, carregamento, saída, entrega/retirada e ocorrência são estados próprios. Não reutilizar OrderStatus.COMPLETED como prova de entrega.
4. **Liberação:** venda paga elegível pode criar tarefa operacional atomicamente; pendente nunca libera implicitamente. Exceção comercial de liberação exige autorização/motivo/auditoria. Não criar tarefas retroativas automaticamente. Separação/entrega não abatem estoque novamente: estoque já foi movimentado pela venda. Devolução física usa o módulo de devolução existente.
5. **Quantidades:** especificar unidade comercial, fator de conversão e medidas de carga conferidas; decimais como strings/Decimal, dinheiro em centavos. Para granel, previsão e medição realizadas separadas. Capacidade insuficiente/massa desconhecida impedem declarar veículo validado, sem conversão inventada.
6. **Rotas:** planejamento manual por região/data/prioridade e ordem de paradas, com restrições. Link para navegação por ação do motorista; nenhuma geolocalização contínua, ETA ou otimização paga presumida.
7. **Integração:** contratos versionados `/api/external/v1`, cliente de integração com escopos mínimos, chave exibida só na emissão e hash no banco, revogação, expiração, limite por cliente e requestId. Usar autenticação externa distinta de cookie, mantendo autorização central por domínio.
8. **Identidade externa:** conexão + tipo + ID externo únicos; preservar SKU/GTIN e origem. Inbox idempotente com fingerprint; outbox na transação de negócio, lease, backoff, falha terminal e reprocessamento auditado. Não sobrescrever divergência de estoque/preço sem política de autoridade. Ordem/versão do evento impede regressão e loops.
9. **Autoridade:** configuração explícita por domínio (produtos/preços/estoque/clientes/pedidos/pagamentos), padrão local até escolha validada. ERP desconhecido não é ativo. Movimento recebido não pode subtrair estoque que a venda local já baixou. Pagamento exige evento verificado e regra de reconciliação, sem crédito por webhook não autenticado.
10. **Conectores:** adapters de capacidades (consulta/escrita/webhook) por ERP; não afirmar compatibilidade universal. Base REST e importação estruturada com prévia/validação são independentes de fornecedor. Endpoints externos fixos/verificados, timeout e limite de resposta; SSRF/redirecionamento proibidos. Credenciais criptografadas no backend, nunca em chat/log/frontend.
11. **Webhook:** assinatura e janela anti-replay conforme contrato do fornecedor; sem emular RFC completa com HMAC caseiro. Saída genérica sem PII desnecessária, entrega persistente/limitada, revogação observada, endpoint validado e sem redirecionamentos. Arquivo estruturado também exige dry-run e idempotência.
12. **UX:** painel operacional por função, tarefa em até três passos quando possível, componentes existentes, filtros/paginação/estados claros. Drawer/página conforme padrão atual, linguagem direta, mobile 320/390 e tablet/desktop. Nenhum número de desempenho fictício.
13. **Infra:** PostgreSQL/outbox/worker atuais; sem Redis, IA local, novo contêiner residente ou mapas pagos. Limites de imagens, filas, paginação e retenção técnica; retenção financeira/auditoria não usa a limpeza transitória de jobs.

## Plano e dependências

### Etapa 0 — Fundação e segurança comercial

- [ ] Modelar atribuição versionada e auditoria de cliente/lead/orçamento/pedido/venda.
- [ ] Isolar listas, métricas, detalhes, propostas e documentos por SALES.
- [ ] Revalidar atribuição dentro das mutações e controlar concorrência/reenvio.
- [ ] Oferecer consulta de catálogo para vendedor sem permitir edição.
- [ ] Fluxo de distribuição/retribuição pela gestão e painel de trabalho do vendedor.
- [ ] Herança de responsável ao converter orçamento/pedido em venda.
- [ ] Testes de dois vendedores, admin, cliente, acesso por ID/arquivo, reatribuição e conta desativada.

### Etapa 1 — Atendimento e desempenho

- [ ] Vendedor cria orçamento/pedido para cliente autorizado, usando motor/proposta existentes.
- [ ] Caixa de pendências persistente e distribuição administrativa; sem notificação fictícia.
- [ ] Metas configuradas por período/equipe e indicadores calculados de eventos reais.
- [ ] Regras de comissão de vendedor versionadas, opt-in administrativo e estornos; separadas do programa de parceiros, com núcleo monetário existente. Nenhuma taxa inventada/ativação automática.
- [ ] Trilhas de alterações críticas; permissões financeiras próprias, registro de pagamento sem transferência.

### Etapa 2 — Depósito e liberação

- [ ] Papéis/permissões operacionais na matriz existente, sem acesso financeiro desnecessário.
- [ ] Fulfillment/itens/eventos, endereço conferido, entrega ou retirada, prazo confiável opcional.
- [ ] Tarefa na transação da venda elegível; pendente bloqueado; exceções autorizadas.
- [ ] Separar/conferir/registrar falta, localização opcional, prioridade e fila paginada.
- [ ] Parcial por item, controle de quantidade acumulada e conflito de versão.
- [ ] Cancelamento/devolução integrados sem nova baixa/reposição duplicada de estoque.

### Etapa 3 — Frota, expedição e motorista

- [ ] Cadastro de veículo/motorista/limites de massa/volume/restrições.
- [ ] Romaneio, agrupamento manual, paradas/data/região e atribuição ao motorista.
- [ ] Conferir carga, sair, registrar ocorrência/reagendar, entregar/retirar parcialmente.
- [ ] Interface mobile/PWA do motorista com somente suas tarefas e dados necessários.
- [ ] Evidência privada limitada, recebedor e consentimento; sem exigir localização/foto sem necessidade.
- [ ] Cliente acompanha apenas seu fluxo, sem notas internas/contatos de terceiros/ETA inventado.

### Etapa 4 — API externa e importação

- [ ] Cliente de integração, escopos, token hash/rotação/revogação, origem, requestId e limites.
- [ ] OpenAPI, documentação interativa local, contratos/exemplos/erros/paginação/idempotência.
- [ ] Consulta de produtos/estoque e exportação de pedidos/orçamentos conforme escopo.
- [ ] Importação com prévia de produtos/categorias/clientes e vínculos externos únicos.
- [ ] Inbox/outbox, fontes oficiais por domínio, versões/eventos e divergências auditadas.
- [ ] Venda PDV, pagamento, cancelamento/devolução usando serviços transacionais existentes e política explícita de estoque.
- [ ] Guia de testes e replay; ambiente isolado não é produção nem simula ERP homologado.

### Etapa 5 — Conectores e operação

- [ ] Adapter registry por capacidades, credenciais criptografadas e health verificado.
- [ ] Painel configuração/autoridade/eventos/erros/reprocessamento/divergências.
- [ ] Webhooks assinados, bounded worker, retry/lease e falhas terminais.
- [ ] Implementar conector específico somente após identificação/documentação do ERP.
- [ ] Validar credenciais/homologação e ciclo real autorizado antes de ativar conexão em produção.

### Etapa 6 — Aceite ponta a ponta

- [ ] Cliente/parceiro → vendedor → proposta → pedido → venda/liberação → depósito → motorista → recebimento.
- [ ] Parcial/falta/cancelamento/devolução, pagamento pendente, duas escritas simultâneas e idempotência.
- [ ] ERP fora do ar/replay/versão antiga/loop/evento adulterado/escopo insuficiente/SSRF.
- [ ] Chrome mobile/tablet/desktop, permissões de câmera negadas e alternativa de arquivo/manual.
- [ ] Piloto em aparelhos reais, desempenho medido, fila sem perda e reconciliação estoque/financeiro.
- [ ] Relatório final por funcionalidade operacional, validação e pendência externa; sem declarar etapas não testadas como concluídas.

## Arquivos afetados

Prisma schema/migrations; matriz de acesso e schemas/tipos compartilhados; auth/ownership/private-media; controllers/services/repositories de clientes/orçamentos/pedidos/vendas; quote-proposal e sale-return; outbox existente; novos módulos commercial/logistics/external-api com dependências explícitas; painel merchant-dashboard e painel cliente; componentes reutilizados; PWA operacional; testes unitários e `tests/product` no runner isolado; OpenAPI e guia em docs. Imagens GHCR/workflow único preservados.

## Pesquisa oficial e limites de compatibilidade

- [Bling API](https://developer.bling.com.br/bling-api): OAuth 2.0 e contratos próprios; não copiar autenticação de outro ERP.
- [Omie serviços](https://developer.omie.com.br/service-list/): APIs por domínio, estoque/pedidos/faturamento distintos. [Operações](https://api.omie.com.br/docs/operacoes) descrevem consultas e mutações separadamente.
- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html): referência de contrato/documentação escolhida, sem presumir que fornecedor segue o mesmo padrão.
- [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html): referência para assinaturas HTTP; usar contrato exato de cada fornecedor, não declarar implementação do RFC sem testes correspondentes.

## Pendências externas

ERP/PDV ainda não identificado (usuário respondeu que não sabe). Não bloqueia base comercial/logística/API genérica. Conector específico depende de nome/versão, documentação/capacidades, credenciais cadastradas apenas no painel, autoridade por domínio e homologação. Metas/taxas/exceções de liberação dependem de configuração da loja, não bloquear formulários. Veículos/endereço/capacidade e teste físico dependem de dados reais. Custos de API/mapas, integração ativa, pagamentos, migração retroativa e multiempresa exigem escopo/validação próprios.

## Progresso e retomada

12/10/2026: pedido lido, rotas/modelos/serviços auditados e fontes oficiais pesquisadas. Nenhuma conexão ERP ativada. Fundação comercial priorizada por exposição transversal de SALES. Etapas acima ainda não concluídas.

Ao retomar: ler este GOAL, AGENTS.md, git status/log e último resultado do workflow; preservar arquivos do usuário e trabalhar na main. Executar a primeira tarefa incompleta tecnicamente viável; registrar decisões/testes/commit/publicação. Não repetir autorização para mudanças seguras neste escopo. Diante de bloqueio externo, registrar e continuar tarefas independentes. Nunca confundir build/teste sintético com integração externa operacional.

### Incremento comercial 1 — 12/10/2026

Implementados campos de responsável/versão nos cinco domínios, auditoria imutável, permissão commercial:assign e distribuição pela gestão em três passos. Filtros por SALES abrangem listas e métricas; detalhe, status, proposta, reserva, venda/devolução e mídia privada verificam vínculo no backend. Revalidação em locks/transações ou predicado de update impede escrita após reatribuição. CRM mostra ao vendedor somente notas próprias e histórico/métricas de seus registros. OCR global exige gestão de integrações. Consulta de catálogo usa catalog:read, sem liberar edição. Proposta aceita herda responsável para pedido; venda preserva responsável do pedido e operador separadamente. Vendas antigas registradas pelo próprio SALES permanecem acessíveis somente enquanto nunca explicitamente reatribuídas. Nenhuma redistribuição histórica automática.

57 testes unitários passaram; TypeScript backend/frontend e build frontend aprovados. Lint sem erros, com dois avisos de hooks preexistentes em quotes. Integração adicionada para dois vendedores, acesso por ID, catálogo sem edição, métricas/histórico, notas, herança proposta/pedido/venda, revogação, disputa de versão e distribuição mobile. PostgreSQL/API/navegador reais serão verificados no workflow isolado. Migração 20261012050000_commercial_assignment aditiva. Logística, API externa e demais etapas ainda não implementadas; não marcar etapa 0 integralmente concluída antes do gate e restantes tarefas.

### Incremento comercial 2 — 12/10/2026

Tela Meus atendimentos com permissão commercial:work, entrada padrão de SALES e rota carregada sob demanda. Consulta apenas registros atribuídos ao próprio colaborador (inclusive ADMIN/MANAGER nessa tela), contagens reais e até cinco pendências mais antigas por domínio. Retornos usam followUpAt vencido; pedidos/orçamentos/pagamentos usam estados atuais, sem notificação presumida. Busca de nome/SKU traz preço e disponibilidade calculada de stock/reservedStock sem editar. Link de orçamento seleciona quoteId; responsáveis continuam independentes por registro. Tipos e build passaram, lint sem erros. Teste isolado acrescenta duas carteiras e interface mobile 320 px. Workflow de fd6ca3a ainda em validação; esta entrega também depende do gate completo.
