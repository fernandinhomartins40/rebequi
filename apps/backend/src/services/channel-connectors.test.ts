import test from 'node:test';
import assert from 'node:assert/strict';
import { MercadoLivreAdapter } from './channels/mercado-livre.adapter.js';
import { UnavailableChannelAdapter } from './channels/unavailable-channel.adapter.js';

test('Unimplemented providers never acknowledge external effects', async () => {
  const adapter = new UnavailableChannelAdapter();
  for (const result of [await adapter.testConnection(), await adapter.publishListing(), await adapter.syncListing(), await adapter.removeListing()]) assert.equal(result.ok, false);
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
