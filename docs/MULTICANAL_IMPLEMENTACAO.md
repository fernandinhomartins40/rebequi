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

Ainda pendentes: reserva por pedido/kit, valores Decimal, inbox/webhooks, tarefas de escrita remota, conectores oficiais e suas validações, pedidos/logística/pós-venda externos e conciliação financeira. Esta entrega não conclui fases 0 e 1 nem o plano completo.
