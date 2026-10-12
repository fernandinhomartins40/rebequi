import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function validateFulfillment({ owner, guest, admin, browser, baseURL, data, db, product }) {
  const headers = { Origin: baseURL };
  const checkout = await data(await owner.post('/api/orders/checkout', { headers, data: { items: [{ productId: product.id, quantity: 3 }] } }), 201);
  const sale = await data(await admin.post('/api/sales/admin', { headers, data: { orderId: checkout.order.id, status: 'PENDING_PAYMENT', paymentMethod: 'PIX', idempotencyKey: randomUUID() } }), 201);
  assert.equal(Number(db(`console.log(await prisma.fulfillment.count({where:{saleId:${JSON.stringify(sale.id)}}}));`).trim()), 0);
  await data(await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'PAID' } }));
  const id = db(`console.log((await prisma.fulfillment.findUniqueOrThrow({where:{saleId:${JSON.stringify(sale.id)}}})).id);`).trim();
  const row = await data(await admin.get(`/api/fulfillments/${id}`)); assert.equal(row.status, 'AWAITING_DETAILS'); assert.equal(row.items.length, 1);
  assert.equal((await owner.get(`/api/fulfillments/${id}`)).status(), 403); assert.equal((await guest.get(`/api/fulfillments/${id}`)).status(), 401);
  const details = { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, mode: 'PICKUP', address: null, region: null, scheduledAt: null, notes: 'Retirada conferida no runner' };
  assert.equal((await admin.put(`/api/fulfillments/${id}/details`, { data: details })).status(), 403);
  const configured = await data(await admin.put(`/api/fulfillments/${id}/details`, { headers, data: details }));
  const stockBefore = Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim());
  const op = { requestKey: randomUUID(), expectedVersion: configured.version, confirmed: true, action: 'PICK', note: '', items: [{ id: row.items[0].id, quantity: 3, location: 'Prateleira do teste' }] };
  const duplicates = await Promise.all([admin.post(`/api/fulfillments/${id}/operations`, { headers, data: op }), admin.post(`/api/fulfillments/${id}/operations`, { headers, data: op })]);
  const results = await Promise.all(duplicates.map(response => data(response))); assert.equal(results[0].version, results[1].version);
  assert.equal((await admin.post(`/api/fulfillments/${id}/operations`, { headers, data: { ...op, requestKey: randomUUID(), expectedVersion: results[0].version, items: [{ id: row.items[0].id, quantity: 4 }] } })).status(), 409);
  assert.equal((await admin.post(`/api/fulfillments/${id}/operations`, { headers, data: { ...op, requestKey: randomUUID(), expectedVersion: results[0].version, action: 'READY', items: [] } })).status(), 409);
  const checked = await data(await admin.post(`/api/fulfillments/${id}/operations`, { headers, data: { ...op, requestKey: randomUUID(), expectedVersion: results[0].version, action: 'CHECK' } }));
  const ready = await data(await admin.post(`/api/fulfillments/${id}/operations`, { headers, data: { ...op, requestKey: randomUUID(), expectedVersion: checked.version, action: 'READY', items: [] } }));
  assert.equal((await data(await admin.get(`/api/fulfillments/${id}`))).status, 'READY');
  assert.equal(Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim()), stockBefore, 'Separating and checking must not debit inventory again');
  await data(await admin.post(`/api/sales/admin/${sale.id}/returns`, { headers, data: { requestKey: randomUUID(), expectedVersion: 0, confirmed: true, reason: 'Devolução antes da expedição no runner', items: [{ saleItemId: sale.items[0].id, quantity: 1, restock: false }] } }), 201);
  const revised = await data(await admin.get(`/api/fulfillments/${id}`)); assert.equal(revised.status, 'CHECKING'); assert.equal(revised.items[0].remainingQuantity, 2); assert.equal(revised.items[0].checked, 0);
  assert.equal((await admin.post(`/api/fulfillments/${id}/operations`, { headers, data: { ...op, requestKey: randomUUID(), expectedVersion: ready.version, action: 'READY', items: [] } })).status(), 409);
  await data(await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'PENDING_PAYMENT' } }));
  assert.equal((await admin.post(`/api/fulfillments/${id}/operations`, { headers, data: { ...op, requestKey: randomUUID(), expectedVersion: revised.version, action: 'ISSUE', note: 'Pagamento pendente impede separação', items: [] } })).status(), 409);
  await data(await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'PAID' } }));
  const context = await browser.newContext();
  try {
    await context.addCookies((await admin.storageState()).cookies); const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/deposito/${id}`); await page.getByLabel('O que deseja registrar?', { exact: true }).selectOption('ISSUE');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByLabel('Descreva a ocorrência', { exact: true }).fill('Aguardando conferência física dos materiais');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('checkbox', { name: 'Conferi os materiais e autorizo este registro.' }).check();
    await page.getByRole('button', { name: 'Confirmar registro', exact: true }).click();
    await page.getByText(`Conferir materiais · Versão ${revised.version + 1}`, { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await context.close(); }
  await data(await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'CANCELED' } }));
  assert.equal((await data(await admin.get(`/api/fulfillments/${id}`))).status, 'CANCELED');
  assert.equal(Number(db(`console.log(await prisma.fulfillment.count({where:{saleId:${JSON.stringify(sale.id)}}}));`).trim()), 1);
}
