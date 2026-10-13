import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function validateTwoStopReceipts({ owner, admin, guest, browser, baseURL, data, db, product, driver, vehicle }) {
  const headers = { Origin: baseURL };
  const other = await browser.newContext({ baseURL });
  try {
    await data(await other.request.post('/api/auth/register', { headers, data: { name: 'Cliente da segunda parada', whatsapp: '11999998877' } }), 201);
    const deliveries = [];
    for (const customer of [owner, other.request]) {
      const order = (await data(await customer.post('/api/orders/checkout', { headers, data: { items: [{ productId: product.id, quantity: 1 }] } }), 201)).order;
      const sale = await data(await admin.post('/api/sales/admin', { headers, data: { orderId: order.id, status: 'PAID', paymentMethod: 'PIX', idempotencyKey: randomUUID() } }), 201);
      const fulfillmentId = db(`console.log((await prisma.fulfillment.findUniqueOrThrow({where:{saleId:${JSON.stringify(sale.id)}}})).id);`).trim();
      let row = await data(await admin.get(`/api/fulfillments/${fulfillmentId}`));
      const configured = await data(await admin.put(`/api/fulfillments/${fulfillmentId}/details`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, mode: 'DELIVERY', address: `Endereço conferido da parada ${deliveries.length + 1}, 123`, region: null, scheduledAt: null, notes: null } }));
      row.version = configured.version;
      for (const action of ['PICK', 'CHECK', 'READY']) {
        const updated = await data(await admin.post(`/api/fulfillments/${fulfillmentId}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, action, items: action === 'READY' ? [] : [{ id: row.items[0].id, quantity: 1 }] } }));
        row.version = updated.version;
      }
      deliveries.push({ order, fulfillmentId, version: row.version });
    }
    const stock = Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim());
    const created = await data(await admin.post('/api/delivery-runs', { headers, data: { requestKey: randomUUID(), confirmed: true, label: 'Rota com dois clientes', driverId: driver.id, vehicleId: vehicle.id, scheduledAt: '2026-11-17T13:30:00.000Z', stops: deliveries.map(delivery => ({ fulfillmentId: delivery.fulfillmentId, expectedVersion: delivery.version, loadKg: '10', volumeM3: '0.1' })) } }));
    let run = await data(await admin.get(`/api/delivery-runs/${created.id}`));
    const receipt = { requestKey: randomUUID(), expectedVersion: run.version, confirmed: true, stopId: run.stops[0].id, receiverName: 'Recebedor exclusivo da primeira parada', items: [{ id: run.stops[0].items[0].id, quantity: 1 }] };
    assert.equal((await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: receipt })).status(), 409, 'Planned cargo is not physical receipt');
    const loaded = await data(await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: run.version, confirmed: true, action: 'LOAD', items: run.stops.flatMap(stop => stop.items.map(item => ({ id: item.id, quantity: item.planned }))), measurements: run.stops.map(stop => ({ stopId: stop.id, loadKg: '10', volumeM3: '0.1' })) } }));
    assert.equal((await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: { ...receipt, expectedVersion: loaded.version } })).status(), 409, 'Loaded cargo is not physical receipt');
    const departed = await data(await admin.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: loaded.version, confirmed: true, action: 'DEPART' } }));
    assert.equal((await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: { ...receipt, expectedVersion: departed.version, items: [{ id: run.stops[1].items[0].id, quantity: 1 }] } })).status(), 409, 'A different stop cannot contribute materials');
    const accepted = await data(await admin.post(`/api/dispatch/runs/${run.id}/receipts`, { headers, data: { ...receipt, expectedVersion: departed.version } }), 201);
    run = await data(await admin.get(`/api/delivery-runs/${run.id}`)); assert.equal(run.status, 'IN_TRANSIT'); assert.ok(run.stops.every(stop => stop.active));
    const firstOrder = (await data(await owner.get('/api/orders/me'))).find(order => order.id === deliveries[0].order.id); assert.equal(firstOrder.fulfillment.status, 'RECEIVED', 'Other deliveries must not hide this customer receipt');
    const firstHistory = await data(await owner.get(`/api/orders/me/${deliveries[0].order.id}/fulfillment-history`));
    const secondHistory = await data(await other.request.get(`/api/orders/me/${deliveries[1].order.id}/fulfillment-history`));
    assert.equal(firstHistory.events.filter(event => event.kind === 'DELIVERY_RECEIVED').length, 1);
    assert.equal(secondHistory.events.filter(event => event.kind === 'DELIVERY_RECEIVED').length, 0);
    assert.equal(JSON.stringify(secondHistory).includes(receipt.receiverName), false);
    assert.equal((await owner.get(`/api/orders/me/${deliveries[1].order.id}/fulfillment-materials`)).status(), 404);
    assert.equal((await other.request.get(`/api/orders/me/${deliveries[0].order.id}/fulfillment-history`)).status(), 404);
    const returnInput = { requestKey: randomUUID(), expectedVersion: accepted.version, confirmed: true, action: 'RETURN_TO_WAREHOUSE', note: 'Segunda parada não recebeu; saldo voltou fisicamente ao depósito', items: [{ id: run.stops[1].items[0].id, quantity: 1 }] };
    const returned = await data(await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: returnInput }));
    assert.deepEqual(await data(await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: returnInput })), returned);
    run = await data(await admin.get(`/api/delivery-runs/${run.id}`)); assert.equal(run.status, 'CLOSED'); assert.ok(run.stops.every(stop => !stop.active));
    const first = await data(await admin.get(`/api/fulfillments/${deliveries[0].fulfillmentId}`));
    const second = await data(await admin.get(`/api/fulfillments/${deliveries[1].fulfillmentId}`));
    assert.equal(first.status, 'RECEIVED'); assert.equal(first.items[0].delivered, 1); assert.equal(first.items[0].checked, 1);
    assert.equal(second.status, 'CHECKING'); assert.equal(second.items[0].delivered, 0); assert.equal(second.items[0].checked, 0);
    assert.equal((await data(await owner.get(`/api/orders/me/${deliveries[0].order.id}/fulfillment-history`))).events.some(event => event.kind === 'RUN_RETURNED_TO_WAREHOUSE'), false);
    assert.equal((await data(await other.request.get(`/api/orders/me/${deliveries[1].order.id}/fulfillment-history`))).events.some(event => event.kind === 'RUN_RETURNED_TO_WAREHOUSE'), true);
    assert.equal(Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim()), stock);
  } finally { await other.close(); }
}
