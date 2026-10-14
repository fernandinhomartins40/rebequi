const text = { type: 'string' };
const id = { type: 'string', minLength: 1, maxLength: 120, pattern: '^[A-Za-z0-9._:-]+$' };
const cents = { type: 'string', pattern: '^(0|[1-9]\\d{0,8})$', description: 'Centavos BRL. Máximo 999999999.' };
const version = { type: ['string', 'null'], format: 'date-time', description: 'null somente para criação; na atualização use updatedAt da leitura mais recente.' };
const base = { requestKey: { type: 'string', format: 'uuid' }, expectedUpdatedAt: version };
const result = { type: 'object', required: ['success', 'data'], properties: { success: { const: true }, data: { type: 'object', required: ['id', 'externalId', 'updatedAt'], properties: {
  id: text, externalId: id, updatedAt: { type: 'string', format: 'date-time' }, status: text, stock: { type: 'integer' }, reservedStock: { type: 'integer' },
} } } };
function write(scope: string, description: string, properties: object, required: string[], constraints: object = {}) {
  return { summary: description, description: `Exige ${scope} e origem na credencial. Reenvio idêntico devolve o recibo original sem reaplicar. Em conflito, consulte o estado atual e use outra requestKey. Não use o recibo histórico como estado atual.`, security: [{ integrationToken: [] }],
    parameters: [{ name: 'externalId', in: 'path', required: true, schema: id }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required, properties, ...constraints } } } },
    responses: { '200': { description: 'Operação aplicada ou recibo de reenvio.', content: { 'application/json': { schema: result } } },
      '400': { description: 'Contrato inválido.' }, '401': { description: 'Credencial inválida, expirada ou revogada.' },
      '403': { description: 'Escopo/origem insuficiente.' }, '404': { description: 'Vínculo, categoria, produto ou cliente não encontrado.' },
      '409': { description: 'Versão desatualizada, chave reutilizada, cadastro em conflito, estoque reservado ou operação física impede alteração.' },
      '429': { description: 'Limite atingido; respeite Retry-After.' }, '500': { description: 'Falha interna; repita com a mesma chave.' } },
  };
}
export const externalSyncPaths = {
  '/products/{externalId}': { put: write('catalog:write', 'Criar ou atualizar produto e preço pelo vínculo da origem', { ...base,
    sku: { ...text, minLength: 1, maxLength: 100 }, name: { ...text, minLength: 1, maxLength: 255 }, categoryId: { ...text, minLength: 1, maxLength: 128 }, priceCents: cents, isActive: { type: 'boolean' },
  }, ['requestKey', 'expectedUpdatedAt', 'sku', 'name', 'categoryId', 'priceCents', 'isActive']) },
  '/stock/{externalId}': { put: write('stock:write', 'Definir saldo físico absoluto do produto vinculado, respeitando reservas', { ...base,
    expectedUpdatedAt: { type: 'string', format: 'date-time' }, quantity: { type: 'integer', minimum: 0, maximum: 1000000000 }, reason: { ...text, minLength: 3, maxLength: 300 },
  }, ['requestKey', 'expectedUpdatedAt', 'quantity', 'reason']) },
  '/customers/{externalId}': { put: write('customers:write', 'Criar cliente com e-mail ou atualizar seu nome pelo vínculo; preserva login e permissões', { ...base,
    name: { ...text, minLength: 1, maxLength: 255 }, email: { ...text, format: 'email', maxLength: 255 },
  }, ['requestKey', 'expectedUpdatedAt', 'name'], { allOf: [{ if: { properties: { expectedUpdatedAt: { type: 'null' } } }, then: { required: ['email'] } }] }) },
  '/sales/{externalId}': { put: { ...write('sales:write', 'Registrar venda pelo ID externo único na origem', {
    customerExternalId: id, orderId: { ...text, minLength: 1, maxLength: 128 }, paymentMethod: { enum: ['PIX', 'CASH', 'CARD', 'INSTALLMENT'] },
    status: { enum: ['PAID', 'PENDING_PAYMENT'], default: 'PAID' }, discountCents: { ...cents, default: '0' },
    items: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'object', additionalProperties: false, required: ['productId', 'quantity', 'unitPriceCents'], properties: {
      productId: { ...text, minLength: 1, maxLength: 128 }, quantity: { type: 'integer', minimum: 1, maximum: 9999 }, unitPriceCents: cents,
    } } },
  }, ['paymentMethod']), description: 'Exige sales:write. O ID externo é a chave de criação permanente na origem, inclusive após rotação de credencial. Mesmo conteúdo retorna recibo original; conteúdo diferente retorna 409. Informe items (sem produtos repetidos) OU orderId; pedidos usam seus itens/preços atuais e cliente vinculado. A venda baixa estoque uma única vez, consome eventual reserva do pedido e, quando paga, cria a separação. Não importar a mesma venda por origens diferentes. customerExternalId deve estar vinculado na mesma origem. Alteração de itens/preços exige conciliação no painel.' } },
  '/sales/{externalId}/status': { patch: { ...write('sales:write', 'Confirmar pagamento ou cancelar venda desta origem', { status: { enum: ['PAID', 'CANCELED'] } }, ['status']),
    description: 'Exige sales:write. Localiza somente venda criada pela mesma origem. Transições para PAID ou CANCELED são idempotentes por ID externo/status. Cancelamento repõe saldo apenas uma vez e respeita romaneios, recebimentos e devoluções existentes. Não reabre venda cancelada nem reverte pagamento; concilie exceções no painel. Reenvio retorna recibo histórico sem reaplicar.' } },
};
