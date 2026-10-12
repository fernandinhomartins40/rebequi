import test from 'node:test';
import assert from 'node:assert/strict';
import { priceLaborItem, priceLaborQuote } from '@rebequi/shared/utils';
test('Labor pricing keeps cents, rounds each line and excludes material prices', () => {
  const item = { description: 'Pintura da sala', quantity: 1.25, unit: 'm²', unitPriceCents: 1999 };
  assert.equal(priceLaborItem(item), 2499);
  assert.equal(priceLaborItem({ ...item, quantity: 1.001, unitPriceCents: 1000 }), 1001);
  assert.deepEqual(priceLaborQuote([item, { ...item, quantity: 0.001, unitPriceCents: 500 }]), { lineTotals: [2499, 1], totalCents: 2500 });
  assert.throws(() => priceLaborItem({ ...item, quantity: 1.0001 }));
  assert.throws(() => priceLaborItem({ ...item, unitPriceCents: -1 }));
  assert.throws(() => priceLaborItem({ ...item, quantity: 0 }));
});
