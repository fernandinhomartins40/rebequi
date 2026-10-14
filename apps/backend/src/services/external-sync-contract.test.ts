import test from 'node:test';
import assert from 'node:assert/strict';
import { createExternalClientSchema, syncProductSchema, syncStockSchema, syncCustomerSchema, syncSaleSchema, syncSaleStatusSchema } from '@rebequi/shared/schemas';

test('Sync credentials require explicit domain scopes and a bounded source', () => {
  const client = { requestKey: 'fc68d5fc-8174-480c-a9e6-c66ef2bfaf00', name: 'Sistema comercial', validityDays: 30, confirmed: true };
  for (const scope of ['catalog:write', 'stock:write', 'customers:write', 'sales:write']) {
    assert.equal(createExternalClientSchema.safeParse({ ...client, scopes: [scope] }).success, false);
    assert.equal(createExternalClientSchema.safeParse({ ...client, scopes: [scope], source: 'loja-pdv' }).success, true);
  }
  assert.equal(createExternalClientSchema.safeParse({ ...client, scopes: ['customers:read', 'sales:read'] }).success, true);
});
test('Sync accepts cents, versioned writes and whole stock without permitting credentials or arbitrary fields', () => {
  const base = { requestKey: 'fc68d5fc-8174-480c-a9e6-c66ef2bfaf00', expectedUpdatedAt: null };
  const product = { ...base, sku: 'CIMENTO', name: 'Cimento', categoryId: 'category', priceCents: '1990', isActive: true };
  assert.equal(syncProductSchema.safeParse(product).success, true);
  for (const priceCents of ['19.90', '-1', '1e3', '01', '1000000000']) assert.equal(syncProductSchema.safeParse({ ...product, priceCents }).success, false);
  assert.equal(syncProductSchema.safeParse({ ...product, stock: 10 }).success, false);
  const stock = { ...base, expectedUpdatedAt: '2026-10-13T12:00:00.000Z', quantity: 10, reason: 'Contagem física' };
  assert.equal(syncStockSchema.safeParse(stock).success, true);
  for (const quantity of [-1, 1.5, 1000000001]) assert.equal(syncStockSchema.safeParse({ ...stock, quantity }).success, false);
  assert.equal(syncStockSchema.safeParse({ ...stock, expectedUpdatedAt: null }).success, false);
  const customer = { ...base, name: 'Cliente', email: 'cliente@example.invalid' };
  assert.equal(syncCustomerSchema.safeParse(customer).success, true);
  for (const extra of [{ role: 'ADMIN' }, { password: 'takeover' }, { isActive: true }]) assert.equal(syncCustomerSchema.safeParse({ ...customer, ...extra }).success, false);
});
test('External sales have unique product lines or a real order and monotonic payment transitions', () => {
  const item = { productId: 'cement', quantity: 2, unitPriceCents: '3990' };
  assert.equal(syncSaleSchema.safeParse({ paymentMethod: 'PIX', items: [item] }).success, true);
  assert.equal(syncSaleSchema.safeParse({ paymentMethod: 'PIX', items: [item, item] }).success, false);
  assert.equal(syncSaleSchema.safeParse({ paymentMethod: 'PIX', orderId: 'order' }).success, true);
  assert.equal(syncSaleSchema.safeParse({ paymentMethod: 'PIX', orderId: 'order', items: [item] }).success, false);
  assert.equal(syncSaleSchema.safeParse({ paymentMethod: 'PIX' }).success, false);
  assert.equal(syncSaleStatusSchema.safeParse({ status: 'PENDING_PAYMENT' }).success, false);
  assert.equal(syncSaleStatusSchema.safeParse({ status: 'PAID' }).success, true);
});
