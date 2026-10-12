import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryRunSchema, cancelDeliveryRunSchema } from '@rebequi/shared/schemas';
test('Delivery planning limits stops and preserves unknown measurements without inferred conversion', () => {
  const input = { requestKey: '72768860-08e9-44e8-b464-59ef46de820a', confirmed: true, label: 'Rota de teste', driverId: 'driver', vehicleId: 'vehicle', scheduledAt: '2026-11-15T13:30:00Z', stops: [{ fulfillmentId: 'task', expectedVersion: 1, loadKg: null, volumeM3: null }] };
  assert.equal(deliveryRunSchema.safeParse(input).success, true);
  assert.equal(deliveryRunSchema.safeParse({ ...input, stops: [...input.stops, ...input.stops] }).success, false);
  assert.equal(deliveryRunSchema.safeParse({ ...input, stops: [] }).success, false);
  assert.equal(deliveryRunSchema.safeParse({ ...input, stops: Array.from({ length: 21 }, (_, index) => ({ ...input.stops[0], fulfillmentId: `task-${index}` })) }).success, false);
  for (const loadKg of ['0', '-1', '1.0001', '1e3']) assert.equal(deliveryRunSchema.safeParse({ ...input, stops: [{ ...input.stops[0], loadKg }] }).success, false);
  assert.equal(cancelDeliveryRunSchema.safeParse({ requestKey: input.requestKey, expectedVersion: 1, confirmed: true, reason: '' }).success, false);
});
