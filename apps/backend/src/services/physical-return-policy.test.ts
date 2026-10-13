import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePhysicalReturn } from './physical-return-policy.js';
test('Returns distinguish pending materials from customer receipts without inventing legacy receipt history', () => {
  const input = { sold: 3, previouslyReturned: 1, received: 1, quantity: 1 };
  assert.deepEqual(reconcilePhysicalReturn({ ...input, origin: 'NOT_RECEIVED' }), { origin: 'NOT_RECEIVED', receivedAfter: 1 });
  assert.deepEqual(reconcilePhysicalReturn({ ...input, origin: 'RECEIVED_FROM_CUSTOMER' }), { origin: 'RECEIVED_FROM_CUSTOMER', receivedAfter: 0 });
  assert.throws(() => reconcilePhysicalReturn(input));
  for (const origin of ['NOT_RECEIVED', 'RECEIVED_FROM_CUSTOMER'] as const) assert.throws(() => reconcilePhysicalReturn({ ...input, origin, quantity: 2 }));
  assert.deepEqual(reconcilePhysicalReturn({ ...input, received: null }), { origin: null, receivedAfter: null });
  assert.throws(() => reconcilePhysicalReturn({ ...input, received: null, origin: 'RECEIVED_FROM_CUSTOMER' }));
  assert.throws(() => reconcilePhysicalReturn({ ...input, received: 0, origin: 'RECEIVED_FROM_CUSTOMER' }));
});
