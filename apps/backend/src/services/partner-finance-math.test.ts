import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateDiscountedLines, benefitsForBasis, cumulativeReturnCents } from './partner-finance-math.js';

test('benefits use net product cents, floor each mechanism independently and fully reverse', () => {
  const earned = benefitsForBasis(10001n, 250, 3);
  assert.deepEqual(earned, { commissionCents: 250n, points: 300n });
  const returned = benefitsForBasis(10001n, 250, 3);
  assert.equal(earned.commissionCents - returned.commissionCents, 0n);
  assert.throws(() => benefitsForBasis(-1n, 250, 3));
});
test('discount rate allocation conserves cents and does not depend on incoming line order', () => {
  const lines = [{ id: 'a', cents: 100n }, { id: 'b', cents: 100n }, { id: 'c', cents: 100n }];
  const first = allocateDiscountedLines(lines, 200n); const reverse = allocateDiscountedLines([...lines].reverse(), 200n);
  assert.deepEqual(first, reverse); assert.deepEqual([...first.values()], [67n, 67n, 66n]);
  assert.equal([...first.values()].reduce((a, b) => a + b), 200n);
  assert.throws(() => allocateDiscountedLines(lines, 301n));
});
test('partial returns use cumulative rounding so final return preserves every cent', () => {
  const initial = cumulativeReturnCents(100n, 3, 1); const second = cumulativeReturnCents(100n, 3, 2); const final = cumulativeReturnCents(100n, 3, 3);
  assert.equal(initial, 33n); assert.equal(second - initial, 33n); assert.equal(final - second, 34n);
  assert.throws(() => cumulativeReturnCents(100n, 3, 4));
});
