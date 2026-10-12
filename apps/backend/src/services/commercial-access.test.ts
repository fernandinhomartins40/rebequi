import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessCommercialRecord, assignedScope, saleScope } from './commercial-access-policy.js';
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
