import test from 'node:test';
import assert from 'node:assert/strict';
import { previewProductImportSchema } from '@rebequi/shared/schemas';
import { classifyProductImport } from './product-import-preview.service.js';

test('Product import preview exposes duplicates, local SKU collisions and missing categories without applying data', () => {
  const input = previewProductImportSchema.parse({ source: 'pdv-test', rows: [
    { externalId: 'A', sku: 'LOCAL', name: 'Produto existente', categoryId: 'cat-1', priceCents: '1234', stockQuantity: '2' },
    { externalId: 'B', sku: 'NEW', name: 'Produto novo', categoryId: 'cat-1', priceCents: '1234', stockQuantity: '2' },
    { externalId: 'B', sku: 'NEW', name: 'Produto repetido', categoryId: 'missing', priceCents: '1234', stockQuantity: '2' },
  ] });
  const result = classifyProductImport(input, [{ id: 'product-1', sku: 'LOCAL' }], [{ id: 'cat-1' }]);
  assert.deepEqual(result.rows[0].conflicts, ['SKU_ALREADY_LOCAL']);
  assert.equal(result.rows[0].localProductId, 'product-1');
  assert.deepEqual(result.rows[1].conflicts, ['DUPLICATE_EXTERNAL_ID', 'DUPLICATE_SKU']);
  assert.deepEqual(result.rows[2].conflicts, ['DUPLICATE_EXTERNAL_ID', 'DUPLICATE_SKU', 'CATEGORY_NOT_FOUND']);
  assert.deepEqual(result.summary, { total: 3, conflicts: 3, readyForReview: 0 });
  assert.equal(result.applied, false);
  assert.equal(result.authority.stock, 'LOCAL');
});

test('Import preview rejects unsafe, ambiguous and oversized input', () => {
  const row = { externalId: 'A', sku: 'SKU-1', name: 'Produto novo', categoryId: 'cat-1', priceCents: '1234', stockQuantity: '2' };
  const valid = { source: 'pdv-test', rows: [row] };
  assert.equal(previewProductImportSchema.safeParse(valid).success, true);
  for (const value of [{ ...valid, source: 'http://host/path' }, { ...valid, rows: [{ ...row, priceCents: '12.34' }] }, { ...valid, rows: [{ ...row, stockQuantity: '-1' }] }, { ...valid, rows: [row], apply: true }, { ...valid, rows: Array(101).fill(row) }]) {
    assert.equal(previewProductImportSchema.safeParse(value).success, false);
  }
});

test('Verified external links resolve known products and expose changed SKUs', () => {
  const base = { source: 'pdv-test', rows: [{ externalId: 'A', sku: 'SKU-1', name: 'Material novo', categoryId: 'cat-1', priceCents: '100', stockQuantity: '2' }] };
  const input = previewProductImportSchema.parse(base);
  const products = [{ id: 'product-1', sku: 'SKU-1' }]; const categories = [{ id: 'cat-1' }];
  const links = [{ source: 'pdv-test', externalId: 'A', productId: 'product-1' }];
  assert.equal(classifyProductImport(input, products, categories, links).rows[0].status, 'LINKED_REVIEW');
  const changedSku = previewProductImportSchema.parse({ ...base, rows: [{ ...base.rows[0], sku: 'SKU-2' }] });
  assert.deepEqual(classifyProductImport(changedSku, products, categories, links).rows[0].conflicts, ['LINK_SKU_MISMATCH']);
});
