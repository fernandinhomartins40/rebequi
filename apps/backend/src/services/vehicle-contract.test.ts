import test from 'node:test';
import assert from 'node:assert/strict';
import { vehicleSchema } from '@rebequi/shared/schemas';
import { hasMerchantPermission } from '@rebequi/shared/constants';
test('Fleet declares physical capacities precisely and restricts writes to management', () => {
  const input = { requestKey: '72768860-08e9-44e8-b464-59ef46de820a', expectedVersion: 0, confirmed: true, plate: 'abc-1234', label: 'Caminhão da loja', maxLoadKg: null, maxVolumeM3: '12.345', restrictions: null, active: true, reason: 'Cadastro conferido' };
  assert.equal(vehicleSchema.parse(input).plate, 'ABC1234');
  for (const capacity of ['0', '-1', '1e3', '1.2345', '1000000000', 'Infinity']) assert.equal(vehicleSchema.safeParse({ ...input, maxLoadKg: capacity }).success, false);
  assert.equal(vehicleSchema.safeParse({ ...input, maxLoadKg: '1500.125' }).success, true);
  assert.equal(vehicleSchema.safeParse({ ...input, confirmed: false }).success, false);
  assert.equal(vehicleSchema.safeParse({ ...input, reason: '' }).success, false);
  assert.equal(hasMerchantPermission('ADMIN', 'logistics:fleet'), true);
  assert.equal(hasMerchantPermission('MANAGER', 'logistics:fleet'), true);
  for (const role of ['WAREHOUSE', 'SALES', 'CUSTOMER', 'MARKETING']) assert.equal(hasMerchantPermission(role, 'logistics:fleet'), false);
});
