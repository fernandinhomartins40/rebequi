import test from 'node:test';
import assert from 'node:assert/strict';
import { commercialAvailableQuantity, commercialReturnDeltaCents } from '@rebequi/shared/utils';
import { parseCommercialQuantity, formatCommercialQuantity, convertCommercialQuantity, commercialLineCents, commercialReturnCents } from '@rebequi/shared/utils';

test('Decimal commercial quantities preserve exact thousandths and reject ambiguity', () => {
  assert.equal(parseCommercialQuantity('0.001'), 1n);
  assert.equal(parseCommercialQuantity('1.250'), 1250n);
  assert.equal(formatCommercialQuantity(1250n), '1.25');
  assert.equal(formatCommercialQuantity(0n), '0');
  assert.equal(formatCommercialQuantity(parseCommercialQuantity('999999999.999')), '999999999.999');
  for (const value of ['1,5', '1.000,5', '-1', '1e3', ' 1', '1 ', '0.0001', '1000000000', '', '1.']) assert.throws(() => parseCommercialQuantity(value));
  assert.throws(() => formatCommercialQuantity(-1n));
});
test('Confirmed conversion factors cannot silently round quantities', () => {
  assert.equal(convertCommercialQuantity('1.5', '50'), '75');
  assert.equal(convertCommercialQuantity('0.125', '1000'), '125');
  assert.equal(convertCommercialQuantity('0', '50'), '0');
  assert.throws(() => convertCommercialQuantity('0.001', '0.001'));
  assert.throws(() => convertCommercialQuantity('1', '0'));
  assert.throws(() => convertCommercialQuantity('999999999', '2'));
});
test('Fractional line and cumulative refund rounding conserve cents', () => {
  assert.equal(commercialLineCents(1937n, '1.5'), 2906n);
  assert.equal(commercialLineCents(1n, '0.499'), 0n);
  assert.equal(commercialLineCents(1n, '0.5'), 1n);
  const total = commercialLineCents(1937n, '1.5');
  const quantities = ['0', '0.001', '0.5', '0.999', '1.5'];
  let refunded = 0n;
  for (let index = 1; index < quantities.length; index++) refunded += commercialReturnCents(total, '1.5', quantities[index]) - commercialReturnCents(total, '1.5', quantities[index - 1]);
  assert.equal(refunded, total);
  assert.throws(() => commercialReturnCents(total, '1.5', '1.501'));
  assert.throws(() => commercialReturnCents(total, '0', '0'));
  assert.throws(() => commercialLineCents(-1n, '1'));
});

test('Fractional availability rejects overreservation without floating-point drift', () => {
  assert.equal(commercialAvailableQuantity('0.3', '0.2'), '0.1');
  assert.equal(commercialAvailableQuantity('1.125', '1.125'), '0');
  assert.throws(() => commercialAvailableQuantity('1.125', '1.126'));
});

test('Successive fractional refunds allocate the original cents exactly once', () => {
  assert.equal(commercialReturnDeltaCents(1n, '0.003', '0', '0.001'), 0n);
  assert.equal(commercialReturnDeltaCents(1n, '0.003', '0.001', '0.001'), 1n);
  assert.equal(commercialReturnDeltaCents(1n, '0.003', '0.002', '0.001'), 0n);
  assert.throws(() => commercialReturnDeltaCents(1n, '0.003', '0.002', '0.002'));
  assert.throws(() => commercialReturnDeltaCents(1n, '0.003', '0', '0'));
});
