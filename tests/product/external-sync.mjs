import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function validateExternalSync({ owner, admin, guest, browser, baseURL, data, db, product }) {
  const origin = { Origin: baseURL };
  const source = `sync-${randomUUID()}`;
  const scopes = ['catalog:read', 'catalog:write', 'stock:read', 'stock:write', 'customers:read', 'customers:write', 'sales:read', 'sales:write'];
  const issue = async (name, sourceName, selected = scopes) => data(await admin.post('/api/integrations/external-api/clients', { headers: origin,
    data: { requestKey: randomUUID(), name, source: sourceName, scopes: selected, validityDays: 1, confirmed: true } }), 201);
  const credential = await issue('Sincronização no runner', source);
  const rotation = await issue('Rotação de credencial no runner', source);
  const foreign = await issue('Outra origem no runner', `${source}-other`);
  const readonly = await issue('Leitura no runner', undefined, ['catalog:read']);
  const bearer = value => ({ Authorization: `Bearer ${value.token}` });
  const put = (path, input, value = credential) => guest.put(`/api/external/v1${path}`, { headers: bearer(value), data: input });
  const patch = (path, input, value = credential) => guest.patch(`/api/external/v1${path}`, { headers: bearer(value), data: input });
  const row = id => JSON.parse(db(`console.log(JSON.stringify(await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(id)}},select:{id:true,stock:true,reservedStock:true,updatedAt:true}})));`).trim());
  const productInput = { requestKey: randomUUID(), expectedUpdatedAt: null, sku: `SYNC-${randomUUID()}`, name: 'Cimento sincronizado no runner', categoryId: product.categoryId, priceCents: '3990', isActive: true };
  assert.equal((await put('/products/cement', productInput, readonly)).status(), 403);
  assert.equal((await guest.put('/api/external/v1/products/cement', { data: productInput })).status(), 401);
  const created = await data(await put('/products/cement', productInput));
  assert.deepEqual(await data(await put('/products/cement', productInput, rotation)), created);
  assert.equal((await put('/products/cement', { ...productInput, name: 'Outro conteúdo' })).status(), 409);
  assert.equal((await put('/products/cement', { ...productInput, requestKey: randomUUID() })).status(), 409);
  const stockInput = { requestKey: randomUUID(), expectedUpdatedAt: created.updatedAt, quantity: 12, reason: 'Contagem inicial no runner' };
  const stocked = await data(await put('/stock/cement', stockInput));
  assert.deepEqual(await data(await put('/stock/cement', stockInput)), stocked);
  assert.equal((await put('/stock/cement', { ...stockInput, requestKey: randomUUID(), quantity: 13 })).status(), 409);
  const updates = await Promise.all([put('/products/cement', { ...productInput, requestKey: randomUUID(), expectedUpdatedAt: stocked.updatedAt, priceCents: '4000' }),
    put('/products/cement', { ...productInput, requestKey: randomUUID(), expectedUpdatedAt: stocked.updatedAt, priceCents: '4100' })]);
  assert.deepEqual(updates.map(response => response.status()).sort(), [200, 409]);
  const customerInput = { requestKey: randomUUID(), expectedUpdatedAt: null, name: 'Cliente sincronizado', email: `sync-${randomUUID()}@example.invalid` };
  const customer = await data(await put('/customers/new-buyer', customerInput));
  assert.deepEqual(await data(await put('/customers/new-buyer', customerInput)), customer);
  assert.equal((await put('/customers/new-buyer', { ...customerInput, requestKey: randomUUID(), expectedUpdatedAt: customer.updatedAt, role: 'ADMIN' })).status(), 400);
  const renamed = await data(await put('/customers/new-buyer', { ...customerInput, requestKey: randomUUID(), expectedUpdatedAt: customer.updatedAt, name: 'Cliente atualizado' }));
  assert.equal((await put('/customers/new-buyer', { ...customerInput, requestKey: randomUUID(), expectedUpdatedAt: renamed.updatedAt, email: 'another@example.invalid' })).status(), 409);
  assert.equal((await put('/customers/collision', { ...customerInput, requestKey: randomUUID() })).status(), 409);
  const own = await data(await owner.get('/api/auth/me'));
  const identity = JSON.parse(db(`console.log(JSON.stringify(await prisma.user.findUniqueOrThrow({where:{id:${JSON.stringify(own.id)}},select:{email:true,whatsapp:true,updatedAt:true}})));`).trim());
  await data(await admin.post('/api/integrations/external-api/imports/customers/links', { headers: origin, data: {
    requestKey: randomUUID(), source, externalId: 'buyer', customerId: own.id, confirmed: true,
    ...(identity.email.includes('@') ? { expectedEmail: identity.email } : { expectedWhatsapp: identity.whatsapp }),
  } }), 201);
  await data(await put('/customers/buyer', { requestKey: randomUUID(), expectedUpdatedAt: identity.updatedAt, name: own.name }));
  const saleInput = { customerExternalId: 'buyer', paymentMethod: 'PIX', status: 'PENDING_PAYMENT', items: [{ productId: created.id, quantity: 2, unitPriceCents: '3990' }] };
  const sales = await Promise.all([put('/sales/pdv-1', saleInput, rotation), put('/sales/pdv-1', saleInput, rotation)]);
  const sale = await data(sales[0]); assert.deepEqual(await data(sales[1]), sale); assert.equal(row(created.id).stock, 10);
  assert.equal((await put('/sales/pdv-1', { ...saleInput, status: 'PAID' }, rotation)).status(), 409);
  assert.equal(Number(db(`console.log(await prisma.fulfillment.count({where:{saleId:${JSON.stringify(sale.id)}}}));`).trim()), 0);
  assert.equal((await patch('/sales/pdv-1/status', { status: 'PAID' }, foreign)).status(), 404);
  await data(await patch('/sales/pdv-1/status', { status: 'PAID' }, rotation));
  await data(await patch('/sales/pdv-1/status', { status: 'PAID' }, rotation));
  const fulfillmentId = db(`console.log((await prisma.fulfillment.findUniqueOrThrow({where:{saleId:${JSON.stringify(sale.id)}}})).id);`).trim();
  const trackingResponse = await owner.get('/api/sales/me/deliveries'); const tracking = await data(trackingResponse);
  assert.match(trackingResponse.headers()['cache-control'], /no-store/);
  assert.equal(tracking.deliveries.find(value => value.id === sale.id).status, 'AWAITING_DETAILS');
  assert.equal(JSON.stringify(tracking).includes('deliveryStops'), false);
  assert.equal((await admin.get('/api/sales/me/deliveries')).status(), 403);
  assert.equal((await owner.get('/api/sales/me/deliveries?page=0')).status(), 400);
  const otherContext = await browser.newContext({ baseURL });
  try {
    await data(await otherContext.request.post('/api/auth/register', { data: { name: 'Cliente sem acesso à venda', whatsapp: '11988887777' } }), 201);
    assert.equal((await data(await otherContext.request.get('/api/sales/me/deliveries'))).deliveries.some(value => value.id === sale.id), false);
  } finally { await otherContext.close(); }
  let fulfillment = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`));
  await data(await admin.put(`/api/fulfillments/${fulfillmentId}/details`, { headers: origin, data: { requestKey: randomUUID(), expectedVersion: fulfillment.version, confirmed: true, mode: 'PICKUP', address: null, region: null, scheduledAt: null, notes: null } }));
  for (const action of ['PICK', 'CHECK', 'READY']) {
    fulfillment = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`));
    await data(await admin.post(`/api/fulfillments/${fulfillmentId}/operations`, { headers: origin, data: { requestKey: randomUUID(), expectedVersion: fulfillment.version, confirmed: true, action, items: action === 'READY' ? [] : fulfillment.items.map(item => ({ id: item.id, quantity: 2 })) } }));
  }
  fulfillment = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`));
  await data(await admin.post(`/api/fulfillments/${fulfillmentId}/pickup-receipts`, { headers: origin, data: { requestKey: randomUUID(), expectedVersion: fulfillment.version, confirmed: true, receiverName: 'Cliente do runner', items: fulfillment.items.map(item => ({ id: item.id, quantity: 2 })) } }), 201);
  assert.equal((await data(await owner.get('/api/sales/me/deliveries'))).deliveries.find(value => value.id === sale.id).status, 'RECEIVED');
  assert.equal((await patch('/sales/pdv-1/status', { status: 'CANCELED' }, rotation)).status(), 409);
  const cancelSale = await data(await put('/sales/pdv-2', { ...saleInput, status: 'PAID' }, rotation));
  assert.notEqual(cancelSale.id, sale.id); assert.equal(row(created.id).stock, 8);
  await data(await patch('/sales/pdv-2/status', { status: 'CANCELED' }, rotation));
  await data(await patch('/sales/pdv-2/status', { status: 'CANCELED' }, rotation));
  assert.equal(row(created.id).stock, 10);
  assert.equal((await patch('/sales/pdv-2/status', { status: 'PAID' }, rotation)).status(), 400);
  // A real reservation must survive a rejected authoritative stock write.
  const checkout = await data(await owner.post('/api/orders/checkout', { headers: origin, data: { items: [{ productId: created.id, quantity: 3 }] } }), 201);
  await data(await admin.post(`/api/orders/admin/${checkout.order.id}/reserve`, { headers: origin }));
  const reserved = row(created.id);
  assert.equal((await put('/stock/cement', { requestKey: randomUUID(), expectedUpdatedAt: reserved.updatedAt, quantity: 2, reason: 'Saldo incompatível' }, rotation)).status(), 409);
  assert.equal(row(created.id).reservedStock, 3);
  const readCustomers = await data(await guest.get('/api/external/v1/customers?limit=100', { headers: bearer(rotation) }));
  assert.equal(readCustomers.customers.some(value => value.id === customer.id), true);
  assert.equal(JSON.stringify(readCustomers).includes('password'), false);
  const readSales = await data(await guest.get('/api/external/v1/sales?limit=100', { headers: bearer(rotation) }));
  assert.equal(readSales.sales.find(value => value.id === sale.id).totalCents, '7980');
  assert.equal((await guest.get('/api/external/v1/customers', { headers: bearer(readonly) })).status(), 403);
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  try {
    await context.addCookies((await owner.storageState()).cookies);
    const page = await context.newPage();
    await page.goto('/painel-cliente?tab=orders');
    await page.getByText('Compras na loja', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'tests/product/artifacts/sale-deliveries-mobile.png', fullPage: true });
  } finally { await context.close(); }
  await data(await admin.post(`/api/integrations/external-api/clients/${rotation.id}/revoke`, { headers: origin, data: { confirmed: true } }));
  assert.equal((await put('/stock/cement', { ...stockInput, requestKey: randomUUID() }, rotation)).status(), 401);
}
