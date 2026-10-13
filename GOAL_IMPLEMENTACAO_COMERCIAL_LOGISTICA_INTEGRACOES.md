# Gestão comercial, logística e integrações — roteiro de execução

## Estado atual e tarefas restantes — atualização de 13/10/2026

Workflows até 38424364723 concluídos com sucesso, incluindo banco/API/navegador reais e deploy. Estão publicados atribuição/proteção comercial, Meus atendimentos, orçamento assistido, catálogo, separação/conferência, perfis de depósito/motorista, frota, romaneio, carregamento/saída/retorno, prioridade operacional, retirada parcial com recebedor, histórico privado por papel e API externa somente de leitura com exportação de orçamentos. O plano completo ainda não está concluído.

Próximas tarefas, na ordem de execução:

- [x] Validação integrada do perfil WAREHOUSE, sem acesso comercial/financeiro — workflow 38326558378 aprovado e publicado.
- [x] Cadastro de motoristas/veículos e permissões por tarefa, dados físicos de capacidade conferidos — validado e publicado no workflow 38326558378.
- [x] Romaneio, atribuição, agendamento e ordem manual das paradas; capacidade/massa/volume desconhecidos explícitos — validado e publicado no workflow 38326558378.
- [x] Carregamento, saída e retorno ao depósito — validados e publicados até o workflow 38329771847.
- [x] Entrega/retirada parcial por item, recebedor, impedimentos por parada e reentrega — workflow 38343635783 aprovado e publicado.
- [x] Histórico explícito de reagendamento/retirada de horário — workflow 38343878418 aprovado e publicado.
- [x] Evidências privadas com consentimento, recorte/compressão/quota e UI mobile — workflow 38345724561 aprovado e publicado.
- [x] PWA operacional do motorista, cache privado excluído e reconexão — workflow 38424364723 aprovado e publicado.
- [ ] Piloto Android/iPhone conforme docs/PILOTO_MOTORISTA_PWA.md — precisa de resultados em aparelhos reais.
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

### Formulário de política de unidades no produto — 13/10/2026

Editor existente recebe painel expansível “Unidades e conversão”, consulta somente quando aberto e wizard Unidades → Conversão → Confirmar. Não escolhe valores físicos por padrão; mostra versão registrada, fator/passos e motivo de conferência, aceita vírgula decimal na UI e envia decimal canônico validado. Confirmação explícita, intenção estável em retry e expectedVersion; atualização remonta formulário com política atual. Registro apresenta aviso de preparação sem ativação de estoque/venda decimal. Política antiga permanece imutável no backend.

TypeScript/lint locais aprovados; build/textos e cenário integrado mobile adicionados para terceira versão pelo formulário, consentimento explícito, refetch e responsividade, mantendo saldo/preço inalterados. Gate/deploy deste incremento pendentes. Migração operacional/snapshots e objetivo completo continuam pendentes.


### Persistência versionada de políticas por produto — 13/10/2026

Migração aditiva 20261013030000_product_unit_policies cria política por produto/versão, unidades, fator e passo Decimal(12,3), intenção/hash, ator/motivo/data. Não preenche produtos históricos automaticamente. Restrict preserva referência ao produto; alteração/exclusão da política bloqueadas e insert exige próxima versão com lock de produto. Bounds no banco replicam unidade/fator/precisão/passo de embalagem. Consulta retorna última política e operational:false; gravação autenticada em /products/admin/:id/unit-policy exige catalog:manage, origem confiável, operador ativo, expectedVersion e intenção idempotente canônica. Auditoria na mesma transação. Não altera estoque/reserva/preço nem ativa venda fracionada.

74 testes locais, build compartilhado, TypeScript backend e textos aprovados. Cenário integrado acrescenta permissões/origem, gravação concorrente/replay, conflito de versão/conteúdo, segunda versão, replay da primeira, imutabilidade e saldos/preço preservados. Gate/deploy deste incremento pendentes. Formulário de cadastro da política, snapshots e migração decimal operacional ainda precisam ser implementados; não confundir registro preparatório com granel funcionando. Objetivo completo permanece ativo.


### Contrato de unidades validado — 13/10/2026

Workflow 38426132519, commit 2be088f: testes/infra, imagens e gate integrado concluídos com sucesso. Deploy confirmado em execução; conclusão de publicação ainda não presumida. Evidência confirma compatibilidade da biblioteca/schema com jornadas atuais e testes específicos de precisão/passos, não prova uso decimal no fluxo real ainda não integrado. Persistência/versionamento/snapshot por produto e migração coordenada de estoque, reservas, pedidos, vendas, devoluções, logística e interfaces permanecem pendentes. Objetivo completo continua ativo.


### Aritmética decimal publicada — 13/10/2026

Workflow 38425867098, commit b8674c9: concluído com sucesso, incluindo testes, imagens, gate integrado e deploy. Publicada a biblioteca exata de quantidades/conversão/centavos; não está conectada à venda ou estoque decimal e não habilita granel por si só. Contrato de unidades/passos 2be088f aguarda workflow 38426132519. Próxima integração deve conservar registros antigos como unidades comerciais legadas sem inferir unidade física, persistir políticas verificadas/versionadas e snapshots antes de permitir conversões. Goal completo continua ativo e as caixas de unidades/granel permanecem incompletas.


### Contrato explícito de unidades e passo mínimo — 13/10/2026

Schema compartilhado commercial-unit.schema.ts exige unidade comercial/estoque, fator positivo confirmado e passo mínimo, sem defaults ou inferência por nome. Mesma unidade exige fator 1; unidades/embalagens/sacos/caixas usam passo inteiro; conversão do passo não pode exigir precisão superior a milésimos. Quantidade positiva precisa ser múltiplo exato do passo. Unidade/fator desconhecidos e campos extras são rejeitados. Conversões dimensionais diferentes continuam dependendo de configuração física específica verificada; enum não homologa fator por si só.

74 testes locais passaram; build compartilhado e textos aprovados. Ajuste adicional de schema conserva safeParse para entrada decimal inválida, seguido de testes direcionados aprovados. Fundação ainda não ativa venda decimal, não modifica dados históricos nem altera moeda. Próxima integração precisa persistência/versionamento/snapshots de política, migração coordenada das quantidades e interfaces. Workflow da aritmética b8674c9 em execução na consulta desta retomada. Objetivo completo permanece ativo.


### Base exata para quantidades fracionadas — 13/10/2026

Diagnóstico confirmado: Product.stock/reservedStock, SaleItem, CustomerOrderItem, StockMovement, StockReservation, devolução e contadores logísticos usam Int; financeiro de devolução multiplica centavos por BigInt(quantity). Não basta remover .int() dos formulários. Adicionada aritmética compartilhada em commercial-quantity.ts: contrato decimal canônico de até três casas, milésimos BigInt, conversão com fator explicitamente confirmado e rejeição de precisão extra, extensão de preço em centavos half-up e devolução cumulativa conservando o total. Sem inferir unidade, fator ou conversão física por nome de produto.

72 testes locais passaram, incluindo limites, separador ambíguo, precisão, conversão, arredondamento de meia unidade monetária e devoluções parciais que recuperam todos os centavos. Build shared/textos aprovados. Esta é fundação incremental: não altera estoque/dados históricos, não ativa venda fracionada e não declara migração concluída. Próximos requisitos: unidade/fator/versionamento explícitos e snapshots, migração decimal aditiva compatível, todos os serviços/reservas/movimentos/devoluções/logística, formulários e exportações, concorrência e ciclo real. Goal completo permanece ativo.


### PWA publicado e roteiro de piloto — 13/10/2026

Workflow 38424364723 concluído com sucesso incluindo deploy; PWA/reconexão publicados. Criado docs/PILOTO_MOTORISTA_PWA.md com três etapas de instalação, operação e reconexão; critérios específicos de Android/Chrome e iPhone/Safari, privacidade de foto, recebimento parcial/reentrega, saldo, revogação e atualização. Matriz de aparelhos permanece explicitamente pendente. Não cria vendas de teste em produção nem declara piloto real executado. Quantidades fracionadas/granel e demais módulos continuam pendentes no objetivo completo.


### Gate integrado dos PWAs e reconexão aprovado — 13/10/2026

Workflow 38424364723, commit c2d1770: testes/infra, builds e gate PostgreSQL/API/navegador concluídos com sucesso. Confirma PWA do motorista, manifesto/cabeçalhos/controlador, cache apenas do aviso público, offline/reconexão, formulário preservado e nenhuma entrega antes de confirmação online, 401 de motorista desativado revogando dados, além do bootstrap offline/reconexão do PWA de parceiros e demais jornadas existentes. As falhas anteriores foram corrigidas sem remover verificações. Deploy desse workflow confirmado em execução; não presumir publicação antes da conclusão. Piloto em Android/iPhone e requisitos restantes de unidades/granel/comercial/integração continuam pendentes; objetivo completo permanece ativo.


### Reconexão de sessão ainda desconhecida — 13/10/2026

Gate 38422295134 aprovou a jornada do depósito/motorista, inclusive PWA, formulário ao reconectar e revogação de conta; falhou no retorno online de parceiros após reload offline, antes de Cadastro aprovado. Nesse bootstrap não existe identidade autenticada em memória. Listener agora mantém loading somente quando sessionUserId ainda é nulo, aguardando verificação do cookie antes do guard de login. Contas já conhecidas continuam verificadas em segundo plano sem desmontar formulário. 401 e mudança de identidade continuam limpando sessão/cache; não se presume autenticação offline. Mantidos ambos os testes reais, sem reduzir asserções, e nenhum deploy ocorreu com gate reprovado. Verificar novo gate/deploy; objetivo completo permanece ativo.


### Reconexão sem desmontar formulário autenticado — 13/10/2026

Gate 38420031291 superou a navegação offline/retorno, mas encontrou perda do wizard ao reconectar durante confirmação de entrega. Evidência de código: listener online do AuthProvider mudava status para loading, desmontando a rota inteira mesmo para a mesma conta autenticada. Agora a verificação de reconexão ocorre em segundo plano; a mesma identidade preserva formulário em memória. Erro transitório da verificação preserva sessão conhecida; bootstrap sem identidade continua sem autenticação presumida. 401 continua limpando sessão/cache privado e revogando acesso; mudança real de conta também limpa cache. Autorização ativa no servidor de cada consulta/mutação permanece obrigatória e inalterada. Não cria login offline, fila ou envio automático.

Teste de entrega continua exigindo bloqueio offline, checkbox preservado, saldo anterior no banco e confirmação real após conexão. Acrescentado teste de conta desativada enquanto offline: reconectar recebe 401 de /auth/me e retira endereço privado da tela. TypeScript/build/textos/sintaxe passaram; lint sem erros (aviso existente de Fast Refresh no AuthContext). Novo gate/deploy ainda pendentes, objetivo completo permanece ativo.


### Correção do seletor de retorno online — 13/10/2026

Gate 38418748103 terminou com falha no seletor final do PWA: a página tem título h1 do painel e h2 do conteúdo “Minhas entregas”, e o seletor sem nível encontrou os dois. Etapas anteriores de manifesto, controlador, cache restrito e navegação offline passaram até esse ponto. Teste agora exige especificamente heading nível 2 do conteúdo, mantendo todas as verificações e sem retry/bypass de permissão ou enfraquecimento do gate. Workflow antigo não publicou por falha; validar o novo incremento antes de declarar PWA concluído. Demais requisitos do objetivo continuam pendentes.


### Cabeçalhos e escopo do PWA — 13/10/2026

Configuração Nginx da própria aplicação agora serve /driver-sw.js com no-cache e Service-Worker-Allowed limitado ao prefixo de entregas, evitando tratar o worker de URL fixa como um asset imutável de um ano. Manifesto do motorista usa application/manifest+json e no-cache, como o manifesto de parceiros. Nenhum serviço compartilhado da VPS é alterado. Teste integrado verifica cabeçalhos, manifesto e escopo, além do controlador/offline/cache privado. Sintaxe do cenário e configuração de produção verificadas localmente; Nginx/runtime/browser serão exercitados pelo gate antes de deploy. Workflow 38418748103 do PWA inicial ainda em gate integrado no momento deste registro; proteção offline 2d5c50c aguarda o workflow seguinte. Objetivo completo permanece ativo.


### Proteção de confirmação quando offline — 13/10/2026

Hook compartilhado existente de conexão escuta eventos online/offline sem polling. Painel do motorista avisa ao perder conexão e orienta manter tela aberta; confirmação de carga/saída/retorno, entrega, impedimento e anexo de evidência ficam desabilitadas enquanto navegador está offline. Dados de formulário permanecem apenas na memória da tela; não há fila, envio automático ou persistência de fotos/endereços. Atualização do PWA também bloqueada offline. Reconectar permite confirmar explicitamente, mantendo checks de pagamento, saldo, versão/idempotência do servidor; navigator.onLine não substitui resposta real da API quando a conexão parece disponível mas falha.

Testes integrados acrescentam aviso dinâmico, confirmação desabilitada durante entrega, checkbox preservado e saldo no banco inalterado antes de reconectar/enviar. TypeScript/lint/build/textos/sintaxe locais aprovados; gate/deploy deste incremento ainda pendentes. Workflow 38418748103 do PWA inicial confirmou testes/infra/builds e iniciou gate real PostgreSQL/API/navegador. PWA/piloto, unidades/granel, comercial/desempenho/integrações e objetivo completo permanecem ativos.


### Novo goal atualizado e PWA do motorista — 13/10/2026

O usuário removeu o goal anterior e solicitou um novo. Novo goal criado com o escopo completo remanescente: PWA/piloto do motorista, unidades/granel, acompanhamento completo, pedidos/notificações comerciais, metas/comissões prospectivas, importação/autoridade/conflitos, escrita/inbox/outbox/webhooks/reprocessamento, conector ERP quando identificado, homologação e pendências de parceiros registradas neste roteiro. Não ativa novas integrações/regras financeiras/gastos. Main somente, commit/push e deploy pelo workflow existente. Evidências privadas f681a39 confirmadas publicadas no workflow 38345724561; navegação/fila e reagendamento também publicados.

PWA do motorista: manifesto/ícones existentes, instalação pelo painel, controles reutilizados com parceiros e atualização explícita bloqueada enquanto detalhe de tarefa/romaneio ou mutação está em andamento. Worker limitado à navegação de entregas; cache contém somente aviso público de ausência de conexão. Não guarda HTML autenticado, API, fotos, pedidos, posição ou mutações; recebimentos continuam online. Offline apresenta orientação e tentativa de retorno, sem confirmar operação. Build gera versão do aviso/worker e preserva cache de outros módulos. Teste integrado acrescenta manifesto, registro/controlador, cache restrito, navegação offline e retorno autenticado. Tipo/lint/build/textos/sintaxe locais aprovados; gate integrado/deploy e piloto em Android/iPhone permanecem pendentes. Objetivo completo ainda não concluído.


### Evidências privadas de recebimento — 13/10/2026

Migração aditiva 20261013020000_receipt_evidence cria registros imutáveis ligados somente a evento físico PICKUP_RECEIVED/DELIVERY_RECEIVED; não altera a entrega, quantidades ou dinheiro. Foto opcional pelo histórico, com recorte reutilizável 1000×750, compressão/conversão WebP, consentimento explícito do recebedor e revisão antes de anexar. Backend decodifica os bytes, remove metadados, limita saída a 250 KiB, entrada a 2 MiB e aproveita processamento limitado existente. Até três imagens por recebimento e 256 MiB de evidências desta aplicação; locks/checks e guard de INSERT no banco defendem concorrência. Não há remoção automática de auditoria. Falha confirmada de transação limpa apenas o arquivo novo não referenciado; resultado incerto preserva arquivo em vez de apagar evidência possivelmente confirmada.

Pasta /uploads/receipts protegida antes do static; consulta exige equipe operacional, motorista do romaneio que registrou ou dono do pedido. Cliente só consulta; upload restrito a equipe/motorista ativo. Intenção com hash dos bytes e referência de recebimento evita reenvio/alteração silenciosa. Retorno ou fechamento posteriores preservam a prova histórica. Documento não é assinatura eletrônica/validação de identidade. UI compartilhada em histórico de depósito, motorista e cliente; consulta sob demanda, máximo três fotos. Histórico do motorista recebe somente referência opaca de seu recebimento, nunca requestKey/hash/nota privada. PWA existente não armazena APIs nem uploads privados; PWA operacional do motorista permanece pendente.

Tipos, lint, build, textos e 69 testes locais aprovados, incluindo formato/dimensões/limite/EXIF da imagem. Cenário integrado acrescenta consentimento, invalidade de bytes, reenvio, isolamento entre clientes/anônimo, download no-store, imutabilidade/limite e recorte/anexo mobile. Gate e deploy deste incremento pendentes; teste piloto em aparelhos reais, PWA/unidades/comercial/ERP e objetivo completo ainda não concluídos. Gate da navegação/fila 38344560850 aprovado; conferir conclusão de seu deploy antes de declarar publicação.


### Reagendamento validado com banco e navegador — 13/10/2026

Workflow 38343878418, commit 9cb8fe3: testes/infra, três imagens e gate PostgreSQL/API/navegador concluídos com sucesso. Além dos recebimentos/impedimentos já publicados, confirma sequência de horário inicial → novo horário → retirada do horário, DTO atualizado do cliente, somente um RESCHEDULED/SCHEDULE_CLEARED e notas internas ausentes do histórico público. Deploy confirmado em execução, conclusão ainda não presumida. Navegação/fila do motorista (5fd9c2f, workflow 38344560850) aguarda execução posterior. Evidências privadas/PWA, unidades/granel, atendimento/metas/comissões, importações/escrita/webhooks/conector ERP e homologação/piloto continuam pendentes no objetivo completo.


### Navegação por ação do motorista e fila de pendências — 13/10/2026

Deploy 38343635783 concluído com sucesso: recebimento parcial/impedimentos estão publicados. Adicionado componente de navegação reutilizado no detalhe da tarefa e na parada do romaneio. URL Google Maps Directions com destino somente do endereço conferido, domínio fixo HTTPS, encoding e limite oficial de 2048 caracteres; sem origem/coordenadas/ETA/waypoints/chave API ou requisição automática. Abre por clique em “Como chegar”, com noopener/noreferrer/no-referrer; não envia nome/telefone/ID interno nem coleta posição pela Rebequi. Google Maps controla sua própria experiência externa. Endereço excessivo não é truncado; permanece visível no painel. Referência técnica: https://developers.google.com/maps/documentation/urls/get-started.

Fila do motorista exclui RECEIVED, conservando consulta de sua tarefa concluída. Estado recebido/parcial prevalece sobre trânsito das outras paradas do mesmo romaneio; labels correspondentes no detalhe. Testes integrados verificam links/destino/referrer/ausência de campos extras em tarefa e romaneio e saída da fila após entrega real com consulta própria preservada. Tipo/lint/build/textos/sintaxe local aprovados; gate integrado deste incremento pendente. Evidências/PWA, unidades, desempenho/comissões e integrações restantes continuam pendentes.


### Validação integrada de entregas e impedimentos aprovada — 13/10/2026

Workflow 38343635783, commit 84a8c1a: testes/infra, imagens API/migrador/frontend e gate PostgreSQL/API/navegador concluídos com sucesso. Inclui recebimento parcial com recebedor, intenção concorrente/idempotente, limites e versão, guard de material, saldo por cliente, retorno ao depósito preservando recebido, reentrega do saldo, conclusão visível no celular, dois clientes/paradas isolados, impedimentos privados e UI mobile 320/390. Falha anterior de detalhe oculto está corrigida e a asserção de conclusão passou sem relaxar o teste. Estoque não sofre nova baixa. Deploy deste workflow confirmado em execução, ainda não declarado concluído neste registro. Histórico explícito de reagendamento/retirada de horário (9cb8fe3) permanece no workflow seguinte 38343878418. Evidências privadas/PWA, unidades/granel, gestão comercial restante, ERP/importações/webhooks e homologação completa continuam pendentes; objetivo não está concluído.


### Histórico explícito de reagendamento — 13/10/2026

Alteração de um horário previamente definido registra RESCHEDULED; retirada de horário antigo registra SCHEDULE_CLEARED. Primeiro agendamento e alterações sem mudar o instante mantêm DETAILS_CONFIRMED. Evento único por versão preserva intenção/replay existentes, data anterior privada e nova data do formulário confirmado. Cliente consulta etapa específica e agendamento atual, sem notas internas; nenhuma data é escolhida automaticamente. Mutação continua bloqueada em romaneio ativo e tarefas encerradas, liberada após retorno físico para nova conferência. Teste com dois clientes acrescenta agendamento → novo horário → retirada do horário e confere DTO/histórico/privacidade. 69 testes locais, TypeScript, lint e textos passaram; gate integrado deste incremento pendente.

Workflow 38342968161 também falhou na mesma tela de conclusão anterior à correção a12505f, confirmado por logs. Workflow 38343635783 inclui a correção e impedimentos, em execução. Deploy de ambos os workflows antigos com falha foi bloqueado; não se afirma publicação das entregas parciais antes de gate aprovado.


### Impedimentos por parada e conclusão visível — 13/10/2026

Gate 38342715274 falhou no navegador após recebimento bem-sucedido: DriverRuns ocultava o detalhe selecionado ao esvaziar lista de viagens ativas. Correção a12505f mantém detalhe/conclusão enquanto selecionado; nenhuma entrega ou guard de quantidade foi removido. Nova validação continua exigindo “Rota encerrada” após confirmação real.

Registro de impedimentos em três passos, limitado a motorista próprio ou gestão e parada paga em trânsito ainda pendente. Motivo tipado e nota mínima para equipe, sem quantidade, recebimento, devolução financeira ou agendamento implícito. Lock venda/tarefa/romaneio, operador ativo, versão esperada e intenção idempotente; eventos imutáveis incrementam versões operacional/romaneio. Cliente recebe somente evento genérico da própria tarefa; notas/motivos internos não são selecionados no histórico público. Materiais e viagem continuam nas etapas reais anteriores. Retorno físico ao depósito e novo horário combinado continuam operações explícitas existentes; confirmação com cliente e tratamento de evidência permanecem pendentes.

68 testes locais, TypeScript, lint e build aprovados. Cenário integrado de duas paradas foi ampliado com duplicação/versão/privacidade, quantidade preservada e formulário do motorista em 320px. Gate integrado e deploy deste incremento pendentes. Objetivo completo permanece ativo.


### Validação de várias paradas e clientes — 13/10/2026

Cenário real adicional com dois clientes distintos no mesmo romaneio: materiais planejados/carregados sem saída não podem ser recebidos; IDs de material de outra parada são rejeitados. A primeira entrega fica RECEIVED enquanto o romaneio permanece IN_TRANSIT pela segunda; o painel do primeiro cliente não volta a indicar trânsito. Evento de recebimento é vinculado somente à tarefa do cliente atendido, sem recebedor ou dados do outro cliente. Ao retornar somente a carga da segunda parada, preserva recebimento/conferência da primeira e reabre conferência somente da segunda, encerrando romaneio e liberando vínculos. Reenvio do retorno não repete evento/quantidade. Guardas, isolamento e estoque serão exercitados no banco/API reais pelo próximo workflow. Sintaxe dos cenários validada localmente; não marca o módulo completo nem presume resultado integrado. Workflow 38342715274 do recebimento parcial continua em validação no momento deste registro.


### Recebimento parcial em rota — 13/10/2026

Registro por parada em três passos: materiais entregues agora → recebedor → confirmação física. Somente motorista do romaneio ou gestão, conta ativa e venda paga, após saída IN_TRANSIT. Saldo limitado ao carregado ainda não entregue/retornado, com validação da conferência e saldo vendido líquido. Lock ordenado venda/tarefa/romaneio e intenção idempotente, versão esperada e evento imutável evitam corrida com retorno ao depósito. Alocação registra entrega bruta da viagem; tarefa conserva saldo físico líquido com o cliente. Sem nova baixa de estoque ou alteração financeira. Guardas do banco mantêm configuração/carga imutáveis e permitem somente os deltas exatos registrados por evento da próxima versão.

Rota encerra automaticamente após recebimento de toda a carga; retorno ao depósito continua conferindo todos os materiais ainda em carga e preserva o saldo já recebido. Nova conferência permite reentrega somente do saldo restante. Cliente recebe evento próprio mínimo e saldo por material; nome do recebedor continua privado. Motorista pode consultar a conclusão de seu romaneio, mas não os de colegas. Foto/evidência, ocorrência/reagendamento, piloto em dispositivos e demais módulos ainda pendentes. Teste integrado acrescentado para envio concorrente, versão/quantidade indevidas, bloqueio do guard direto, saldo parcial, retorno/reconferência/reentrega, conclusão mobile, fechamento e estoque preservado. Validação com banco real e deploy deste incremento pendentes.


### Saldo de materiais no painel do cliente — 13/10/2026

Consulta própria paginada em 20 materiais, sem notas internas, endereço, recebedor ou dados de outros clientes. Snapshot RepeatableRead calcula saldo físico atual recebido, saldo ainda a receber e quantidade removida por devolução/cancelamento parcial; não usa venda paga como prova de recebimento. Painel consulta somente ao abrir “O que recebi e o que falta?”, com atualização manual e paginação. Consulta não movimenta estoque nem registra entrega. Testes integrados acrescentam isolamento por proprietário/papel, no-store, pedido sem preparação, versão da consulta após retiradas/devoluções e navegador mobile de 320px. Validação integrada e deploy aprovados no workflow 38341886372. Entrega parcial em rota e demais requisitos permanecem no goal ativo.


### Retirada parcial com recebedor — 13/10/2026

Novo registro de retirada em três passos: quantidades entregues agora → nome do recebedor → confirmação física. Restringe a retirada paga, em modo PICKUP e liberada; quantidades inteiras positivas não podem superar saldo conferido menos recebido e devoluções. Lock venda/tarefa, versão esperada, revalidação de operador ativo e intenção idempotente impedem duplicações e preservam concorrência com devoluções. Evento imutável guarda recebedor, materiais/nome/quantidade, horário e ator. Não exige CPF/telefone, não representa assinatura eletrônica e não movimenta estoque novamente. Upload de evidência permanece pendente.

PARTIALLY_RECEIVED conserva materiais ainda pendentes; RECEIVED sai da fila padrão e permanece consultável por etapa. Cliente recebe etapa e histórico mínimo, sem nome do recebedor. Preparação pronta para retirada fica resumida, com revisão sob botão; parcial não oferece edição que apagaria recebimentos. Rechecagem após devolução preserva saldo recebido: materiais ainda não recebidos não reduzem esse saldo, recebidos do cliente reduzem somente quantidades conferidas. Obrigações totalmente recebidas permanecem RECEIVED; devolução de todos os materiais encerra tarefa CANCELED, sem presumir entrega ou reposição de estoque. Cálculos financeiros são os existentes.

Migração aditiva 20261012160000_pickup_receipts amplia estados operacionais. 66 testes locais, tipos, lint, textos e build passaram. Integração acrescenta fluxo real com banco/API/navegador: pago/liberado, retirada parcial concorrente/idempotente, versão/quantidade/origem, cancelamento bloqueado enquanto há material recebido, rechecagem sem apagar recebimento, conclusão mobile, devolução física parcial/total, privacidade e estoque sem movimento duplicado. Validação integrada e deploy aprovados no workflow 38332596582. Workflows 38331168790 e 38331498243 aprovados e publicados confirmaram o acompanhamento do cliente e a origem física das devoluções. Recebimento em rota, ocorrências/reagendamento/reentrega, evidência/PWA, métricas/comissões e integrações restantes continuam no goal ativo.

### Origem física das devoluções — preparação do recebimento parcial

Migração aditiva 20261012150000_sale_return_physical_origin registra NOT_RECEIVED ou RECEIVED_FROM_CUSTOMER por item. Históricos anteriores mantêm origem nula/desconhecida; não se inventa recebimento antigo. Venda sem acompanhamento físico continua devolvível pelo fluxo anterior, com origem desconhecida. Quando há controle físico, origem pendente é limitada ao saldo vendido não recebido; origem recebida do cliente exige quantidade efetivamente registrada como recebida. Havendo saldo recebido, omissão de origem é rejeitada com mensagem específica. Prévia confere também vínculo a romaneio ativo antes de mostrar confirmação.

Devolução recebida do cliente reduz somente seu saldo recebido atual. Rechecagem preserva esse saldo como piso de quantidade conferida, evitando apagar materiais já recebidos ou violar constraints. Materiais ainda não recebidos usam atualização em lote. Cálculo de centavos, rateio, benefícios e opção de retorno ao estoque são preservados; não ativa regra financeira ou conector. Formulário apresenta origem somente para materiais com acompanhamento, preserva escolha ao editar quantidade/condição e usa validação fresca no envio. Testes cobrem saldo misto, ausência de rastreio histórico e origem impossível; integração garante rejeição sem devolução/versão financeira e registra a origem do fluxo anterior. Tipos, lint, build, textos e 65 testes locais aprovados. Validação integrada e deploy deste incremento pendentes. Registro de entrega/retirada ainda não ativado; próximo incremento depende desta base e dos testes completos.

Workflow 38330377655 falhou porque o fixture de outro cliente tentou usar cadastro interno de equipe, cuja validação corretamente rejeita CUSTOMER. Commit 211902a usa cadastro real de cliente em contexto isolado e preserva a asserção 404 por propriedade. Demais testes desse workflow passaram; validação do acompanhamento do cliente continua pendente. Não se flexibilizou a permissão administrativa.

### Histórico de etapas para o cliente — 12/10/2026

Meus pedidos oferece acompanhamento expansível e paginado, consultado somente ao abrir. Consulta exige cliente autenticado e proprietário exato do pedido; pedido de outro cliente resulta em 404. Une eventos permitidos de preparação e transporte vinculados aos próprios materiais, ordenados por data/ID, com no máximo 20 por página. Seleção SQL e whitelist impedem enviar notas/ocorrências internas, ator, payload, endereço, snapshot ou dados de outras paradas. RepeatableRead mantém autorização/contagem/eventos coerentes na mesma consulta. Não presume localização, prazo ou entrega: registra somente etapas já realizadas. Histórico interno completo e DTO de status existente permanecem distintos.

Integração acrescenta pedido de outro cliente, ausência de tarefa, campos exatos e paginação após ciclos reais de carga/descarga/saída. Tipos, textos, lint e build passaram localmente. Validação integrada e deploy deste incremento ainda pendentes. Workflows 38328469217 e 38328792975 aprovados e publicados; a validação integrada de f703291 foi aprovada, incluindo exportação de orçamentos e histórico completo de romaneios; seu deploy estava em execução nesta consulta. Recebimento parcial, prova, notificações/desempenho e API de escrita/conector continuam pendentes; goal ativo.

### Histórico completo do romaneio — 12/10/2026

Consulta paginada de eventos operacionais na Expedição e no romaneio próprio do motorista. Componente único, consulta somente ao abrir e páginas de 20 eventos, ordenadas por versão. Resposta contém evento/etapa/data/versão; equipe operacional também vê somente o motivo/observação explícitos, preservando o histórico anterior. Motorista não recebe essa nota. Sem payloads, chave idempotente, fingerprint ou identificação interna do operador. Motorista continua limitado ao vínculo e etapas permitidas; operação do depósito consulta sob logistics:manage. RepeatableRead mantém autorização, eventos e total consistentes na requisição. Teste real de banco/API acrescenta dez ciclos de carregamento/descarga no ambiente isolado, conferindo eventos acima do limite, páginas sem repetição, campos mínimos, acesso cruzado negado e abertura mobile. Não opera nem altera romaneios reais em produção. Validação integrada deste incremento pendente; entrega/retirada parcial e demais pendências continuam abertas.

### Exportação de orçamentos pela API — 12/10/2026

Escopo opcional quotes:read com cabeçalhos paginados de solicitações identificadas enviadas e materiais paginados por orçamento. Exclui rascunhos; campos selecionados impedem exportar cadastro/título/notas/documentos/OCR/auditoria. Quantidades e unidades preservam o pedido, sem conversão ou reserva presumida. Materiais têm limite de 100 por consulta e agrupamento explícito, evitando resposta aninhada ilimitada. Transação RepeatableRead mantém versão/cabeçalho, materiais e contagem consistentes na mesma requisição; não promete snapshot entre páginas. OpenAPI, guia e formulário/explorador do painel incluem a consulta. Credenciais existentes não recebem nova permissão; nenhuma emissão ou conexão automática em produção. Testes verificam paginação, campos exatos, agrupamento, quantidade fracionária relatada, rascunho inacessível, escopo e revogação. Tipos, lint, build, textos e 64 testes unitários aprovados; validação integrada deste incremento ainda pendente. Workflow 38328469217 aprovado e publicado para orçamento assistido; recuperação de seleção de cliente segue no incremento b4dbbf2, ainda sem gate confirmado.

### Orçamento assistido pela carteira — 12/10/2026

Conflito de versão ou acesso revogado devolve o wizard à escolha do cliente com consulta atualizada, preservando materiais/título e a intenção de envio. Evita prender o usuário na confirmação com uma seleção desatualizada. Teste mobile força redistribuição enquanto a confirmação está aberta e confere recuperação/reenvio. Teste de banco também exige que o autor original da criação não possa ser sobrescrito por outro caminho de escrita. Carteira/consentimento são novamente conferidos antes de criar; recuperação não libera autorização revogada.

Novo fluxo em Meus atendimentos: cliente → materiais → conferência. Busca paginada de clientes respeita a carteira; itens podem vir do catálogo ou ser descritos manualmente, sem consumo de IA. Solicitação identificada entra no fluxo existente de propostas e aparece na conta do cliente. Não aceita preço, responsável ou estoque fornecidos pelo navegador. Produtos são conferidos novamente no envio e nomes do catálogo prevalecem. Origem confiável, operador ativo, versão da carteira, idempotência concorrente e auditoria na mesma transação impedem duplicações e acesso revogado. Migração aditiva 20261012140000_commercial_quote_creation. Estágio NEW avança para QUOTING somente quando não foi travado manualmente.

Testes acrescentados para concorrência, isolamento entre vendedores, reenvio após redistribuição, associação ao cliente, ausência de chamadas OCR e wizard mobile. Validação integrada deste incremento ainda será feita no workflow. Workflows 38326558378 e 38327147537 concluídos com sucesso, incluindo deploy: carregamento/saída/retorno e prioridade já publicados. Entrega/retirada parcial, evidências, desempenho/comissões, integrações e demais tarefas do plano permanecem pendentes; goal continua ativo.

### Prioridade da fila do depósito — 12/10/2026

Prioridade manual na etapa de dados operacionais: prioritária, padrão ou baixa. Fila e seleção de entregas para romaneio ordenam primeiro pela prioridade e depois pelo tempo de criação/ID, preservando FIFO nas tarefas de mesma prioridade. Indicador aparece nos cards somente quando diferente do padrão. Migração aditiva 20261012130000_fulfillment_priority, com índice para a ordenação e limite 0–2 no banco. Registros existentes permanecem na prioridade padrão; não atribui urgência automaticamente, não altera pagamento, estoque ou agendamento.

Campo opcional no contrato preserva a prioridade quando clientes anteriores enviam dados sem esse campo. Mudança usa versão, confirmação e histórico operacional existentes; tarefa em romaneio ativo continua protegida. Integração acrescenta prioridade na frente das tarefas padrão e preservação após requisição antiga. 63 testes unitários, tipos, lint, textos e build passaram localmente. Execução 38326558378 do incremento anterior ainda estava em validação integrada nesta consulta; publicação dos incrementos atuais não confirmada. Goal completo continua ativo, incluindo recebimento/entregas parciais, evidências, evolução de unidades, atendimento/desempenho e API/ERP restantes.

### Carregamento, saída e retorno ao depósito — 12/10/2026

Acrescentados itens de romaneio com alocação imutável e contadores limitados; migração 20261012120000_delivery_run_operations deriva alocações anteriores exclusivamente dos snapshots já registrados, sem inventar entrega/carregamento histórico. LOAD exige conferência física de todas as quantidades, peso/volume de cada parada e capacidades conhecidas de veículo/motorista ativos. Carregamento em uma atualização SQL parametrizada e comparação por Map limitam consultas e trabalho por material. UNLOAD exige motivo e confirmação física antes da saída. DEPART exige carga completa e nova verificação de veículo/motorista/capacidades; somente gestão ou motorista atribuído confirma saída. Intenção idempotente, versão esperada, locks e eventos imutáveis preservam auditoria, sem movimentar estoque novamente.

Expedição no Depósito reutiliza formulário em três passos. Motorista usa o mesmo componente para sua saída, com autorização própria no backend. Cliente e motorista recebem status reais LOADED/IN_TRANSIT; DTO do cliente continua contendo somente status/modo/agendamento/atualização, sem relações internas. RETURN_TO_WAREHOUSE fica restrito à operação do depósito: exige todos os materiais não entregues recebidos fisicamente, encerra a rota, libera vínculos e exige nova conferência. Não representa devolução financeira, não repõe estoque disponível nem afirma entrega ao cliente. Descarga/retorno mantêm os eventos anteriores. Recebedor, recebimento parcial/total, evidências privadas e conciliação pós-entrega continuam pendentes, assim como demais módulos do goal.

63 testes unitários passaram; tipos, lint, textos e build final aprovados localmente. Integração acrescenta carregamento errado/antes da liberação, papel de depósito sem poder confirmar saída, reenvio, cancelamento bloqueado com carga, descarga, carregamento mobile, saída pelo motorista, acompanhamento do proprietário, retorno/reenvio/encerramento e estoque preservado. Banco/API/navegador e publicação deste incremento ainda aguardam workflow. Execução 38322723371 passou nos cenários logísticos, mas falhou no carregamento de produtos da landing; acrescentada coleta de respostas do catálogo, texto e screenshot de falha sem flexibilizar a asserção. Nenhuma integração externa ou regra financeira ativada.

### Planejamento de romaneios — 12/10/2026

Implementado Depósito → Gerenciar romaneios, para ADMIN/MANAGER com logistics:fleet. Fluxo de três passos: equipe/veículo/data de saída planejada, até 20 entregas prontas e ordem manual das paradas, revisão/confirmar. Seleção paginada de entregas pagas em modo DELIVERY, endereço conferido, versão esperada e conferência integral do saldo após devoluções. Planejamento atribui o motorista e registra evento imutável por tarefa na mesma transação. Uma tarefa pode ter apenas um romaneio ativo (índice único parcial); snapshot de parada preserva endereço/material/unidade comercial, não inventa massa/volume por produto. Não altera agendamento combinado com o cliente nem movimenta estoque.

Veículo/motorista devem estar ativos. Medições físicas são strings Decimal, opcionais; qualquer peso/volume conhecido que ultrapasse a capacidade bloqueia planejamento. Falta de medição/capacidade é explícita e não vira validação de carga. Estado inicial PLANNED não significa carregado, em trânsito ou entregue. Consulta paginada, detalhe por ID e cancelamento do planejamento com motivo/versão/intenção idempotente; cancelamento libera as tarefas e preserva snapshots/histórico. Usuário DRIVER consulta somente seus romaneios e vê paradas na ordem definida, em mobile; não recebe eventos internos/chaves/fingerprints. Carregamento/saída/recebimento parcial ainda não implementados.

Locks venda → tarefa, snapshot/histórico protegidos por triggers, guardas de material/pagamento/atribuição enquanto planejamento ativo. Para mudar venda, devolver ou editar tarefa, cancelar o planejamento primeiro. Proteções também bloqueiam escritas incompatíveis por imagens anteriores. Migração aditiva 20261012110000_delivery_run_planning. Sem contas/veículos/romaneios reais cadastrados no desenvolvimento, sem serviço contratado ou contêiner residente novo.

61 testes unitários, tipos, lint, textos e build final passaram localmente. Suíte isolada acrescenta limite de capacidade, concorrência/idempotência, tarefa em dois planos, cancelamento/reenvio, snapshots imutáveis, bloqueio de pagamento/material, estoque preservado, acesso e UI mobile do motorista e planejamento/cancelamento mobile da gestão. Testes integrados/publicação ainda pendentes. Workflow 38321491967 passou na regressão da indicação, mas falhou no helper de motorista por URL relativa sem baseURL no BrowserContext; configurado baseURL nos contextos que fazem chamadas API. Não foi alteração de permissão nem relaxamento das asserções. Restantes etapas continuam no roteiro.

### Agendamento pelo depósito — 12/10/2026

O contrato de agendamento já existia, mas a tela apenas conservava o valor recebido e não permitia preenchimento. Agora Dados de retirada/entrega → etapa 2 oferece data/hora opcional, no fuso local do dispositivo, e etapa 3 mostra a confirmação. Campo vazio remove o agendamento. Conversão para ISO UTC mantém o contrato e o acompanhamento do cliente/motorista existente; ao não editar o campo, preserva o instante original inclusive segundos/milissegundos. Sem prazo calculado, ETA ou agendamento automático. Usa versão, idempotência, permissões e eventos já existentes; não exige migração.

Tipos frontend, lint, textos e build passaram. Teste integrado acrescenta cadastro mobile no fuso America/Sao_Paulo, horário local→UTC persistido, leitura no pedido do proprietário, reabertura no mesmo horário local, remoção e responsividade. Gate PostgreSQL/API/navegador ainda pendente. Workflow 38320772495 permanece em validação integrada; correção 34ef268 aguarda uma execução que a inclua. Roteiro completo continua ativo, com romaneios, expedição, parciais e demais módulos ainda por implementar.

### Correção da sessão inicial e gate de frota — 12/10/2026

Reproduzida localmente a indicação travada: consulta pública iniciada, resposta da sessão autenticada recebida primeiro, resposta pública 200 recebida depois; antes, botão ausente e “Carregando…” permanente. AuthContext limpava QueryClient na primeira resolução de sessão, cancelando consultas em voo e desconectando seus observers. Agora a primeira verificação conserva o cache novo em memória; após uma sessão resolvida, troca de identidade continua limpando o cache para proteger dados privados. Não existe persistência de QueryClient entre carregamentos de página. A mesma reprodução local após build mostrou o botão disponível. Teste integrado força a ordem de respostas com interceptação temporal, mas usa dados/respostas reais da API isolada.

Workflow 38320249189 falhou em navegação Chromium ERR_NETWORK_CHANGED e no parse do resultado de uma proteção de auditoria. O banco corretamente registrou a rejeição, mas logs Prisma antecediam o JSON esperado no stdout; teste agora lê a última linha JSON, mantendo a asserção de bloqueio, como os testes financeiros já fazem. Mesma correção aplicada à guarda de conversão de entrega atribuída. Não altera constraints nem permissões para aprovar o teste. A navegação não foi flexibilizada; o próximo gate verificará novamente. Tipos/frontend build e texto passaram; lint sem erro, com aviso já existente de Fast Refresh em AuthContext. Validação integrada/publicação dos incrementos atuais continuam pendentes.

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
