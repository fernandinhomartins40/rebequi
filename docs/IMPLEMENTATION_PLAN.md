# Plano de Implementação

## Resumo da aplicação

Rebequi vende materiais de construção por catálogo, carrinho e atendimento via WhatsApp; também recebe listas fotografadas para orçamento. React/Vite e React Query, Express/Node 22, Prisma/PostgreSQL 16, OCR local PaddleOCR e integração opcional OpenRouter. Cliente possui painel de orçamentos/conta; equipe possui catálogo, promoções, pedidos, vendas, CRM, canais, acessos e integrações. Produção já usa GitHub Actions/GHCR, volumes persistentes, backup e rollback. Trabalhar somente na `main`, preservando protocolos locais não rastreados.

## Principais problemas encontrados

- P0 adicional: novas contas usavam senha previs?vel; cache privado sobrevivia ? troca de conta. Gerar senhas aleat?rias somente para contas novas e limpar cache ao trocar sess?o.
- Integridade: substituir itens fora de transa??o podia apagar a lista se a inser??o falhasse; envio simult?neo e conclus?o tardia de OCR precisavam respeitar o rascunho e as edi??es.
- Valida??o: TypeScript do frontend n?o era verificado no workflow e havia contratos antigos incorretos. Corrigir contratos sem enfraquecer tipos e adicionar a verifica??o.

- P0: `AuthService.ensureCustomerForLead` reutiliza e reativa contas pelo WhatsApp sem prova de autenticação; orçamento público pode emitir sessão de outra pessoa. O documento legado usa lead ID sem conferir proprietário. O endpoint público de redirecionamento de pedido modifica e devolve dados sem autorização.
- P0: middleware verifica somente JWT; desativação e troca de papel não revogam permissões de sessões existentes. Resposta de pedidos do cliente inclui notas internas.
- P1: API `/orders/me` e `fetchMyOrders` existem, mas o painel não oferece pedidos. Cliente perde acesso fácil à referência, itens e conversa após sair do checkout.
- P1: entrada manual do orçamento fica escondida atrás de falha de OCR. Cliente que já tem a lista digitada precisa fotografar algo primeiro.
- P1: edição de orçamento é reinicializada a cada atualização do objeto selecionado; refresh em segundo plano pode apagar trabalho. Wizard público depende de backup local mesmo existindo endpoint de gravação no banco; reload durante leitura não recupera adequadamente o processamento.
- P2: dados do cliente conectado não preenchem o envio do orçamento. Painel de catálogo aponta problemas, mas exige procurar novamente o produto para corrigi-los.

## Oportunidades de melhoria

| ID | TIPO | SITUAÇÃO ATUAL | OPORTUNIDADE / SOLUÇÃO | ESFORÇO ELIMINADO / BENEFÍCIO | PRIORIDADE | RISCO | TESTE | STATUS |
|---|---|---|---|---|---|---|---|---|
| OP-01 | JUNTAR | Pedidos salvos sem acesso no painel do cliente | Pedidos com itens, situação, referência e retomada da conversa usando API existente | Evita procurar mensagem antiga ou refazer pedido | P1 | Baixo | Navegador, pedidos reais no banco e isolamento entre clientes | DOING |
| OP-02 | ELIMINAR | Lista manual exige falhar na câmera | Entrada direta de texto, parsing/matching existentes, revisão e envio; rascunho real no PostgreSQL | Colar lista → revisar → enviar, sem foto fictícia nem OCR desnecessário | P1 | Médio | API e navegador com lista digitada, quantidades e catálogo reais | DOING |
| OP-03 | AUTOMATIZAR | Edições perdidas ou guardadas só no navegador | Gravar rascunho público no backend; recuperar leitura/rascunho e preservar editor em auto-refresh | Evita redigitação após interrupção ou atualização | P1 | Médio | Reload, expiração, gravação, edição durante refresh e erros | DOING |
| OP-04 | ELIMINAR | Cliente conectado redigita identificação | Preencher nome/WhatsApp a partir da sessão; login com retorno ao mesmo rascunho quando conta já existe | Reaproveita dados sem login indevido nem perder a lista | P2 | Baixo | Conta existente, conta nova e envio autenticado | DOING |
| OP-05 | ANTECIPAR | Alerta de catálogo sem ação no contexto | Link direto ao editor do produto apontado como pendência | Elimina navegar para catálogo e buscar o mesmo item | P2 | Baixo | Navegador e autorização existente | DOING |

## Plano de execução

| ID | PRIORIDADE | PROBLEMA | SOLUÇÃO | ARQUIVOS/ÁREAS | RISCO | TESTE | STATUS |
|---|---|---|---|---|---|---|---|
| FIX-01 | P0 | Sessões e acesso público sem conferir proprietário | Exigir sessão correspondente para conta existente/lead/pedido; não reativar contas; conferir usuário ativo/papel no backend; excluir notas internas da resposta ao cliente | Auth, quotes, orders | Médio | HTTP real: anônimo, cliente A/B, desativação e papel alterado | DOING |
| OP-01–05 | P1/P2 | Fricções confirmadas acima | Implementar usando componentes, endpoints e regras existentes | Frontend e quotes | Baixo/médio | Build/lint, testes reais de banco e navegador em diferentes larguras | DOING |

## Ordem de implementação

Corrigir autorização e integridade; oferecer lista manual persistente; recuperar/preservar rascunhos e identificação; expor pedidos no painel; ligar alertas ao editor; testar com banco real em runner descartável, revisar diff, commit/push na `main`, acompanhar deploy e validar produção.

## Itens que não serão alterados

Identidade visual, logo, preços, estoque, pagamento, políticas comerciais, cálculo de promoções e finalidade dos dados pessoais. Não introduzir serviço residente, IA nova, notificações externas, migrations destrutivas ou custos recorrentes. Vendas a partir de pedidos e lembretes CRM já existem: evoluir acesso/contexto sem duplicar funções. Paginação e métricas de módulos administrativos serão registradas quando exigirem um escopo adicional, sem prometer auditoria exaustiva de cada linha.

## Bloqueios reais

Nenhum para os itens selecionados. Integração externa OpenRouter depende de configuração do lojista e não será acionada com gasto real. Banco de testes será isolado no GitHub, preservando dados de produção. Navegador automatizado de teste será usado somente para validar fluxos reais, sem mocks de APIs.
