import test from 'node:test';
import assert from 'node:assert/strict';
import { fulfillmentDetailsSchema, fulfillmentOperationSchema, driverAssignmentSchema, pickupReceiptSchema, deliveryReceiptSchema, deliveryOccurrenceSchema } from '@rebequi/shared/schemas';
import { getMerchantPermissionsForRole } from '@rebequi/shared/constants';
const intent = { requestKey: '72768860-08e9-44e8-b464-59ef46de820a', expectedVersion: 1, confirmed: true };
test('Delivery impediments are confirmed notes for one stop, never a quantity or implicit reschedule', () => {
  const input = { ...intent, stopId: 'stop', kind: 'CUSTOMER_ABSENT', note: 'Cliente não estava no endereço' };
  assert.equal(deliveryOccurrenceSchema.safeParse(input).success, true);
  for (const change of [{ stopId: '' }, { kind: 'DELIVERED' }, { note: '' }, { confirmed: false }, { scheduledAt: '2026-11-17T00:00:00Z' }, { quantity: 1 }]) assert.equal(deliveryOccurrenceSchema.safeParse({ ...input, ...change }).success, false);
});
test('Delivery receipt requires one stop, a receiver and positive distinct material deltas', () => {
  const input = { ...intent, stopId: 'stop', receiverName: 'Recebedor', items: [{ id: 'allocation', quantity: 1 }] };
  assert.equal(deliveryReceiptSchema.safeParse(input).success, true);
  for (const quantity of [0, -1, 1.5, 1000001]) assert.equal(deliveryReceiptSchema.safeParse({ ...input, items: [{ id: 'allocation', quantity }] }).success, false);
  assert.equal(deliveryReceiptSchema.safeParse({ ...input, confirmed: false }).success, false);
  assert.equal(deliveryReceiptSchema.safeParse({ ...input, stopId: '' }).success, false);
  assert.equal(deliveryReceiptSchema.safeParse({ ...input, receiverName: '' }).success, false);
  assert.equal(deliveryReceiptSchema.safeParse({ ...input, items: [...input.items, ...input.items] }).success, false);
  assert.equal(deliveryReceiptSchema.safeParse({ ...input, userId: 'another-driver' }).success, false);
});
test('Pickup requires identified receipt, positive whole quantities and a single occurrence per material', () => {
  const input = { ...intent, receiverName: 'Recebedor isolado', items: [{ id: 'material', quantity: 1 }] };
  assert.equal(pickupReceiptSchema.safeParse(input).success, true);
  for (const quantity of [0, -1, 1.5, 1000001]) assert.equal(pickupReceiptSchema.safeParse({ ...input, items: [{ id: 'material', quantity }] }).success, false);
  assert.equal(pickupReceiptSchema.safeParse({ ...input, receiverName: '' }).success, false);
  assert.equal(pickupReceiptSchema.safeParse({ ...input, confirmed: false }).success, false);
  assert.equal(pickupReceiptSchema.safeParse({ ...input, items: [...input.items, ...input.items] }).success, false);
});
test('Delivery requires a verified address; warehouse rejects fractional units, duplicates and unconfirmed writes', () => {
  assert.deepEqual(getMerchantPermissionsForRole('WAREHOUSE'), ['logistics:manage']);
  assert.deepEqual(getMerchantPermissionsForRole('DRIVER'), ['logistics:drive']);
  assert.equal(driverAssignmentSchema.safeParse({ ...intent, driverId: null, reason: 'Remover motorista da entrega' }).success, true);
  assert.equal(driverAssignmentSchema.safeParse({ ...intent, driverId: 'driver-a', reason: '' }).success, false);
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
