import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateTwoStopReceipts } from './two-stop-receipts.mjs';
export async function validateDeliveryReceipts({ owner, admin, guest, browser, baseURL, data, db, product, driver, vehicle }) {
  const headers = { Origin: baseURL };
  const order = (await data(await owner.post('/api/orders/checkout', { headers, data: { items: [{ productId: product.id, quantity: 3 }] } }), 201)).order;
  const sale = await data(await admin.post('/api/sales/admin', { headers, data: { orderId: order.id, status: 'PAID', paymentMethod: 'PIX', idempotencyKey: randomUUID() } }), 201);
  const fulfillmentId = db(`console.log((await prisma.fulfillment.findUniqueOrThrow({where:{saleId:${JSON.stringify(sale.id)}}})).id);`).trim();
  let row = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`));
  await data(await admin.put(`/api/fulfillments/${fulfillmentId}/details`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, mode: 'DELIVERY', address: 'Endereço conferido da entrega parcial, 123', region: null, scheduledAt: null, notes: null } }));
  const prepare = async () => {
    row = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`));
    for (const action of ['PICK', 'CHECK', 'READY']) {
      const updated = await data(await admin.post(`/api/fulfillments/${fulfillmentId}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, action, items: action === 'READY' ? [] : [{ id: row.items[0].id, quantity: 3 }] } }));
      row.version = updated.version;
    }
  };
  const trip = async () => {
    await prepare();
    const created = await data(await admin.post('/api/delivery-runs', { headers, data: { requestKey: randomUUID(), confirmed: true, label: 'Entrega parcial de teste', driverId: driver.id, vehicleId: vehicle.id, scheduledAt: '2026-11-16T13:30:00.000Z', stops: [{ fulfillmentId, expectedVersion: row.version, loadKg: '10', volumeM3: '0.1' }] } }));
    const run = await data(await admin.get(`/api/delivery-runs/${created.id}`));
    const load = await data(await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: run.version, confirmed: true, action: 'LOAD', items: run.stops[0].items.map(item => ({ id: item.id, quantity: item.planned })), measurements: [{ stopId: run.stops[0].id, loadKg: '10', volumeM3: '0.1' }] } }));
    const departed = await data(await admin.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: load.version, confirmed: true, action: 'DEPART' } }));
    run.version = departed.version; return run;
  };
  const stock = Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim());
  const run = await trip();
  const input = { requestKey: randomUUID(), expectedVersion: run.version, confirmed: true, stopId: run.stops[0].id, receiverName: 'Recebedor privado da entrega', items: [{ id: run.stops[0].items[0].id, quantity: 1 }] };
  assert.equal((await owner.post(`/api/driver/runs/${run.id}/receipts`, { headers, data: input })).status(), 403);
  assert.equal((await guest.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: input })).status(), 403);
  assert.equal((await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { data: input })).status(), 403);
  const receipts = await Promise.all([admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: input }), admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: input })]);
  const partial = await data(receipts[0], 201); assert.deepEqual(await data(receipts[1], 201), partial);
  assert.equal((await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: { ...input, receiverName: 'Outro recebedor' } })).status(), 409);
  assert.equal((await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: { ...input, requestKey: randomUUID() } })).status(), 409);
  assert.equal((await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: { ...input, requestKey: randomUUID(), expectedVersion: partial.version, items: [{ id: input.items[0].id, quantity: 3 }] } })).status(), 409);
  row = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`)); assert.equal(row.status, 'PARTIALLY_RECEIVED'); assert.equal(row.items[0].delivered, 1);
  const publicMaterials = await data(await owner.get(`/api/orders/me/${order.id}/fulfillment-materials`)); assert.equal(publicMaterials.materials[0].receivedQuantity, 1); assert.equal(publicMaterials.materials[0].pendingQuantity, 2);
  assert.equal(JSON.stringify(publicMaterials).includes(input.receiverName), false);
  const guard = JSON.parse(db(`let blocked=false;try{await prisma.fulfillmentItem.update({where:{id:${JSON.stringify(row.items[0].id)}},data:{delivered:2}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1)); assert.equal(guard.blocked, true);
  await data(await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: partial.version, confirmed: true, action: 'RETURN_TO_WAREHOUSE', note: 'Saldo não recebido voltou ao depósito', items: [{ id: input.items[0].id, quantity: 2 }] } }));
  row = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`)); assert.equal(row.status, 'CHECKING'); assert.equal(row.items[0].delivered, 1); assert.equal(row.items[0].checked, 1);
  const next = await trip(); assert.equal(next.stops[0].items[0].planned, 2);
  const context = await browser.newContext({ baseURL });
  try {
    await data(await context.request.post('/api/auth/login', { data: { identifier: 'run-driver@example.invalid', password: 'Isolated-Run-2026!' } }));
    assert.equal((await context.request.post(`/api/driver/runs/${next.id}/receipts`, { headers, data: { ...input, requestKey: randomUUID(), expectedVersion: next.version } })).status(), 409, 'Old stop and material cannot be applied to a new trip');
    const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/entregas`);
    await page.getByRole('button', { name: /^Entrega parcial de teste/ }).click();
    const wizard = page.getByRole('region', { name: 'Registrar entrega', exact: true });
    await wizard.getByRole('button', { name: 'Registrar entrega', exact: true }).click();
    await wizard.getByLabel('Quantidade entregue agora', { exact: true }).fill('2'); await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
    await wizard.getByLabel('Nome do recebedor', { exact: true }).fill('Recebedor final privado'); await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
    await wizard.getByRole('checkbox', { name: 'Conferi o recebedor e entreguei fisicamente estes materiais.', exact: true }).check();
    const saved = page.waitForResponse(response => response.url().endsWith(`/driver/runs/${next.id}/receipts`) && response.request().method() === 'POST');
    await wizard.getByRole('button', { name: 'Confirmar entrega', exact: true }).click(); assert.equal((await saved).status(), 201);
    await page.getByText('Rota encerrada', { exact: false }).waitFor(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await context.close(); }
  row = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`)); assert.equal(row.status, 'RECEIVED'); assert.equal(row.items[0].delivered, 3);
  const complete = await data(await admin.get(`/api/delivery-runs/${next.id}`)); assert.equal(complete.status, 'CLOSED'); assert.equal(complete.stops[0].active, false); assert.equal(complete.stops[0].items[0].delivered, 2);
  const publicHistory = await data(await owner.get(`/api/orders/me/${order.id}/fulfillment-history`)); assert.equal(publicHistory.events.filter(event => event.kind === 'DELIVERY_RECEIVED').length, 2); assert.equal(JSON.stringify(publicHistory).includes('recebedor'), false);
  assert.deepEqual(await data(await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: input }), 201), partial);
  assert.equal(Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim()), stock);
  await validateTwoStopReceipts({ owner, admin, guest, browser, baseURL, data, db, product, driver, vehicle });
}
