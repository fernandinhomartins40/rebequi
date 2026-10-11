# Implementação incremental multicanal

Plano aprovado em 11/10/2026. Acompanhamento de entregas, sem atribuir conclusão a conectores não validados.

## Primeira entrega: integridade comercial e outbox

- Baixa condicional atômica com saldo validado dentro da transação; movimentação usa o saldo real, não snapshot anterior.
- Cancelamento serializado por bloqueio da venda; estorno e status na mesma transação. Cancelar novamente não repõe estoque duas vezes; venda cancelada requer nova venda para reabrir operação.
- Conclusão/cancelamento de pedido vinculado na mesma transação da venda.
- Atualização/exclusão de produto e baixa/retorno de estoque invalidam anúncios e persistem evento na mesma transação.
- Outbox PostgreSQL com lease, recuperação após restart, limite de 20 eventos por ciclo e retenção de concluídos por 30 dias. A primeira versão reconcilia o estado local; não afirma sincronização remota.
- Canais não implementados retornam indisponibilidade; credenciais cadastradas não comprovam conexão. Desconectar preserva vínculos; falha de remoção externa preserva anúncio local.
- Rotas verificam que o anúncio pertence ao canal informado.
- Migração aditiva cria `integration_jobs` e corrige estados antigos dos conectores que eram placeholders. Não executa seed nem remove dados comerciais.

Validação: compilação TypeScript, testes de backend, integração em banco descartável do GitHub para disputa da última unidade, saldo/movimentação real, cancelamento simultâneo, preservação de vínculos, falhas de conectores e recuperação de lease expirado. Nenhum teste comercial mutante é executado na VPS.

## Autorização Mercado Livre

Fluxo de consentimento com state cifrado, curto, vinculado ao administrador e de uso único; PKCE, troca de código, validação da conta brasileira, persistência cifrada e renovação coordenada por bloqueio de linha. A tela do canal recebe ID/segredo diretamente no formulário, sem devolver segredos ao frontend. Callback sem access log no proxy da aplicação e no vhost Rebequi; logger API omite query strings. A conexão da conta não libera publicação: capacidades distinguem autorização, controle manual e conector pendente.

Contrato baseado nas fontes oficiais de [autenticação](https://developers.mercadolivre.com.br/autenticacao-e-autorizacao) e [consulta de conta](https://developers.mercadolivre.com.br/pt_br/usuarios-e-aplicativos). Testes de transporte validam sucesso/recusa, conta não brasileira e erro sem vazamento; integração descartável valida state, proprietário, replay e cifragem com transporte de teste. A autorização real depende do administrador cadastrar o app e autorizar a conta. As contas informadas pelo usuário ainda não estão vinculadas: consulta agregada de produção encontrou zero canais, sem ler segredos.

## Reserva de pedidos e idempotência de vendas

Reserva explícita por pedido por 30 minutos, sob bloqueio de pedido e produtos em ordem determinística. Estoque físico permanece separado do reservado; catálogo, carrinho e snapshots de canais usam o saldo disponível. A venda consome a própria reserva na mesma transação da baixa. Cancelamento/conclusão do pedido e vencimento liberam reservas uma única vez; o worker recupera vencimentos após reinício. Orçamentos não reservam automaticamente. Pedido com venda ativa exige cancelamento da venda para manter o estorno consistente.

Envio da venda usa UUID reaproveitado quando o formulário é reenviado sem alterações. Backend vincula a chave ao operador e ao conteúdo: repetição retorna a venda registrada; reutilização para outro conteúdo é recusada. Falha de atualização de CRM após confirmação não informa falsamente que a venda falhou.

Migrações aditivas preservam dados e acrescentam proteção de saldo reservado. Testes comerciais rodam exclusivamente em banco descartável do GitHub: reserva concorrente da última unidade, tentativa de venda sem a reserva, envio simultâneo idempotente, conflito de conteúdo, consumo, cancelamento e expiração repetida.

## Operação e canais previstos

Painel Canais apresenta contagens reais da fila local, data da tarefa mais antiga, falhas e reprocessamento. Reprocessar é uma transição atômica exclusiva de tarefas locais com falha; não duplica uma tarefa em execução e registra operador, tarefa e ação em auditoria persistente. Mensagens não devolvem corpos de provedores nem credenciais. Estados OAuth abandonados são removidos após 20 minutos, sem ler seus segredos.

Magalu, Casas Bahia, Americanas e SHEIN passam a ser tipos próprios, além de Mercado Livre, Shopee, Amazon e manual. Cadastro desses tipos organiza a conta, sem simular conexão ou operações comerciais. Cadastro/consentimento Mercado Livre está disponível; os demais conectores permanecem explicitamente indisponíveis. Corrigido limite inválido de consulta de anúncios e aviso de desconexão que descrevia exclusão de histórico incorretamente.

## Configurações das contas e consultas reais

Por orientação do usuário, desenvolvimento continua sem aguardar credenciais; somente ativação/validação com conta real depende do cadastro pelo cliente. Configurações → Integrações → Marketplaces apresenta os sete formulários em três passos. Credenciais cifradas na entidade Channel existente, campos permitidos por provedor, atualização parcial serializada, remoção explícita por campo, auditoria sem valores, ativação/desativação e consulta que devolve apenas presença dos campos. Não há segunda fonte de configuração nem retorno de chaves salvas. IA de orçamentos fica em aba própria (`?tab=ia`). Links de Canais abrem a configuração da conta correta.

Consultas reais de acesso implementadas: Mercado Livre `/users/me`; Amazon LWA + participação Brasil; Magalu consentimento PJ, troca/renovação coordenada e consulta do seller; Americanas/SkyHub consulta de status; Casas Bahia catálogo paginado em HLG/PRD; SHEIN consulta assinada da loja. Respostas e tempo de rede limitados; erros de provedores não expõem corpos ou segredos. Assinatura SHEIN coincide com o vetor oficial. Nenhuma consulta de conexão equivale a confirmação de publicação, faturamento ou sincronização remota.

Fontes adicionais: [Magalu OAuth](https://developers.magalu.com/docs/first-steps/create-an-application/authentication-authorization/index.html), [seller Magalu](https://developers.magalu.com/docs/apis/products/ref/portfolios-v-1-get-me/index.html), [Amazon LWA](https://developer-docs.amazon.com/sp-api/docs/connecting-to-the-selling-partner-api), [participação Amazon](https://developer-docs.amazon.com/sp-api/reference/getmarketplaceparticipations), [SkyHub autenticação](https://desenvolvedores.skyhub.com.br/guias-api-skyhub/autenticacao-e-formato-dos-dados), [status SkyHub](https://desenvolvedores.skyhub.com.br/pedidos/status-de-pedidos), [ofertas Casas Bahia](https://developers.grupocasasbahia.com.br/marketplace/docs/gestao-de-ofertas), [assinatura SHEIN](https://open.sheincorp.com/documents/apidoc/detail/3001520-1000012), [conta SHEIN](https://open.sheincorp.com/documents/apidoc/detail/3001165).

Validação: 41 testes backend, compilação, lint dos componentes, navegador nos sete formulários em 320/390/1440 pixels, integração descartável de permissões, preservação/remoção de credenciais, concorrência de atualização e renovação. Os testes usam apenas credenciais sintéticas e transportes de teste; nenhum foi executado com chaves comerciais reais.

Ainda pendentes: reserva de kits/localizações, valores Decimal, inbox/webhooks, tarefas de escrita remota, operações comerciais dos conectores e suas validações, pedidos/logística/pós-venda externos e conciliação financeira. Shopee possui formulário, mas contrato oficial dos endpoints ainda não foi acessível na pesquisa. Estas entregas não concluem fases 0 e 1 nem o plano completo.
