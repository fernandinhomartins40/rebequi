import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessCommercialRecord, assignedScope, saleScope } from './commercial-access-policy.js';
import { commercialQuoteSchema } from '@rebequi/shared/schemas';
test('Assisted quotes require confirmation, bounded quantities and unique catalog products', () => {
  const input = { requestKey: 'c8a4d4ad-a1cb-44c6-88f2-64a1ab55c41c', confirmed: true, customerId: 'customer', expectedCustomerVersion: 1, title: 'Materiais', items: [{ productId: 'product', name: 'Cimento', quantity: 1.5, unit: 'kg' }] };
  assert.equal(commercialQuoteSchema.safeParse(input).success, true);
  assert.equal(commercialQuoteSchema.safeParse({ ...input, confirmed: false }).success, false);
  assert.equal(commercialQuoteSchema.safeParse({ ...input, items: [...input.items, ...input.items] }).success, false);
  for (const quantity of [0, -1, Infinity, 1000001]) assert.equal(commercialQuoteSchema.safeParse({ ...input, items: [{ ...input.items[0], quantity }] }).success, false);
  assert.equal(commercialQuoteSchema.safeParse({ ...input, assignedSellerId: 'another-seller' }).success, false);
});
test('Seller access preserves legacy authored sales but explicit redistribution revokes that fallback', () => {
  const actor = { userId: 'seller-a', role: 'SALES' };
  assert.equal(canAccessCommercialRecord({ assignedSellerId: 'seller-a', assignmentVersion: 2 }, actor), true);
  assert.equal(canAccessCommercialRecord({ assignedSellerId: 'seller-b', assignmentVersion: 2, registeredById: 'seller-a' }, actor), false);
  assert.equal(canAccessCommercialRecord({ assignedSellerId: null, assignmentVersion: 0, registeredById: 'seller-a' }, actor), true);
  assert.equal(canAccessCommercialRecord({ assignedSellerId: null, assignmentVersion: 1, registeredById: 'seller-a' }, actor), false);
  assert.equal(canAccessCommercialRecord({ assignedSellerId: null, assignmentVersion: 0 }, actor), false);
  assert.equal(canAccessCommercialRecord({ assignedSellerId: 'seller-b', assignmentVersion: 1 }, { userId: 'admin', role: 'ADMIN' }), true);
  assert.deepEqual(assignedScope(actor), { assignedSellerId: 'seller-a' });
  assert.deepEqual(saleScope(actor), { OR: [{ assignedSellerId: 'seller-a' }, { assignedSellerId: null, assignmentVersion: 0, registeredById: 'seller-a' }] });
});
