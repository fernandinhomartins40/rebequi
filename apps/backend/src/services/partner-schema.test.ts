import test from 'node:test';
import assert from 'node:assert/strict';
import { partnerProfileSchema, reviewPartnerSchema, PARTNER_TERMS_VERSION } from '@rebequi/shared/schemas';
import { hasMerchantPermission } from '@rebequi/shared/constants';
const input = { specialties: ['Pintura'], city: 'São Paulo', region: 'Zona Norte', expectedVersion: 0, acceptedTermsVersion: PARTNER_TERMS_VERSION };
test('Partner enrollment rejects privilege and version injection, duplicate specialties and unaccepted terms', () => {
  assert.equal(partnerProfileSchema.safeParse(input).success, true);
  for (const invalid of [{ ...input, status: 'APPROVED' }, { ...input, userId: 'someone-else' }, { ...input, specialties: ['Pintura', 'Pintura'] }, { ...input, acceptedTermsVersion: 'old' }, { ...input, expectedVersion: -1 }]) assert.equal(partnerProfileSchema.safeParse(invalid).success, false);
  assert.equal(reviewPartnerSchema.safeParse({ status: 'SUSPENDED', reason: '', expectedVersion: 1 }).success, false);
  assert.equal(hasMerchantPermission('CUSTOMER', 'partners:manage'), false);
  assert.equal(hasMerchantPermission('SALES', 'partners:manage'), false);
  assert.equal(hasMerchantPermission('ADMIN', 'partners:manage'), true);
  assert.equal(hasMerchantPermission('MANAGER', 'partners:manage'), true);
});
