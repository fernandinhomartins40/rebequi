import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticatedCheckoutOrderSchema, checkoutReferralSchema } from '@rebequi/shared/schemas';

test('referral attribution requires an explicit confirmation and only accepts the issued code shape', () => {
  const valid = { code: 'RBABCDEF1234567890', confirmed: true };
  assert.equal(checkoutReferralSchema.safeParse(valid).success, true);
  for (const input of [{ ...valid, confirmed: false }, { code: valid.code }, { ...valid, partnerId: 'injected' }, { ...valid, code: '../path' }]) assert.equal(checkoutReferralSchema.safeParse(input).success, false);
  assert.equal(authenticatedCheckoutOrderSchema.safeParse({ items: [{ productId: 'sku', quantity: 1 }], referral: valid }).success, true);
  assert.equal(authenticatedCheckoutOrderSchema.safeParse({ items: [{ productId: 'sku', quantity: 1 }] }).success, true);
});
