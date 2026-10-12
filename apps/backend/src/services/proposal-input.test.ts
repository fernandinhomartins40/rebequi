import test from 'node:test';
import assert from 'node:assert/strict';
import { proposalSchema } from '@rebequi/shared/schemas';
import { parseMoneyCents } from '@rebequi/shared/utils';
test('Proposals reject duplicate products, fractional stock quantities and injected totals', () => {
  const item = { productId: 'sku', quantity: 1, unitPriceCents: 1999 };
  const input = { items: [item], validityDays: 7, expectedLatestVersion: 0, requestKey: '00000000-0000-4000-8000-000000000001' };
  assert.equal(proposalSchema.safeParse(input).success, true);
  assert.equal(proposalSchema.safeParse({ ...input, items: [item, item] }).success, false);
  assert.equal(proposalSchema.safeParse({ ...input, items: [{ ...item, quantity: 1.5 }] }).success, false);
  assert.equal(proposalSchema.safeParse({ ...input, totalCents: 1 }).success, false);
});
test('Money input converts exact decimal cents and rejects ambiguous or unsafe amounts', () => {
  assert.equal(parseMoneyCents('19,99'), 1999); assert.equal(parseMoneyCents('0.10'), 10); assert.equal(parseMoneyCents(' 25 '), 2500);
  for (const invalid of ['1.234,00', '1,001', '-1', 'Infinity', '', '9007199254740991']) assert.throws(() => parseMoneyCents(invalid));
});
