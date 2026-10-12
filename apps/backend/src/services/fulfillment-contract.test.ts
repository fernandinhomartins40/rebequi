import test from 'node:test';
import assert from 'node:assert/strict';
import { fulfillmentDetailsSchema, fulfillmentOperationSchema } from '@rebequi/shared/schemas';
import { getMerchantPermissionsForRole } from '@rebequi/shared/constants';
const intent = { requestKey: '72768860-08e9-44e8-b464-59ef46de820a', expectedVersion: 1, confirmed: true };
test('Delivery requires a verified address; warehouse rejects fractional units, duplicates and unconfirmed writes', () => {
  assert.deepEqual(getMerchantPermissionsForRole('WAREHOUSE'), ['logistics:manage']);
  const details = { ...intent, mode: 'DELIVERY', address: null, region: null, scheduledAt: null, notes: null };
  assert.equal(fulfillmentDetailsSchema.safeParse(details).success, false);
  assert.equal(fulfillmentDetailsSchema.safeParse({ ...details, address: 'Rua de teste, 123, bairro de teste' }).success, true);
  assert.equal(fulfillmentDetailsSchema.safeParse({ ...details, mode: 'PICKUP' }).success, true);
  const operation = { ...intent, action: 'PICK', items: [{ id: 'item-a', quantity: 1 }] };
  assert.equal(fulfillmentOperationSchema.safeParse(operation).success, true);
  assert.equal(fulfillmentOperationSchema.safeParse({ ...operation, confirmed: false }).success, false);
  assert.equal(fulfillmentOperationSchema.safeParse({ ...operation, items: [{ id: 'item-a', quantity: 1.5 }] }).success, false);
  assert.equal(fulfillmentOperationSchema.safeParse({ ...operation, items: [{ id: 'item-a', quantity: 1 }, { id: 'item-a', quantity: 2 }] }).success, false);
  assert.equal(fulfillmentOperationSchema.safeParse({ ...intent, action: 'ISSUE', note: '' }).success, false);
});
