import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit';
process.env.JWT_SECRET ??= 'unit-test-secret-not-used-in-production-123';
const { QuoteService } = await import('./quote.service.js');

function parser(names: string[]) {
  const service = new QuoteService();
  Reflect.get(service, 'productRepository').findCatalogForMatching = async () => names.map((name, index) => ({ id: `product-${index}`, name, sku: '', category: null }));
  Reflect.get(service, 'quoteRepository').findApprovedAliases = async () => [];
  return Reflect.get(service, 'parseItemsFromRecognition').bind(service);
}

test('ambiguous catalog variants preserve the transcription for customer review', async () => {
  const parse = parser(['Cimento CP II 50kg', 'Cimento CP V 50kg']);
  const result = await parse([{ text: 'Cimento', quantity: 3, confidence: 95, recognitionSourceLine: '3 sc cimento' }], 'deepseek');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].productId, undefined);
  assert.equal(result.items[0].name, 'Cimento');
  assert.equal(result.items[0].quantity, 3);
  assert.equal(result.items[0].recognitionSourceLine, '3 sc cimento');
});

test('matching preserves repeated lines and separates quantity from product size', async () => {
  const parse = parser(['Tinta Acrílica 18L', 'Tinta Acrílica 3.6L']);
  const line = { text: 'Tinta Acrílica 18L', quantity: 2, confidence: 95, unit: 'un', recognitionSourceLine: '2 un tinta acrílica 18L' };
  const result = await parse([line, line], 'deepseek');
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].productId, 'product-0');
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[1].quantity, 2);
  assert.equal(result.items[1].position, 1);
});
