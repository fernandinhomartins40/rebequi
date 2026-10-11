import test from 'node:test';
import assert from 'node:assert/strict';
import { MercadoLivreAdapter } from './channels/mercado-livre.adapter.js';
import { UnavailableChannelAdapter } from './channels/unavailable-channel.adapter.js';
import { AmazonAdapter, AmericanasAdapter, MagaluAdapter } from './channels/account-adapters.js';
import { providerJson } from './channels/provider-http.js';

test('Unimplemented providers never acknowledge external effects', async () => {
  const adapter = new UnavailableChannelAdapter();
  for (const result of [await adapter.testConnection(), await adapter.publishListing(), await adapter.syncListing(), await adapter.removeListing()]) assert.equal(result.ok, false);
});

test('Account connectors call fixed official endpoints, validate Brazil and hide errors', async t => {
  const magalu = new MagaluAdapter(); const americanas = new AmericanasAdapter(); const amazon = new AmazonAdapter();
  assert.equal((await magalu.testConnection()).ok, false);
  assert.equal((await americanas.testConnection()).ok, false);
  assert.equal((await amazon.testConnection()).ok, false);
  const mock = t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(options?.redirect, 'error');
    if (url === 'https://api.magalu.com/seller/v1/portfolios/me') {
      assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer magalu-token');
      return Response.json({ id: 'seller' });
    }
    if (url === 'https://api.skyhub.com.br/statuses') {
      const headers = options?.headers as Record<string, string>;
      assert.equal(headers['X-Api-Key'], 'skyhub-key'); assert.equal(headers['X-Accountmanager-Key'], 'manager-key');
      assert.equal(headers['X-User-Email'], 'test@example.invalid');
      return Response.json([{ code: 'new', type: 'NEW' }]);
    }
    assert.equal(url, 'https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations');
    assert.equal((options?.headers as Record<string, string>)['x-amz-access-token'], 'amazon-token');
    return Response.json({ payload: [{ marketplace: { id: 'br-id', countryCode: 'BR' }, participation: { isParticipating: true } }] });
  });
  assert.equal((await magalu.testConnection({ accessToken: 'magalu-token' })).ok, true);
  assert.equal((await americanas.testConnection({ userEmail: 'test@example.invalid', apiKey: 'skyhub-key', accountManagerKey: 'manager-key' })).ok, true);
  const credentials = { accessToken: 'amazon-token', sellerId: 'seller', marketplaceId: 'br-id' };
  assert.equal((await amazon.testConnection(credentials)).ok, true);
  mock.mock.mockImplementation(async () => Response.json({ payload: [{ marketplace: { id: 'br-id', countryCode: 'US' }, participation: { isParticipating: true } }] }));
  assert.equal((await amazon.testConnection(credentials)).ok, false);
  mock.mock.mockImplementation(async () => new Response('private-provider-error', { status: 403 }));
  assert.ok(!(await magalu.testConnection({ accessToken: 'magalu-token' })).message.includes('private-provider-error'));
  mock.mock.mockImplementation(async () => new Response('x'.repeat(1024 * 1024 + 1)));
  await assert.rejects(() => providerJson('https://api.magalu.com/seller/v1/portfolios/me'));
});

test('Mercado Livre verifies the actual Brazilian account and hides provider failures', async t => {
  const adapter = new MercadoLivreAdapter();
  assert.equal((await adapter.testConnection({})).ok, false);
  const mock = t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(url, 'https://api.mercadolibre.com/users/me');
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer test-token');
    assert.equal(options?.redirect, 'error');
    return new Response(JSON.stringify({ id: 1234, site_id: 'MLB' }), { status: 200 });
  });
  assert.deepEqual(await adapter.testConnection({ accessToken: 'test-token' }), {
    ok: true, externalId: '1234', message: 'Conta verificada no Mercado Livre. Publicação e sincronização aguardam validação própria.',
  });
  mock.mock.mockImplementation(async () => new Response(JSON.stringify({ id: 1234, site_id: 'MLA' })));
  assert.equal((await adapter.testConnection({ accessToken: 'test-token' })).ok, false);
  mock.mock.mockImplementation(async () => new Response('secret-provider-error', { status: 401 }));
  const denied = await adapter.testConnection({ accessToken: 'test-token' });
  assert.equal(denied.ok, false); assert.ok(!denied.message.includes('secret-provider-error'));
  mock.mock.mockImplementation(async () => { throw new Error('private token details'); });
  assert.ok(!(await adapter.testConnection({ accessToken: 'test-token' })).message.includes('private token'));
});
