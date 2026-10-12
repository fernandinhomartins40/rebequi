import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMaterials } from '@rebequi/shared/utils';
test('Paint finished coverage includes coats once, per-coat coverage multiplies and packages round up', () => {
  const input = { service: 'PAINT' as const, areaM2: 110, openingsM2: 10, coats: 3, lossPercent: 10 };
  const spec = { kind: 'PAINT' as const, packageLiters: 18, coverageM2PerPack: 110, coverageBasis: 'FINISHED' as const };
  assert.equal(calculateMaterials(input, spec).packages, 1);
  assert.equal(calculateMaterials(input, { ...spec, coverageBasis: 'PER_COAT' }).packages, 3);
  assert.equal(calculateMaterials({ ...input, lossPercent: 11 }, spec).packages, 2);
});
test('Tile quantities use real box area and reject missing or incompatible technical data', () => {
  const input = { service: 'TILE' as const, areaM2: 20, openingsM2: 0, coats: 1, lossPercent: 10 };
  const result = calculateMaterials(input, { kind: 'TILE', areaM2PerPack: 2 });
  assert.equal(result.packages, 11); assert.equal(result.quantityPurchased, 22);
  assert.throws(() => calculateMaterials({ ...input, openingsM2: 20 }, { kind: 'TILE', areaM2PerPack: 2 }));
  assert.throws(() => calculateMaterials(input, { kind: 'TILE', areaM2PerPack: 0 }));
  assert.throws(() => calculateMaterials(input, { kind: 'PAINT', packageLiters: 18, coverageM2PerPack: 100, coverageBasis: 'FINISHED' }));
});
