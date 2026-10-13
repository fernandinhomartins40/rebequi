import test from 'node:test';
import assert from 'node:assert/strict';
import { canOperateDeliveryRun } from './delivery-run-operation-policy.js';
import { deliveryRunOperationSchema } from '@rebequi/shared/schemas';
test('Warehouse confirms physical loading; only management or the assigned driver confirms departure', () => {
  const warehouse = { userId: 'warehouse', role: 'WAREHOUSE' };
  assert.equal(canOperateDeliveryRun(warehouse, 'driver', 'LOAD'), true);
  assert.equal(canOperateDeliveryRun(warehouse, 'driver', 'UNLOAD'), true);
  assert.equal(canOperateDeliveryRun(warehouse, 'driver', 'DEPART'), false);
  assert.equal(canOperateDeliveryRun({ userId: 'driver', role: 'DRIVER' }, 'driver', 'DEPART'), true);
  assert.equal(canOperateDeliveryRun({ userId: 'other', role: 'DRIVER' }, 'driver', 'DEPART'), false);
  assert.equal(canOperateDeliveryRun({ userId: 'driver', role: 'DRIVER' }, 'driver', 'LOAD'), false);
  assert.equal(canOperateDeliveryRun({ userId: 'admin', role: 'ADMIN' }, 'driver', 'DEPART'), true);
  for (const role of ['CUSTOMER', 'SALES', 'MARKETING']) assert.equal(canOperateDeliveryRun({ userId: 'driver', role }, 'driver', 'LOAD'), false);
});
test('Loading requires positive explicit physical measurements and unload requires a reason', () => {
  const base = { requestKey: '72768860-08e9-44e8-b464-59ef46de820a', expectedVersion: 1, confirmed: true };
  const load = { ...base, action: 'LOAD', items: [{ id: 'item', quantity: 2 }], measurements: [{ stopId: 'stop', loadKg: '100.001', volumeM3: '0.5' }] };
  assert.equal(deliveryRunOperationSchema.safeParse(load).success, true);
  assert.equal(deliveryRunOperationSchema.safeParse({ ...load, measurements: [] }).success, false);
  assert.equal(deliveryRunOperationSchema.safeParse({ ...load, items: [...load.items, ...load.items] }).success, false);
  assert.equal(deliveryRunOperationSchema.safeParse({ ...load, measurements: [{ ...load.measurements[0], loadKg: '0' }] }).success, false);
  assert.equal(deliveryRunOperationSchema.safeParse({ ...base, action: 'UNLOAD', note: '' }).success, false);
  assert.equal(deliveryRunOperationSchema.safeParse({ ...base, action: 'DEPART' }).success, true);
  assert.equal(deliveryRunOperationSchema.safeParse({ ...base, action: 'DEPART', items: load.items }).success, false);
});
