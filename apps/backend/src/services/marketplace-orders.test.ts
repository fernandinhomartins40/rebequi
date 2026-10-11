import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchMercadoLivreOrders } from './channels/mercado-livre-orders.service.js';

const order = { id: 123, seller: { id: 77 }, status: 'paid', currency_id: 'BRL', total_amount: 30,
  date_created: '2026-10-11T12:00:00Z', buyer: { email: 'private@example.invalid' },
  order_items: [1, 2].map(id => ({ quantity: 1, unit_price: id * 10, item: { id: `MLB${id}`, title: `Produto ${id}` } })) };

test('Remote orders preserve grouping, paginate and omit buyer data', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    const target = new URL(String(url));
    assert.equal(target.origin, 'https://api.mercadolibre.com');
    assert.equal(target.searchParams.get('seller'), '77');
    assert.equal(target.searchParams.get('offset'), '20');
    assert.equal(target.searchParams.get('sort'), 'date_desc');
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer synthetic');
    return Response.json({ results: [order], paging: { total: 42 } });
  });
  const result = await fetchMercadoLivreOrders('synthetic', '77', 2);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].items.length, 2);
  assert.equal(result.orders[0].total, 30);
  assert.equal(result.hasNext, true);
  assert.ok(!JSON.stringify(result).includes('private@example.invalid'));
});

test('Remote orders reject unrelated sellers, invalid data and redact provider errors', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ results: [{ ...order, seller: { id: 88 } }], paging: { total: 1 } }));
  await assert.rejects(fetchMercadoLivreOrders('synthetic', '77', 1), /conta/);
  for (const invalid of [null, { ...order, id: -1 }, { ...order, currency_id: 'USD' }, { ...order, order_items: [null] }]) {
    mock.mock.mockImplementation(async () => Response.json({ results: [invalid], paging: { total: 1 } }));
    await assert.rejects(fetchMercadoLivreOrders('synthetic', '77', 1));
  }
  mock.mock.mockImplementation(async () => new Response('private-provider-secret', { status: 401 }));
  await assert.rejects(fetchMercadoLivreOrders('synthetic', '77', 1), error => error instanceof Error && /permissões/.test(error.message) && !error.message.includes('private-provider-secret'));
  const calls = mock.mock.callCount();
  await assert.rejects(fetchMercadoLivreOrders('synthetic', '77', 51));
  await assert.rejects(fetchMercadoLivreOrders('synthetic', '77&other=1', 1));
  assert.equal(mock.mock.callCount(), calls);
});
