import test from 'node:test';
import assert from 'node:assert/strict';
import { createExternalToken, externalBearer, externalTokenHash } from './external-api-token.js';
import { createExternalClientSchema } from '@rebequi/shared/schemas';
import { externalApiOpenApi } from './external-api-openapi.js';
test('Integration tokens are independent of login, hash-only and require explicit bounded scopes', () => {
  const token = createExternalToken(); assert.match(token, /^rb_api_[A-Za-z0-9_-]{43}$/);
  assert.equal(externalBearer(`Bearer ${token}`), token); assert.equal(externalBearer(`Bearer ${token}\n`), null);
  assert.equal(externalBearer('Bearer eyJ.fake.session'), null); assert.equal(externalBearer(`Basic ${token}`), null);
  const hash = externalTokenHash(token); assert.match(hash, /^[a-f0-9]{64}$/); assert.notEqual(hash, token);
  const input = { requestKey: 'fc68d5fc-8174-480c-a9e6-c66ef2bfaf00', name: 'Integrador de teste', scopes: ['catalog:read'], validityDays: 30, confirmed: true };
  assert.equal(createExternalClientSchema.safeParse(input).success, true);
  assert.equal(createExternalClientSchema.safeParse({ ...input, scopes: ['stock:write'] }).success, false);
  assert.equal(createExternalClientSchema.safeParse({ ...input, scopes: ['catalog:read', 'catalog:read'] }).success, false);
  assert.equal(createExternalClientSchema.safeParse({ ...input, validityDays: 366 }).success, false);
  assert.equal(createExternalClientSchema.safeParse({ ...input, confirmed: false }).success, false);
  assert.equal(externalApiOpenApi.openapi, '3.1.1'); assert.deepEqual(Object.keys(externalApiOpenApi.paths).sort(), ['/orders', '/products', '/stock']);
});
