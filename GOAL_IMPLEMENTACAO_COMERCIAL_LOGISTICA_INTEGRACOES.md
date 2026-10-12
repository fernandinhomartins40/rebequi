# Gestão comercial, logística e integrações — roteiro de execução

## Estado atual e tarefas restantes — atualização de 12/10/2026

Workflow 38313327790, commit d9697ec: concluído com sucesso, incluindo banco/API/navegador reais e deploy. Estão publicados atribuição/proteção comercial, Meus atendimentos, consulta de catálogo, separação/conferência, acompanhamento inicial pelo cliente e API externa somente de leitura. O plano completo ainda não está concluído.

Próximas tarefas, na ordem de execução:

- [ ] Concluir a validação integrada do perfil WAREHOUSE, sem acesso comercial/financeiro; implementação pronta, deploy ainda bloqueado pelo gate.
- [ ] Cadastro de motoristas/veículos e permissões por tarefa, dados físicos de capacidade conferidos.
- [ ] Romaneio, atribuição, agendamento e ordem manual das paradas; capacidade/massa/volume desconhecidos explícitos.
- [ ] Carregamento, saída, entrega/retirada parcial por item, recebedor, ocorrência/reagendamento e reentrega.
- [ ] Evidências privadas com consentimento/crop/compressão/quota e UI mobile/PWA operacional do motorista.
- [ ] Evoluir unidade comercial e conversões para decimais/granel sem quebrar estoque, pedidos e devoluções existentes.
- [ ] Acompanhamento completo pelo cliente com privacidade e histórico público controlado; sem localização/ETA presumidos.
- [ ] Vendedor criar orçamento/pedido para carteira autorizada, distribuição de solicitações e notificações persistentes.
- [ ] Metas, desempenho e regras/ledger de comissão próprios dos vendedores, configuração prospectiva e conciliação.
- [ ] Importação estruturada com prévia, vínculos externos únicos, fonte oficial por domínio, inbox/outbox e conflito/replay.
- [ ] API externa de escrita autorizada, eventos/webhooks assinados, exportação ampliada, rastreabilidade persistente e reprocessamento.
- [ ] Conector ERP/PDV específico após identificação/documentação; usuário ainda não sabe qual sistema usa. Continuar módulos independentes.
- [ ] Homologação externa, fluxo orçamento→venda→depósito→entrega, testes concorrentes/reversões/indisponibilidade e piloto em aparelhos reais.
- [ ] Concluir pendências da plataforma de parceiros registradas em docs/PARCEIROS_PWA_IMPLEMENTACAO.md quando retomar aquele escopo: expiração/lotes, níveis/campanhas, conciliação, outros canais/compras próprias, compartilhamento, conteúdo/oportunidades/push e piloto.

Retomada automática: conferir main/workflow e primeira tarefa incompleta; implementar/testar/corrigir, commit/push na main e atualizar este registro. Não esperar ERP/chaves para tarefas independentes. Nenhuma integração externa, regra financeira ou gasto é ativado automaticamente.

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

- [x] Modelar atribuição versionada e auditoria de cliente/lead/orçamento/pedido/venda.
- [x] Isolar listas, métricas, detalhes, propostas e documentos por SALES.
- [x] Revalidar atribuição dentro das mutações e controlar concorrência/reenvio.
- [x] Oferecer consulta de catálogo para vendedor sem permitir edição.
- [x] Fluxo de distribuição/retribuição pela gestão e painel de trabalho do vendedor.
- [x] Herança de responsável ao converter orçamento/pedido em venda.
- [ ] Testes de dois vendedores, admin, cliente, acesso por ID/arquivo, reatribuição e conta desativada.

### Etapa 1 — Atendimento e desempenho

- [ ] Vendedor cria orçamento/pedido para cliente autorizado, usando motor/proposta existentes.
- [ ] Caixa de pendências persistente e distribuição administrativa; sem notificação fictícia.
- [ ] Metas configuradas por período/equipe e indicadores calculados de eventos reais.
- [ ] Regras de comissão de vendedor versionadas, opt-in administrativo e estornos; separadas do programa de parceiros, com núcleo monetário existente. Nenhuma taxa inventada/ativação automática.
- [ ] Trilhas de alterações críticas; permissões financeiras próprias, registro de pagamento sem transferência.

### Etapa 2 — Depósito e liberação

- [ ] Papéis/permissões operacionais na matriz existente, sem acesso financeiro desnecessário.
- [x] Fulfillment/itens/eventos, endereço conferido, entrega ou retirada, prazo confiável opcional.
- [ ] Tarefa na transação da venda elegível; pendente bloqueado; exceções autorizadas.
- [ ] Separar/conferir/registrar falta, localização opcional, prioridade e fila paginada.
- [ ] Parcial por item, controle de quantidade acumulada e conflito de versão.
- [x] Cancelamento/devolução integrados sem nova baixa/reposição duplicada de estoque na preparação; estender invariantes para a futura entrega física.

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

### Motorista e tarefas atribuídas — 12/10/2026

Perfil DRIVER na matriz compartilhada e cadastro de equipe, com apenas logistics:drive. Tela Minhas entregas carregada sob demanda: paginação, etapa real, endereço/agendamento e quantidades conferidas/recebidas; não mostra financeiro, preços, notas/localização do depósito ou outras tarefas. Backend filtra por motorista autenticado, entrega paga não cancelada; consulta por ID também exige vínculo. Conta desativada ou papel alterado é revalidado pelo middleware existente a cada chamada. A atribuição ADMIN/MANAGER fica na tarefa do Depósito em três passos, motivo obrigatório, versão esperada, intenção idempotente e evento imutável; exige motorista ativo, modo DELIVERY e preparação/pronto. Troca para retirada exige primeiro remover o motorista. Não atribui históricos automaticamente, não cria contas reais, não registra entrega realizada nem simula romaneio.

Migração 20261012100000_driver_assignments aditiva (papel DRIVER, FK opcional e índice de tarefas próprias). Tipos, lint, 60 testes unitários, textos e build aprovados localmente. Integração acrescenta dois motoristas, reenvio/origem/permissões, bloqueio de retirada, dados mínimos, detalhe ID, mobile do motorista, reatribuição mobile da gestão, revogação e conta desativada. Teste isolado e deploy deste incremento ainda dependem do workflow.

Workflow 38319666509: logística/histórico passaram, mas indicação pública voltou a falhar (API 200, botão ausente); deploy bloqueado. Workflow 38320249189 de veículos segue em teste integrado, incluindo o diagnóstico de tela/texto e a espera pelo fechamento do recorte. Não considerar veículos/motoristas publicados antes do gate. Próximas etapas continuam romaneio/carga/saída/recebimento parcial, evidências privadas, acompanhamento completo e integrações restantes.

### Cadastro de veículos — 12/10/2026

Implementado cadastro paginado de veículos em Depósito → Gerenciar veículos, restrito a ADMIN/MANAGER por logistics:fleet. Wizard em três passos: identificação/placa, capacidade/restrições, confirmação. Placa normalizada/única, carga útil kg e volume m³ em Decimal(12,3), sem conversão ou capacidade fictícia quando desconhecida. Inativação preserva cadastro e histórico, sem exclusão. Escritas transacionais com intenção idempotente, versão esperada e histórico imutável de snapshots/motivos. Nenhum veículo real cadastrado durante desenvolvimento. Migration 20261012090000_logistics_vehicles aditiva. Motoristas, atribuição e romaneios continuam pendentes.

60 testes unitários, tipos backend/frontend, lint, textos e build passaram localmente. Teste isolado acrescenta origens/permissões, normalização, capacidade exata/desconhecida, duplicação/reenvio, conflito de versão, inativação, histórico sem chaves internas e cadastro mobile. Gate integrado ainda pendente.

Workflow 38319186948 falhou no navegador em indicação pública (API retornou 200, botão não apareceu) e portfólio (geometria medida antes de confirmar fechamento do recorte); deploy foi bloqueado. Acrescentada captura de tela/texto da indicação na falha para obter evidência da tela real. Portfólio agora aguarda o diálogo de recorte fechar antes de verificar responsividade, mantendo a asserção. Não declarar essas falhas corrigidas antes de um novo gate completo. O workflow intermediário d1239eb foi cancelado pela substituição do run pendente; suas mudanças estão nos commits posteriores.

Checklist da fundação atualizado com os itens comprovados pelo workflow 38313327790 já publicado. A suíte comercial cobre dois vendedores/reatribuição; completar o caso explícito de conta desativada antes de marcar a última linha da etapa 0.

### Histórico completo do depósito — 12/10/2026

Acrescentada consulta paginada de todos os eventos operacionais, 20 por página, ordenados por versão. A tela carrega o histórico apenas quando aberto e permite consultar eventos anteriores. Acesso restrito à permissão logistics:manage; não retorna chaves de idempotência nem fingerprints. Teste integrado cria mais de 20 eventos pela API e verifica paginação sem repetição, ordem, validação e bloqueio ao cliente. TypeScript backend/frontend, lint, 59 testes unitários, textos e build frontend passaram localmente. Integração PostgreSQL/API/navegador aguarda o workflow deste incremento.

Workflow 38319186948: builds frontend/backend e verificações passaram; validação integrada ainda em execução no momento desta atualização. Execução 38319280169 permanece aguardando. Não considerar estes incrementos publicados antes da conclusão do deploy. Próximo bloco: frota/motoristas e expedição, preservando saldo, auditoria e permissões; demais pendências continuam no roteiro.

### Validação da retomada

O incremento anterior a2fd288 acrescentou o perfil WAREHOUSE e testes de acesso operacional sem financeiro. A execução 38319186948 foi consultada nesta retomada e ainda estava em andamento; sua publicação não está confirmada. O próximo incremento deve concluir esse gate antes de ampliar o fluxo de expedição. Acrescentada guarda explícita de etapa na liberação READY para impedir que futuras etapas de carga/entrega voltem à expedição por essa ação.

12/10/2026: pedido lido, rotas/modelos/serviços auditados e fontes oficiais pesquisadas. Nenhuma conexão ERP ativada. Fundação comercial priorizada por exposição transversal de SALES. Etapas acima ainda não concluídas.

Ao retomar: ler este GOAL, AGENTS.md, git status/log e último resultado do workflow; preservar arquivos do usuário e trabalhar na main. Executar a primeira tarefa incompleta tecnicamente viável; registrar decisões/testes/commit/publicação. Não repetir autorização para mudanças seguras neste escopo. Diante de bloqueio externo, registrar e continuar tarefas independentes. Nunca confundir build/teste sintético com integração externa operacional.

### Incremento comercial 1 — 12/10/2026

Implementados campos de responsável/versão nos cinco domínios, auditoria imutável, permissão commercial:assign e distribuição pela gestão em três passos. Filtros por SALES abrangem listas e métricas; detalhe, status, proposta, reserva, venda/devolução e mídia privada verificam vínculo no backend. Revalidação em locks/transações ou predicado de update impede escrita após reatribuição. CRM mostra ao vendedor somente notas próprias e histórico/métricas de seus registros. OCR global exige gestão de integrações. Consulta de catálogo usa catalog:read, sem liberar edição. Proposta aceita herda responsável para pedido; venda preserva responsável do pedido e operador separadamente. Vendas antigas registradas pelo próprio SALES permanecem acessíveis somente enquanto nunca explicitamente reatribuídas. Nenhuma redistribuição histórica automática.

57 testes unitários passaram; TypeScript backend/frontend e build frontend aprovados. Lint sem erros, com dois avisos de hooks preexistentes em quotes. Integração adicionada para dois vendedores, acesso por ID, catálogo sem edição, métricas/histórico, notas, herança proposta/pedido/venda, revogação, disputa de versão e distribuição mobile. PostgreSQL/API/navegador reais serão verificados no workflow isolado. Migração 20261012050000_commercial_assignment aditiva. Logística, API externa e demais etapas ainda não implementadas; não marcar etapa 0 integralmente concluída antes do gate e restantes tarefas.

### Incremento comercial 2 — 12/10/2026

Tela Meus atendimentos com permissão commercial:work, entrada padrão de SALES e rota carregada sob demanda. Consulta apenas registros atribuídos ao próprio colaborador (inclusive ADMIN/MANAGER nessa tela), contagens reais e até cinco pendências mais antigas por domínio. Retornos usam followUpAt vencido; pedidos/orçamentos/pagamentos usam estados atuais, sem notificação presumida. Busca de nome/SKU traz preço e disponibilidade calculada de stock/reservedStock sem editar. Link de orçamento seleciona quoteId; responsáveis continuam independentes por registro. Tipos e build passaram, lint sem erros. Teste isolado acrescenta duas carteiras e interface mobile 320 px. Workflow de fd6ca3a ainda em validação; esta entrega também depende do gate completo.

### Incremento logística 1 — 12/10/2026

Base de depósito implementada: nova venda paga ou primeira confirmação de pagamento cria Fulfillment/itens/evento na transação da venda. Não gera tarefas para vendas antigas já pagas nem duplica ao alternar pendente/pago. Inicialmente aguarda confirmação de retirada/entrega e endereço real quando entrega. Interface Depósito com fila paginada, etapas, saldo após devoluções, localização opcional, separação, conferência, falta/divergência e liberação para expedição. Operações em três passos, versão esperada e chave idempotente; pendente bloqueado. ADMIN/MANAGER usam logistics:manage; papéis próprios do depósito/motorista seguem pendentes.

Separação/conferência não movimentam estoque novamente. Devolução invalida conferência e exige revisão do saldo; cancelamento da venda cancela tarefa na mesma transação. Lock na ordem venda → tarefa mantém concorrência com devoluções/pagamentos. Histórico imutável; trigger bloqueia cancelamento por imagem antiga que ignoraria tarefa ativa. Quantidades são unidades comerciais inteiras atuais: nenhuma conversão presumida para granel/massa/volume. Pronto para expedição não é entregue. Carregamento/rota/entrega/recebedor/prova, entregas parciais, frota e acompanhamento pelo cliente ainda não estão implementados.

Migrações 20261012060000_fulfillment e 20261012061000_fulfillment_guards aditivas. 57 testes unitários, texto pt-BR, tipos, lint dos novos componentes e build aprovados. Integração acrescenta tarefa atomicamente após pagamento, idempotência, bloqueio de quantidade/etapa, estoque preservado, revisão após devolução, bloqueio por pagamento, cancelamento e ocorrência mobile. Cleanup antigo da suíte preserva snapshots venda/pedido porque o banco inteiro é descartado ao final; não desativa triggers nem apaga auditoria para passar teste. Validação integrada e publicação ainda pendentes.

O workflow comercial fd6ca3a passou e foi publicado. A versão seguinte foi bloqueada apenas pelo verificador textual interpretando query string em rota acentuada como texto corrompido; corrigido com encodeURIComponent sem enfraquecer o verificador. Workflow 38311137778 da correção 3f6dc74 está em validação. Não declarar a nova tela comercial ou logística publicadas antes dos gates respectivos.

### Acompanhamento inicial do cliente — 12/10/2026

Pedidos do proprietário autenticado incluem somente status/modo/agendamento/atualização da tarefa, sem notas, localização no depósito, eventos internos ou identificação da equipe. Painel do cliente mostra preparação/conferência e bloqueio por pagamento, sem afirmar entrega realizada. Agendamento só aparece quando registrado. Texto, tipos, lint e build aprovados; integração confere o conjunto exato de campos e ausência de localização interna. Liberação final ainda depende do workflow completo.

Workflow 38311137778 passou nos builds/checks, mas o navegador detectou ambiguidade no título Meus atendimentos (h1 da barra e h2 do conteúdo); teste agora seleciona explicitamente h2. Outra falha foi timeout ao abrir indicação pública; acrescentada captura da resposta real da API para identificar status/corpo em vez de apenas aguardar botão. Não declarar a falha de indicação resolvida antes da nova evidência. Base comercial fd6ca3a permanece publicada; alterações subsequentes estão aguardando validação.

### API externa de leitura — 12/10/2026

Credenciais próprias emitidas/revogadas pelo painel Integrações → ERP/PDV e API. Token aleatório 256 bits exibido uma única vez; banco guarda hash SHA-256, escopos, emissor, prazo e revogação. Emissão por intenção evita dupla credencial em reenvio, sem recuperar segredo perdido; revogação idempotente e auditada. Nenhuma credencial real foi emitida durante desenvolvimento. Sessão de usuário não autentica API externa. Cada GET confere token/expiração/revogação e escopo, limita 30/minuto por credencial além do limiter geral; erros de limite passam a JSON success/error compatível com o cliente existente.

GET /api/external/v1/products, /stock e /orders são consultas reais com paginação/updatedSince, centavos string, unidade comercial explicitada e requestId; pedidos excluem dados pessoais do comprador. APIs private/no-store. OpenAPI 3.1.1 em /openapi.json e explorador de leitura com token apenas em memória. Guia em docs/API_EXTERNA_ERP_PDV.md documenta limites e reconciliação com sobreposição porque paginação não é snapshot transacional. Não há cursor garantido, importação, webhook, fonte externa oficial, envio a ERP ou integração operacional com fornecedor nesta etapa. Rastreabilidade por requestId não representa histórico persistente de cada GET.

Migração 20261012070000_external_api_clients aditiva. 59 testes unitários, texto, tipos, lint e build aprovados. Teste integrado adiciona emissão/origem/ownership/hash-only, repetição, escopos, expiração/revogação, limite real, OpenAPI, consultas e emissão mobile sem recuperação de segredo. Execução somente em PostgreSQL descartável; testes desse incremento ainda dependem do workflow. Sem contratação, novo contêiner ou chamada externa.

Wizard de ocorrência do depósito corrigido: valida motivo apenas depois que a etapa de preenchimento foi apresentada (883d9b6). Falha transitória da indicação não se repetiu no workflow c4e1f0b; captura de resposta foi mantida para diagnóstico. Título ambíguo do teste comercial já corrigido selecionando nível 2. Workflow mais recente segue em validação; não afirmar publicação dos incrementos novos antes do gate final.
