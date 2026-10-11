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

Ainda pendentes: reserva por pedido/kit, valores Decimal, OAuth, inbox/webhooks, tarefas de escrita remota, conectores oficiais e suas validações, pedidos/logística/pós-venda externos e conciliação financeira. Esta entrega não conclui fases 0 e 1 nem o plano completo.
