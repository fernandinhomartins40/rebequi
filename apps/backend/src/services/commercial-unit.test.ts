import test from 'node:test';
import assert from 'node:assert/strict';
import { commercialUnitPolicySchema, validateCommercialUnitQuantity, calculateCommercialUnitLine, previewCommercialUnitLineSchema } from '@rebequi/shared/schemas';
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

test('Measured sales cannot split indivisible stock packages', () => {
  for (const stockUnit of ['UNIT', 'PACKAGE', 'BAG', 'BOX']) {
    const input = { commercialUnit: 'KG', stockUnit, stockPerCommercialUnit: '0.02', quantityStep: '1', confirmed: true };
    assert.equal(commercialUnitPolicySchema.safeParse(input).success, false);
    const policy = commercialUnitPolicySchema.parse({ ...input, quantityStep: '50' });
    assert.equal(validateCommercialUnitQuantity(policy, '100'), '100');
    assert.throws(() => validateCommercialUnitQuantity(policy, '75'));
  }
});

test('Commercial line prices the sale unit and consumes the explicit stock unit', () => {
  const policy = commercialUnitPolicySchema.parse({ commercialUnit: 'TONNE', stockUnit: 'KG', stockPerCommercialUnit: '1000', quantityStep: '0.125', confirmed: true });
  const line = calculateCommercialUnitLine(policy, '0.250', 12345n);
  assert.deepEqual(line, { commercialUnit: 'TONNE', stockUnit: 'KG', stockPerCommercialUnit: '1000', quantityStep: '0.125', commercialQuantity: '0.25', stockQuantity: '250', unitPriceCents: '12345', lineTotalCents: '3086' });
  assert.doesNotThrow(() => JSON.stringify(line));
  assert.throws(() => calculateCommercialUnitLine(policy, '0.2', 12345n));
  assert.throws(() => calculateCommercialUnitLine(policy, '0.25', -1n));
  const changedPolicy = { ...policy, stockPerCommercialUnit: '999' };
  assert.equal(calculateCommercialUnitLine(changedPolicy, '0.25', 12345n).stockQuantity, '249.75');
  assert.equal(line.stockQuantity, '250');
});

test('Preview requires explicit price confirmation and rejects injected totals', () => {
  const input = { expectedVersion: 1, quantity: '0.125', unitPriceCents: '9007199254740991', unitPriceConfirmed: true };
  assert.equal(previewCommercialUnitLineSchema.safeParse(input).success, true);
  for (const price of ['9007199254740992', '1.5', '-1', '', 'abc']) assert.equal(previewCommercialUnitLineSchema.safeParse({ ...input, unitPriceCents: price }).success, false);
  assert.equal(previewCommercialUnitLineSchema.safeParse({ ...input, unitPriceConfirmed: false }).success, false);
  assert.equal(previewCommercialUnitLineSchema.safeParse({ ...input, lineTotalCents: '1' }).success, false);
});
