# API externa Rebequi v1 — consulta

Esta entrega permite consulta autenticada de catálogo/preços, saldos e pedidos desta instalação Rebequi. Não importa registros, não escreve estoque/pagamento, não conecta ERP, não envia webhook e não substitui homologação. O ERP/PDV da loja ainda não foi identificado. Os módulos de inbox/outbox e autoridade por domínio estão no GOAL, não operacionais nesta versão.

## Credenciais e acesso

Administrador/gerente com integrations:manage: Integrações → ERP/PDV e API → nome → permissões/validade → conferir/emissão. Nome não comprova conexão com fornecedor. O token rb_api_ aparece só nessa resposta/tela e deve ir diretamente para cofre do integrador, fora de frontend público/repositório/log/chat. O banco guarda SHA-256 do token aleatório de 256 bits, não o token. Nenhuma credencial é emitida automaticamente em produção.

Emissão exige requestKey UUID e confirmação. Reenvio da mesma intenção não cria outra credencial; retorna conflito e não recupera segredo. Se resposta foi perdida, consultar metadados, revogar a credencial emitida e gerar outra intenção. Revogação é idempotente e imediata na próxima consulta; expiração conferida em cada requisição. Usuário/sessão JWT não substitui token de integração. Atualizar credencial no cofre, testar nova e revogar antiga é o procedimento de rotação; não há exportação de segredos.

| Escopo | Operação | Conteúdo |
| --- | --- | --- |
| catalog:read | GET /api/external/v1/products | ID, SKU, nome, categoria, preço em centavos string BRL, ativo/excluído e updatedAt |
| stock:read | GET /api/external/v1/stock | ID, SKU, saldo comercial, reservado, disponível, ativo/excluído e updatedAt |
| orders:read | GET /api/external/v1/orders | ID, referência, origem, estado comercial, itens/productId/quantidade/preço e updatedAt, sem nome/telefone/endereço do comprador |
| quotes:read | GET /api/external/v1/quotes | Cabeçalhos de orçamentos identificados enviados, incluindo arquivados; exclui rascunhos. ID, referência, origem, estado, datas e itemCount |
| quotes:read | GET /api/external/v1/quotes/{id}/items | Materiais agrupados pelo orçamento, em páginas: ID/productId/nome/quantidade/unidade/posição; quoteId e quoteUpdatedAt identificam a leitura |

Materiais usam page/limit com os mesmos limites da coleção, sem updatedSince. Não exportam cadastro do cliente, título, observação, documento, resultado OCR, preço proposto ou auditoria interna. Nome e unidade do material podem ser texto informado pelo solicitante; não representam dados técnicos normalizados, reserva de estoque ou equivalência automática de unidade. Uma credencial anterior continua com os mesmos escopos: emita outra com quotes:read somente quando necessário. Nenhuma ampliação automática de acesso.

Leia os cabeçalhos e todas as páginas de materiais de cada orçamento. Se updatedAt do cabeçalho mudar enquanto os materiais forem lidos, releia antes de concluir o checkpoint. Cada consulta é somente leitura; não se promete snapshot entre requisições ou conexão homologada com ERP.

Cabeçalho: Authorization: Bearer TOKEN_DO_COFRE. Usar HTTPS em produção. Não enviar token em query string, não imprimir cabeçalhos com debug/verbose. Tokens são próprios desta instalação; não há seleção multiempresa/loja pelo cliente.

## Contrato, paginação e reconciliação

OpenAPI 3.1.1 disponível em GET /api/external/v1/openapi.json, sem segredos; explorador interativo no painel faz somente GET com até dois registros por consulta e mantém credencial somente em memória até limpar/sair. Credenciais do integrador nunca são enviadas para um ERP pelo explorador.

page padrão 1 (máximo 100000), limit padrão 20 (máximo 100), updatedSince opcional ISO 8601 UTC inclusivo. Exemplo de caminho sem segredo: /api/external/v1/products?page=1&limit=20&updatedSince=2026-10-12T00%3A00%3A00.000Z. Ordenação updatedAt/id ascendente. Resposta success=true/data inclui coleção, page/limit/total/totalPages e requestId. X-Request-ID identifica a consulta no servidor; não é chave de idempotência. Falhas padrão: success=false/error string/timestamp e errors de validação quando aplicável. 400 contrato inválido, 401 token ausente/inválido/expirado/revogado, 403 escopo insuficiente, 429 limite, 500 falha interna. Não tratar falha como coleção vazia.

Paginação não é snapshot transacional: mudanças durante varredura podem repetir/mover registros. Para polling inicial, guardar horário anterior ao início da varredura, usar janela sobreposta inclusiva, deduplicar por ID/updatedAt, concluir páginas e só então avançar checkpoint conservador. Interromper sem avançar checkpoint diante de erro; repetir leitura é seguro. Cursor/snapshot/eventos garantidos ainda não fazem parte deste contrato. Preservar deletedAt/isActive para reconciliação; não apagar automaticamente dados em ERP a partir de tombstone sem política aprovada.

priceCents/unitPriceCents são inteiros em strings, não valores de ponto flutuante para cálculo no integrador. available=max(0,stock-reservedStock). COMMERCIAL_UNIT refere-se à unidade de venda atual, sem equivalência presumida com kg, saco, m², m³ ou conversão de granel. COMPLETED é conclusão comercial do pedido, não prova de entrega. Status físico está no módulo logístico; esta API inicial não o exporta.

## Limites, privacidade e validação

30 consultas/minuto por credencial, mais o limite geral por IP existente (100/15 minutos para chamadas externas sem sessão administrativa). Respeitar Retry-After e reduzir frequência/lote, sem retry agressivo. Não usar sessão administrativa para contornar limites. Nesta implantação o limiter usa memória do processo atual; múltiplas réplicas exigem armazenamento/limite compartilhado antes de escalar. Sem novo Redis/contêiner.

Sem endpoint arbitrário ou chamada de saída: não há SSRF de conector nesta base. Respostas private/no-store e fora do cache PWA. Administrador lista somente metadados; não consegue recuperar token/hash por API. Emissão/revogação auditadas. Não prometer histórico individual persistente de cada GET nesta etapa; requestId acompanha solicitação/resposta, e monitoramento externo pode registrar esse ID sem segredos. Integrações reais exigem identificação do fornecedor, capacidades/documentação, fonte oficial por domínio, credenciais específicas no painel e homologação autorizada.

Teste mutante apenas no banco descartável do GitHub: emissões e revogações sintéticas, autorização/origem, hash-only, reenvio, escopos, expiração, leitura real/limite/sem PII, contratos e interface mobile. Nunca emitir credencial real ou alterar sistema comercial para validar produção.

Referência: [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html). Conectores futuros devem seguir as capacidades específicas descritas no [Bling](https://developer.bling.com.br/bling-api) e no [catálogo Omie](https://developer.omie.com.br/service-list/), conforme o fornecedor efetivamente escolhido.

## Prévia e vínculo de produtos externos

Uma sessão administrativa com permissão de gestão de integrações pode enviar até 100 registros estruturados para `POST /api/integrations/external-api/imports/products/preview`. Cada registro informa `externalId`, `sku`, `name`, `categoryId`, `priceCents` e `stockQuantity`, além de `source` no lote. A resposta identifica IDs e SKUs repetidos, SKU local já existente, categoria ausente e vínculo cujo SKU diverge. A autoridade continua local para catálogo, preço e estoque. `applied=false` significa que a prévia não importou nem atualizou dados.

Após conferir um produto local e seu SKU, `POST /api/integrations/external-api/imports/products/links` registra somente o vínculo entre `source`, `externalId` e `productId`, com `requestKey` UUID, `expectedSku` e `confirmed=true`. A mesma chave e conteúdo podem ser reenviados; conteúdo diferente, SKU alterado ou vínculo ativo conflitante retornam conflito. `POST /api/integrations/external-api/imports/products/links/{id}/revoke` exige `confirmed=true` e um motivo, preservando o histórico. A mesma origem não pode ter dois IDs ativos para o mesmo produto nem dois produtos ativos para o mesmo ID.

`GET /api/integrations/external-api/imports/products/links?page=1` lista os vínculos registrados, ativos e revogados, com paginação de 20 registros. O painel de Integrações aceita arquivo JSON de até 256 KB, apresenta a prévia de conflitos, permite vincular um SKU local confirmado e revogar um vínculo com motivo. O arquivo é analisado no navegador antes da prévia; nenhum lote é aplicado automaticamente.

Essas rotas usam cookie administrativo e verificação de origem, não a credencial Bearer da API externa. Ainda não há aplicação de lote, mudança de preço/estoque ou conector ERP ativo. A futura aplicação precisa escolher autoridade por domínio, registrar inbox idempotente e conciliar divergências antes de modificar dados.
