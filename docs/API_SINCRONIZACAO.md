# Sincronização comercial — API Rebequi 1.1

Base `/api/external/v1`. OpenAPI completo em `GET /api/external/v1/openapi.json`. Os dados são os mesmos do painel: produtos, clientes, vendas, movimentos e separação. Os fluxos anteriores de consulta/revisão continuam descritos em [API externa ERP/PDV](API_EXTERNA_ERP_PDV.md).

## Configurar

1. Identificar ERP/PDV, documentação e capacidades. O fornecedor e suas credenciais ainda não foram informados; nenhum conector de fornecedor foi ativado automaticamente.
2. Proprietário/gerente: **Integrações → ERP/PDV e API**. Informar nome, origem estável (ex.: `pdv-loja`), permissões e validade; conferir e emitir credencial. Escrita exige origem. Credenciais antigas não recebem novas permissões automaticamente.
3. Guardar o token `rb_api_…` no cofre do integrador; só aparece na emissão. Enviar `Authorization: Bearer <token>` por HTTPS, nunca em URL/log/repositório/chat. Sessão de usuário não autentica esta API.
4. Homologar correspondência de IDs, unidade comercial e sequência de estoque/vendas. Definir qual sistema faz cada atualização; evitar dois importadores concorrentes para o mesmo cadastro.

O banco guarda somente hash do token. Revogação/expiração bloqueiam consultas, escrita e reenvios. Rotação: emitir outra credencial com a **mesma origem**, instalar no integrador e revogar a antiga. Vínculos e recibos de sincronização sobrevivem à rotação. Lotes de revisão antigos continuam pertencendo exclusivamente à credencial remetente.

## Operações

| Escopo | Método/caminho após a base | Efeito |
| --- | --- | --- |
| `catalog:read` | `GET /products` | Consultar produtos, categoria, preço e versão |
| `catalog:write` | `PUT /products/{externalId}` | Criar/atualizar produto, preço e publicação |
| `stock:read` | `GET /stock` | Consultar saldo físico, reservas, disponível e versão |
| `stock:write` | `PUT /stock/{externalId}` | Definir saldo físico absoluto com movimento auditado |
| `customers:read` | `GET /customers` | Consultar clientes e contatos; exclui colaboradores e credenciais |
| `customers:write` | `PUT /customers/{externalId}` | Criar cadastro com e-mail ou atualizar nome de cliente vinculado |
| `sales:read` | `GET /sales` | Consultar vendas, IDs do cliente/pedido, valores e itens |
| `sales:write` | `PUT /sales/{externalId}` | Registrar venda uma única vez por origem/ID externo |
| `sales:write` | `PATCH /sales/{externalId}/status` | Confirmar pagamento ou cancelar venda da mesma origem |

Leitura e escrita são independentes. `customers:read` concede acesso a nomes/contatos da loja inteira; selecionar somente quando necessário. Escopos anteriores `orders:read`, `quotes:read` e `imports:write` continuam funcionando. `imports:write` permite revisão de lote, sem aplicação direta.

## Identidade e reenvios

`externalId`: código estável no sistema externo, 1–120 caracteres (`A-Z`, `a-z`, números, `.`, `_`, `:`, `-`). A origem vem exclusivamente da credencial. Produtos/clientes reutilizam os vínculos já geridos no painel. Quando o cadastro existe localmente, **conferir e vincular no painel antes de sincronizar**. A API não associa automaticamente por nome, SKU ou contato. Colisão retorna 409; SKU permanece reservado inclusive após arquivar produto. Categoria deve ser local e ativa; obtenha seu ID no catálogo/painel.

Produto, estoque e cliente exigem UUID `requestKey`, persistido no integrador antes do envio. Chave nova por alteração. `expectedUpdatedAt=null` cria produto/cliente; para atualizar, usar a versão ISO 8601 da leitura atual. Estoque sempre exige versão não nula. A resposta contém ID local, ID externo e nova versão; guardar a correspondência no integrador.

Recibo e alteração são gravados na mesma transação. Reenvio idêntico retorna recibo original sem repetir estoque/venda/vínculo; mesma chave com outro conteúdo retorna 409. Chaves isoladas por origem/tipo de operação. Após timeout/500, repetir a mesma intenção/chave. Após 409, consultar estado, conciliar e usar outra intenção/chave.

Recibo é confirmação **histórica**, não estado atual: não substituir uma versão recente por recibo antigo. Recibos não são apagados automaticamente.

### Produto e preço

`PUT /products/CIM-50`:

```json
{
  "requestKey": "7999335e-f39d-46be-8468-cda8aba94147",
  "expectedUpdatedAt": null,
  "sku": "CIM-50",
  "name": "Cimento 50 kg",
  "categoryId": "ID_REAL_DA_CATEGORIA",
  "priceCents": "3990",
  "isActive": true
}
```

Atualização usa corpo completo, nova chave e versão atual. Novo produto começa com estoque zero; saldo é operação separada. Preserva imagens, ofertas e especificações existentes. `isActive=false` desativa sem apagar histórico. Produto arquivado exige revisão local.

### Estoque

`PUT /stock/CIM-50`:

```json
{
  "requestKey": "301b84ba-cdc1-4d9c-baa8-c74e8d4ca420",
  "expectedUpdatedAt": "2026-10-13T15:00:00.000Z",
  "quantity": 120,
  "reason": "Conciliação do saldo físico do ERP"
}
```

Quantidade é saldo **absoluto**, inteiro, na unidade comercial cadastrada; não é delta, saldo disponível ou conversão kg/saco/m²/m³. Preserva reservas e rejeita saldo inferior ao reservado. `available=max(0,stock-reservedStock)`. Alteração efetiva gera movimento ADJUSTMENT; atualizações de catálogo/saldo invalidam os canais existentes pelo outbox atual.

Para evitar baixa dupla: registrar primeiro vendas externas ausentes; consultar a versão resultante; depois enviar saldo físico final do ERP. Registrar venda já baixa estoque. Não descontar a mesma venda novamente por delta externo. Mudança concorrente retorna 409: conciliar vendas e reservas antes de tentar outro saldo.

### Clientes

`PUT /customers/CLI-123` recebe `{requestKey,expectedUpdatedAt,name,email?}`. E-mail válido é obrigatório para criar e é normalizado; contato existente retorna 409 para vínculo administrativo. Atualização permite nome; omita e-mail ou envie o mesmo identificador local. Não altera senha, papel, ativação, WhatsApp nem identificador de acesso.

Cadastro novo não emite credenciais de login. Para acompanhamento com acesso existente, vincular o ID externo à conta correta previamente cadastrada, evitando conta duplicada. Clientes registrados somente por WhatsApp podem ser vinculados para vendas e ter seu nome atualizado por esta rota omitindo `email`. Não há recuperação de senha ou mudança de contato pela API comercial.

### Vendas

`PUT /sales/PDV-456`:

```json
{
  "customerExternalId": "CLI-123",
  "paymentMethod": "PIX",
  "status": "PAID",
  "discountCents": "0",
  "items": [{ "productId": "ID_REAL_DO_PRODUTO", "quantity": 2, "unitPriceCents": "3990" }]
}
```

ID externo é chave permanente de criação; não exige `requestKey`. Mesmo ID/conteúdo retorna recibo, conteúdo diferente retorna 409. Não enviar a mesma venda por origens diferentes. Itens usam IDs locais; máximo 100 linhas, sem produtos repetidos. Centavos são strings inteiras até `999999999`. Pagamentos PIX/CASH/CARD/INSTALLMENT; estado inicial PAID/PENDING_PAYMENT. Desconto segue a regra atual de venda, limitado ao subtotal.

Para pedido do site, informar `orderId` em vez de `items`: itens/preços/cliente vêm do pedido. Se também informar `customerExternalId`, precisa corresponder ao cliente do pedido. Evita uma segunda venda para o pedido. Cliente pode ser omitido em venda avulsa; ela não aparecerá no painel de um comprador.

Reutiliza rotina transacional de venda/itens/movimentos, baixa estoque e consome reserva. Venda paga cria separação; pendente já baixa saldo, liberando separação só após pagamento. Importação não inventa vendedor creditado: a gestão atribui atendimentos pelo fluxo comercial existente.

`PATCH /sales/PDV-456/status`: `{"status":"PAID"}` ou `{"status":"CANCELED"}`. Somente vendas criadas pela mesma origem. Idempotência por venda/estado. Cancelamento repõe saldo uma vez, respeita devoluções e bloqueia romaneio ativo ou materiais recebidos sem devolução. Não reabre venda cancelada. Ajustes de itens, reversão de pagamento e devolução física exigem conciliação no painel. Reenvio devolve recibo histórico sem reaplicar transição.

## Consultas e operação

Listagens: `page` padrão 1/máximo 100000, `limit` padrão 20/máximo 100, `updatedSince` UTC inclusivo opcional. Ordem `updatedAt,id` ascendente. Resposta `success=true,data` inclui coleção, total/page/limit/totalPages/requestId. Gravações retornam recibo em `data`. `X-Request-ID` identifica chamada, não é chave de reenvio. Valores monetários de saída em centavos string BRL.

Paginação não é snapshot: usar sobreposição temporal, deduplicar ID/updatedAt e só avançar checkpoint após completar páginas sem erros. Respeitar isActive/deletedAt, sem apagar automaticamente histórico externo. COMPLETED é conclusão comercial, não prova de entrega.

Erros `success=false,error` com timestamp; validação pode incluir detalhes. 400 contrato/transição inválidos, 401 credencial inválida/expirada/revogada, 403 escopo/origem, 404 recurso/vínculo ausente, 409 conflito, 429 limite, 500 falha interna. Nunca tratar erro como lista vazia.

30 chamadas/minuto por credencial, além do limite geral existente por IP de 100/15 minutos. Respeitar Retry-After e usar fila. Limiter em memória; múltiplas réplicas exigem limite compartilhado. Respostas `private,no-store`, fora do cache PWA. Explorador do painel faz somente GET e guarda token em memória.

Testes mutantes somente no banco descartável do GitHub Actions. Produção não recebe contas, vendas ou credenciais de teste. Homologação do ERP específico depende do fornecedor e dos acessos reais.
