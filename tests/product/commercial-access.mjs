import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function validateCommercialAccess({ owner, admin, sellerA, sellerB, browser, baseURL, data, db, product }) {
  const headers = { Origin: baseURL };
  const profiles = [];
  for (const [client, suffix] of [[sellerA, 'a'], [sellerB, 'b']]) {
    const login = { identifier: `commercial-${suffix}@example.invalid`, password: 'Isolated-Commercial-2026!' };
    const profile = await data(await admin.post('/api/users', { headers, data: { email: login.identifier, password: login.password, name: `Vendedor ${suffix.toUpperCase()} isolado`, role: 'SALES', mustChangePassword: false } }), 201);
    await data(await client.post('/api/auth/login', { data: login })); profiles.push(profile);
  }
  const customer = await data(await owner.get('/api/auth/me'));
  const checkout = await data(await owner.post('/api/orders/checkout', { headers, data: { items: [{ productId: product.id, quantity: 1 }] } }), 201);
  const order = checkout.order;
  const assign = async (kind, id, sellerId, expectedVersion = 0) => data(await admin.put(`/api/commercial/assignments/${kind}/${id}`, { headers, data: { sellerId, expectedVersion, reason: 'Distribuição controlada no runner', confirmed: true } }));
  assert.equal((await sellerA.get(`/api/orders/admin/${order.id}`)).status(), 404);
  assert.equal((await sellerA.put(`/api/commercial/assignments/order/${order.id}`, { headers, data: { sellerId: profiles[0].id, expectedVersion: 0, reason: 'Não autorizado', confirmed: true } })).status(), 403);
  assert.equal((await sellerA.get('/api/quotes/admin/ocr-stats')).status(), 403);
  assert.equal((await sellerA.get('/api/products/admin/list')).status(), 200);
  assert.equal((await sellerA.put(`/api/products/${product.id}`, { headers, data: { name: 'Não autorizado' } })).status(), 403);
  await assign('customer', customer.id, profiles[0].id);
  await assign('order', order.id, profiles[0].id);
  const workA = await data(await sellerA.get('/api/commercial/workbench')); const workB = await data(await sellerB.get('/api/commercial/workbench'));
  assert.equal(workA.orders.some(item => item.id === order.id), true);
  assert.equal(workB.orders.some(item => item.id === order.id), false);
  assert.equal((await sellerA.get(`/api/orders/admin/${order.id}`)).status(), 200);
  assert.equal((await sellerB.get(`/api/orders/admin/${order.id}`)).status(), 404);
  assert.equal((await sellerB.post(`/api/orders/admin/${order.id}/reserve`, { headers })).status(), 404);
  assert.equal((await sellerB.get(`/api/customers/admin/${customer.id}`)).status(), 404);
  const ownDetail = await data(await sellerA.get(`/api/customers/admin/${customer.id}`));
  assert.ok(ownDetail.timeline.every(item => item.id === order.id), 'Customer access must not reveal unrelated commercial history');
  const note = await data(await sellerA.post(`/api/customers/admin/${customer.id}/notes`, { headers, data: { body: 'Nota privada do vendedor A' } }), 201);
  const draft = await data(await owner.post('/api/quotes/public/manual', { headers, data: { text: `1 ${product.name}` } }), 201);
  const quoteId = draft.quote.id;
  await data(await owner.post(`/api/quotes/${quoteId}/submit`, { headers }));
  await assign('quote', quoteId, profiles[0].id);
  assert.equal((await sellerA.get(`/api/quotes/admin/detail/${quoteId}`)).status(), 200);
  assert.equal((await sellerB.get(`/api/quotes/admin/detail/${quoteId}`)).status(), 404);
  assert.equal((await sellerB.get(`/api/quotes/${quoteId}/proposals`)).status(), 404);
  assert.equal((await sellerB.post(`/api/quotes/admin/${quoteId}/status`, { headers, data: { status: 'IN_REVIEW' } })).status(), 404);
  const proposal = { requestKey: randomUUID(), expectedLatestVersion: 0, validityDays: 7, notes: 'Condições isoladas de teste', items: [{ productId: product.id, quantity: 1, unitPriceCents: Math.round(product.price * 100) }] };
  await data(await sellerA.post(`/api/quotes/admin/${quoteId}/proposals`, { headers, data: proposal }), 201);
  const accepted = await data(await owner.post(`/api/quotes/${quoteId}/proposals/accept`, { headers, data: { version: 1, confirmed: true } }));
  assert.equal((await data(await sellerA.get(`/api/orders/admin/${accepted.orderId}`))).id, accepted.orderId);
  assert.equal((await sellerB.get(`/api/orders/admin/${accepted.orderId}`)).status(), 404);
  const sale = await data(await sellerA.post('/api/sales/admin', { headers, data: { orderId: accepted.orderId, paymentMethod: 'PIX', idempotencyKey: randomUUID() } }), 201);
  assert.equal((await sellerB.get(`/api/sales/admin/${sale.id}`)).status(), 404);
  assert.equal((await sellerB.get(`/api/sales/admin/${sale.id}/returns`)).status(), 404);
  assert.equal((await sellerB.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'CANCELED' } })).status(), 404);
  const actual = JSON.parse(db(`console.log(JSON.stringify(await prisma.sale.findUniqueOrThrow({where:{id:${JSON.stringify(sale.id)}},select:{assignedSellerId:true,registeredById:true}})));`).trim());
  assert.deepEqual(actual, { assignedSellerId: profiles[0].id, registeredById: profiles[0].id });
  await assign('sale', sale.id, profiles[1].id);
  assert.equal((await sellerA.get(`/api/sales/admin/${sale.id}`)).status(), 404, 'Reassignment revokes access even for the original operator');
  assert.equal((await sellerB.get(`/api/sales/admin/${sale.id}`)).status(), 200);
  await assign('customer', customer.id, profiles[1].id, 1);
  assert.equal((await sellerA.get(`/api/customers/admin/${customer.id}`)).status(), 404);
  const otherDetail = await data(await sellerB.get(`/api/customers/admin/${customer.id}`)); assert.equal(otherDetail.notes.some(item => item.id === note.id), false);
  assert.equal((await sellerB.delete(`/api/customers/admin/${customer.id}/notes/${note.id}`, { headers })).status(), 404);
  const races = await Promise.all([admin.put(`/api/commercial/assignments/order/${order.id}`, { headers, data: { sellerId: profiles[1].id, expectedVersion: 1, reason: 'Primeira redistribuição', confirmed: true } }), admin.put(`/api/commercial/assignments/order/${order.id}`, { headers, data: { sellerId: null, expectedVersion: 1, reason: 'Segunda redistribuição', confirmed: true } })]);
  assert.deepEqual(races.map(response => response.status()).sort(), [200, 409]);
  const context = await browser.newContext();
  try {
    await context.addCookies((await admin.storageState()).cookies); const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/pedidos/${order.id}`);
    await page.getByRole('button', { name: 'Distribuir atendimento', exact: true }).click();
    await page.getByLabel('Colaborador responsável', { exact: true }).selectOption(profiles[0].id);
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByLabel('Motivo da distribuição', { exact: true }).fill('Redistribuição pela interface mobile');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('checkbox', { name: 'Conferi o responsável e autorizo a distribuição.' }).check();
    await page.getByRole('button', { name: 'Confirmar distribuição', exact: true }).click(); await page.getByText('Responsável atualizado.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await context.close(); }
  const sellerContext = await browser.newContext();
  try {
    await sellerContext.addCookies((await sellerA.storageState()).cookies); const page = await sellerContext.newPage(); await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/atendimentos`); await page.getByRole('heading', { name: 'Meus atendimentos', exact: true, level: 2 }).waitFor();
    await page.getByLabel('Digite o nome ou SKU', { exact: true }).fill(product.sku);
    await page.getByText(product.name, { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Distribuir atendimento', exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await sellerContext.close(); }
  const history = await data(await admin.get(`/api/commercial/assignments/order/${order.id}/history`)); assert.equal(history.total, 3);
  await data(await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'CANCELED' } }));
}
