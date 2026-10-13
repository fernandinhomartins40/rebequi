import test from 'node:test';
import assert from 'node:assert/strict';
import { commercialUnitPolicySchema, validateCommercialUnitQuantity } from '@rebequi/shared/schemas';
test('Unit policies require explicit confirmation and preserve indivisible packages', () => {
  const input = { commercialUnit: 'BAG', stockUnit: 'KG', stockPerCommercialUnit: '50', quantityStep: '1', confirmed: true };
  const policy = commercialUnitPolicySchema.parse(input);
  assert.equal(validateCommercialUnitQuantity(policy, '2'), '2');
  assert.throws(() => validateCommercialUnitQuantity(policy, '1.5'));
  assert.equal(commercialUnitPolicySchema.safeParse({ ...input, quantityStep: '0.5' }).success, false);
  assert.equal(commercialUnitPolicySchema.safeParse({ ...input, confirmed: false }).success, false);
  assert.equal(commercialUnitPolicySchema.safeParse({ ...input, stockPerCommercialUnit: '0' }).success, false);
  assert.equal(commercialUnitPolicySchema.safeParse({ ...input, commercialUnit: 'UNKNOWN' }).success, false);
  assert.equal(commercialUnitPolicySchema.safeParse({ ...input, stockPerCommercialUnit: undefined }).success, false);
});
test('Measured quantities obey exact steps and reject lossy stock conversion', () => {
  const policy = commercialUnitPolicySchema.parse({ commercialUnit: 'M3', stockUnit: 'M3', stockPerCommercialUnit: '1', quantityStep: '0.125', confirmed: true });
  assert.equal(validateCommercialUnitQuantity(policy, '1.375'), '1.375');
  assert.throws(() => validateCommercialUnitQuantity(policy, '1.3'));
  assert.throws(() => validateCommercialUnitQuantity(policy, '0'));
  assert.equal(commercialUnitPolicySchema.safeParse({ ...policy, stockPerCommercialUnit: '2' }).success, false);
  assert.equal(commercialUnitPolicySchema.safeParse({ ...policy, commercialUnit: 'TONNE', stockPerCommercialUnit: '0.001', quantityStep: '0.001' }).success, false);
});
