import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function validatePickupReceipts({ owner, admin, guest, browser, baseURL, data, db, product }) {
  const headers = { Origin: baseURL };
  const order = (await data(await owner.post('/api/orders/checkout', { headers, data: { items: [{ productId: product.id, quantity: 3 }] } }), 201)).order;
  const sale = await data(await admin.post('/api/sales/admin', { headers, data: { orderId: order.id, status: 'PAID', paymentMethod: 'PIX', idempotencyKey: randomUUID() } }), 201);
  const id = db(`console.log((await prisma.fulfillment.findUniqueOrThrow({where:{saleId:${JSON.stringify(sale.id)}}})).id);`).trim();
  let row = await data(await admin.get(`/api/fulfillments/${id}`));
  const receipt = { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, receiverName: 'Recebedor privado da retirada', items: [{ id: row.items[0].id, quantity: 1 }] };
  assert.equal((await owner.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: receipt })).status(), 403);
  assert.equal((await guest.post(`/api/fulfillments/${id}/pickup-receipts`, { data: receipt })).status(), 403);
  assert.equal((await guest.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: receipt })).status(), 409);
  const configured = await data(await admin.put(`/api/fulfillments/${id}/details`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, mode: 'PICKUP', address: null, region: null, scheduledAt: null, notes: null } }));
  row.version = configured.version;
  async function prepare(quantity) {
    for (const action of ['PICK', 'CHECK', 'READY']) {
      const updated = await data(await guest.post(`/api/fulfillments/${id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, action, items: action === 'READY' ? [] : [{ id: row.items[0].id, quantity }] } }));
      row.version = updated.version;
    }
    row = await data(await admin.get(`/api/fulfillments/${id}`));
  }
  await prepare(3); receipt.expectedVersion = row.version;
  await data(await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'PENDING_PAYMENT' } }));
  assert.equal((await guest.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: receipt })).status(), 409);
  await data(await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'PAID' } }));
  const stockBefore = Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim());
  const replies = await Promise.all([guest.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: receipt }), guest.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: receipt })]);
  const first = await data(replies[0], 201); assert.deepEqual(await data(replies[1], 201), first);
  row = await data(await admin.get(`/api/fulfillments/${id}`)); assert.equal(row.status, 'PARTIALLY_RECEIVED'); assert.equal(row.items[0].delivered, 1);
  assert.equal(Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim()), stockBefore);
  assert.equal((await guest.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: { ...receipt, receiverName: 'Outro recebedor' } })).status(), 409);
  assert.equal((await guest.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: { ...receipt, requestKey: randomUUID() } })).status(), 409);
  assert.equal((await guest.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: { ...receipt, requestKey: randomUUID(), expectedVersion: row.version, items: [{ id: row.items[0].id, quantity: 3 }] } })).status(), 409);
  assert.equal((await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'CANCELED' } })).status(), 409);
  const ownOrder = (await data(await owner.get('/api/orders/me'))).find(value => value.id === order.id); assert.equal(ownOrder.fulfillment.status, 'PARTIALLY_RECEIVED'); assert.equal(JSON.stringify(ownOrder).includes(receipt.receiverName), false);
  const materialResponse = await owner.get(`/api/orders/me/${order.id}/fulfillment-materials`);
  const publicMaterials = await data(materialResponse); assert.match(materialResponse.headers()['cache-control'], /no-store/);
  assert.deepEqual(publicMaterials.materials, [{ id: row.items[0].id, name: row.items[0].nameSnapshot, orderedQuantity: 3, removedQuantity: 0, receivedQuantity: 1, pendingQuantity: 2 }]);
  assert.equal(JSON.stringify(publicMaterials).includes(receipt.receiverName), false);
  const nextMaterials = await data(await owner.get(`/api/orders/me/${order.id}/fulfillment-materials?page=2`));
  assert.equal(nextMaterials.total, 1); assert.equal(nextMaterials.page, 2); assert.equal(nextMaterials.materials.length, 0);
  const customerContext = await browser.newContext();
  try {
    await customerContext.addCookies((await owner.storageState()).cookies); const page = await customerContext.newPage(); await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`${baseURL}/painel-cliente?tab=orders&orderId=${encodeURIComponent(order.id)}`);
    const card = page.locator(`#customer-order-${order.id}`);
    await card.getByText('O que recebi e o que falta?', { exact: true }).click();
    await card.getByText('Recebido comigo', { exact: true }).waitFor();
    assert.equal(await card.locator('dd').nth(0).innerText(), '1');
    assert.equal(await card.locator('dd').nth(1).innerText(), '2');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await customerContext.close(); }
  const pendingReturn = { requestKey: randomUUID(), expectedVersion: 0, confirmed: true, reason: 'Material não recebido retirado do pedido', items: [{ saleItemId: sale.items[0].id, quantity: 1, restock: false, physicalOrigin: 'NOT_RECEIVED' }] };
  await data(await admin.post(`/api/sales/admin/${sale.id}/returns`, { headers, data: pendingReturn }), 201);
  row = await data(await admin.get(`/api/fulfillments/${id}`)); assert.equal(row.items[0].delivered, 1); assert.equal(row.items[0].checked, 1); assert.equal(row.items[0].remainingQuantity, 2);
  const afterRemoval = (await data(await owner.get(`/api/orders/me/${order.id}/fulfillment-materials`))).materials[0];
  assert.equal(afterRemoval.pendingQuantity, 1); assert.equal(afterRemoval.removedQuantity, 1); assert.equal(afterRemoval.receivedQuantity, 1);
  assert.equal((await guest.post(`/api/fulfillments/${id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, action: 'CHECK', items: [{ id: row.items[0].id, quantity: 0 }] } })).status(), 409);
  await prepare(2);
  const context = await browser.newContext();
  try {
    await context.addCookies((await guest.storageState()).cookies); const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/deposito/${id}`);
    const wizard = page.getByRole('region', { name: 'Registrar retirada', exact: true });
    await wizard.getByRole('button', { name: 'Registrar retirada', exact: true }).click();
    await wizard.getByLabel('Quantidade retirada agora', { exact: true }).fill('1'); await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
    await wizard.getByLabel('Nome do recebedor', { exact: true }).fill('Recebedor final privado'); await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
    await wizard.getByRole('checkbox', { name: 'Confirmei o recebedor e entreguei estes materiais.', exact: true }).check();
    const saved = page.waitForResponse(response => response.url().endsWith(`/fulfillments/${id}/pickup-receipts`) && response.request().method() === 'POST');
    await wizard.getByRole('button', { name: 'Confirmar retirada', exact: true }).click(); assert.equal((await saved).status(), 201);
    await page.getByText('Todos os materiais foram recebidos.', { exact: true }).waitFor(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await context.close(); }
  row = await data(await admin.get(`/api/fulfillments/${id}`)); assert.equal(row.status, 'RECEIVED'); assert.equal(row.items[0].delivered, 2);
  assert.equal(Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim()), stockBefore);
  assert.equal((await data(await admin.get('/api/fulfillments'))).fulfillments.some(value => value.id === id), false);
  assert.equal((await data(await admin.get('/api/fulfillments?status=RECEIVED'))).fulfillments.some(value => value.id === id), true);
  const publicHistory = await data(await owner.get(`/api/orders/me/${order.id}/fulfillment-history`)); assert.equal(publicHistory.events.filter(event => event.kind === 'PICKUP_RECEIVED').length, 2); assert.equal(JSON.stringify(publicHistory).includes('recebedor'), false);
  const returnedReceipt = await data(await admin.post(`/api/sales/admin/${sale.id}/returns`, { headers, data: { requestKey: randomUUID(), expectedVersion: 1, confirmed: true, reason: 'Recebimento físico do item devolvido pelo cliente', items: [{ saleItemId: sale.items[0].id, quantity: 1, restock: false, physicalOrigin: 'RECEIVED_FROM_CUSTOMER' }] } }), 201);
  assert.equal(returnedReceipt.items[0].physicalOrigin, 'RECEIVED_FROM_CUSTOMER');
  row = await data(await admin.get(`/api/fulfillments/${id}`)); assert.equal(row.status, 'RECEIVED'); assert.equal(row.items[0].delivered, 1); assert.equal(row.items[0].checked, 1);
  await data(await admin.post(`/api/sales/admin/${sale.id}/returns`, { headers, data: { requestKey: randomUUID(), expectedVersion: 2, confirmed: true, reason: 'Último material recebido de volta do cliente', items: [{ saleItemId: sale.items[0].id, quantity: 1, restock: false, physicalOrigin: 'RECEIVED_FROM_CUSTOMER' }] } }), 201);
  row = await data(await admin.get(`/api/fulfillments/${id}`)); assert.equal(row.status, 'CANCELED'); assert.equal(row.items[0].delivered, 0); assert.equal(row.items[0].remainingQuantity, 0);
  const finalMaterials = (await data(await owner.get(`/api/orders/me/${order.id}/fulfillment-materials`))).materials[0];
  assert.equal(finalMaterials.pendingQuantity, 0); assert.equal(finalMaterials.receivedQuantity, 0); assert.equal(finalMaterials.removedQuantity, 3);
  assert.deepEqual(await data(await guest.post(`/api/fulfillments/${id}/pickup-receipts`, { headers, data: receipt }), 201), first);
  assert.equal(Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim()), stockBefore, 'Receipt and returns without restocking must not create another stock movement');
  assert.equal(Number(db(`console.log(await prisma.fulfillmentEvent.count({where:{fulfillmentId:${JSON.stringify(id)},kind:'PICKUP_RECEIVED'}}));`).trim()), 2);
}
