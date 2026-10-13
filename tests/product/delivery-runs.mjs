import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function validateDeliveryRuns({ admin, guest, owner, browser, baseURL, data, db, id, sale, product, orderId }) {
  const headers = { Origin: baseURL };
  const driver = await data(await admin.post('/api/users', { headers, data: { email: 'run-driver@example.invalid', password: 'Isolated-Run-2026!', name: 'Motorista do romaneio', role: 'DRIVER', mustChangePassword: false } }), 201);
  const vehicle = await data(await admin.post('/api/vehicles', { headers, data: { requestKey: randomUUID(), expectedVersion: 0, confirmed: true, plate: 'RUN1A23', label: 'Veículo do romaneio', maxLoadKg: '1000', maxVolumeM3: '12', restrictions: null, active: true, reason: 'Capacidade física de teste' } }));
  let row = await data(await admin.get(`/api/fulfillments/${id}`));
  for (const action of ['PICK', 'CHECK', 'READY']) {
    await data(await admin.post(`/api/fulfillments/${id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, action, note: '', items: action === 'READY' ? [] : [{ id: row.items[0].id, quantity: 2 }] } }));
    row = await data(await admin.get(`/api/fulfillments/${id}`));
  }
  const stockBefore = Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim());
  const input = { requestKey: randomUUID(), confirmed: true, label: 'Romaneio do runner', driverId: driver.id, vehicleId: vehicle.id, scheduledAt: '2026-11-15T13:30:00Z', stops: [{ fulfillmentId: id, expectedVersion: row.version, loadKg: '100', volumeM3: '0.5' }] };
  assert.equal((await guest.get('/api/delivery-runs')).status(), 403); assert.equal((await owner.get('/api/delivery-runs/candidates')).status(), 403);
  assert.equal((await admin.post('/api/delivery-runs', { data: input })).status(), 403);
  assert.equal((await admin.post('/api/delivery-runs', { headers, data: { ...input, requestKey: randomUUID(), stops: [{ ...input.stops[0], loadKg: '1000.001' }] } })).status(), 409);
  const duplicates = await Promise.all([admin.post('/api/delivery-runs', { headers, data: input }), admin.post('/api/delivery-runs', { headers, data: input })]);
  const [first, replay] = await Promise.all(duplicates.map(response => data(response))); assert.deepEqual(first, replay);
  const run = await data(await admin.get(`/api/delivery-runs/${first.id}`)); assert.equal(run.status, 'PLANNED'); assert.equal(run.snapshot.capacityChecked, true); assert.equal(run.snapshot.totalLoadKg, '100');
  assert.equal(run.stops[0].snapshot.items[0].quantity, 2); assert.equal(run.stops[0].position, 1);
  const driverContext = await browser.newContext({ baseURL }); const otherDriver = await browser.newContext({ baseURL });
  try {
    await data(await driverContext.request.post('/api/auth/login', { data: { identifier: 'run-driver@example.invalid', password: 'Isolated-Run-2026!' } }));
    await data(await otherDriver.request.post('/api/auth/login', { data: { identifier: 'driver-a@example.invalid', password: 'Isolated-Driver-2026!' } }));
    const ownRun = await data(await driverContext.request.get(`/api/driver/runs/${first.id}`));
    assert.deepEqual(Object.keys(ownRun).sort(), ['departedAt', 'id', 'label', 'loadSnapshot', 'loadedAt', 'scheduledAt', 'snapshot', 'status', 'stops', 'version']);
    assert.equal((await otherDriver.request.get(`/api/driver/runs/${first.id}`)).status(), 404);
    const page = await driverContext.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/entregas`); await page.getByRole('button', { name: /^Romaneio do runner/ }).click();
    await page.getByText(`1. ${sale.referenceCode}`, { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await driverContext.close(); await otherDriver.close(); }
  assert.equal((await data(await admin.get('/api/delivery-runs/candidates'))).deliveries.some(item => item.id === id), false);
  assert.equal((await admin.post('/api/delivery-runs', { headers, data: { ...input, requestKey: randomUUID() } })).status(), 409);
  assert.equal((await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'PENDING_PAYMENT' } })).status(), 409);
  assert.equal((await admin.post(`/api/sales/admin/${sale.id}/status`, { headers, data: { status: 'CANCELED' } })).status(), 409);
  row = await data(await admin.get(`/api/fulfillments/${id}`));
  assert.equal((await admin.post(`/api/fulfillments/${id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, action: 'CHECK', note: '', items: [{ id: row.items[0].id, quantity: 1 }] } })).status(), 409);
  const immutable = JSON.parse(db(`let blocked=false;try{await prisma.deliveryRunStop.update({where:{id:${JSON.stringify(run.stops[0].id)}},data:{position:2}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1));
  assert.equal(immutable.blocked, true);
  const loadInput = { requestKey: randomUUID(), expectedVersion: run.version, confirmed: true, action: 'LOAD', note: '', items: run.stops.flatMap(stop => stop.items.map(item => ({ id: item.id, quantity: item.planned }))), measurements: run.stops.map(stop => ({ stopId: stop.id, loadKg: '100', volumeM3: '0.5' })) };
  assert.equal((await admin.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: run.version, confirmed: true, action: 'DEPART' } })).status(), 409);
  assert.equal((await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { ...loadInput, items: loadInput.items.map(item => ({ ...item, quantity: 1 })) } })).status(), 409);
  const loaded = await data(await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: loadInput }));
  assert.deepEqual(await data(await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: loadInput })), loaded);
  const loadedRun = await data(await admin.get(`/api/delivery-runs/${run.id}`)); assert.equal(loadedRun.status, 'LOADED'); assert.ok(loadedRun.loadedAt);
  assert.equal((await data(await owner.get('/api/orders/me'))).find(order => order.id === orderId).fulfillment.status, 'LOADED');
  assert.equal((await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: loaded.version, confirmed: true, action: 'DEPART' } })).status(), 403);
  assert.equal((await admin.post(`/api/delivery-runs/${run.id}/cancel`, { headers, data: { requestKey: randomUUID(), expectedVersion: loaded.version, confirmed: true, reason: 'Carga precisa ser retirada primeiro' } })).status(), 409);
  const unload = await data(await guest.post(`/api/dispatch/runs/${run.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: loaded.version, confirmed: true, action: 'UNLOAD', note: 'Materiais retirados do veículo para replanejar' } }));
  assert.equal((await data(await admin.get(`/api/delivery-runs/${run.id}`))).status, 'PLANNED');
  const cancellation = { requestKey: randomUUID(), expectedVersion: unload.version, confirmed: true, reason: 'Replanejamento autorizado no runner' };
  const canceled = await data(await admin.post(`/api/delivery-runs/${first.id}/cancel`, { headers, data: cancellation }));
  assert.deepEqual(await data(await admin.post(`/api/delivery-runs/${first.id}/cancel`, { headers, data: cancellation })), canceled);
  assert.equal((await data(await admin.get(`/api/delivery-runs/${first.id}`))).stops[0].active, false);
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  try {
    await context.addCookies((await admin.storageState()).cookies); const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/deposito`); await page.getByRole('button', { name: 'Gerenciar romaneios', exact: true }).click();
    await page.getByRole('button', { name: 'Planejar romaneio', exact: true }).click();
    await page.getByLabel('Nome do romaneio', { exact: true }).fill('Romaneio mobile');
    await page.getByLabel('Motorista do romaneio', { exact: true }).selectOption(driver.id); await page.getByLabel('Veículo do romaneio', { exact: true }).selectOption(vehicle.id);
    await page.getByLabel('Saída planejada (horário local)', { exact: true }).fill('2026-11-15T10:30');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('checkbox', { name: `Selecionar ${sale.referenceCode}`, exact: true }).check();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('checkbox', { name: 'Conferi a equipe, as entregas e a ordem das paradas.' }).check();
    await page.getByRole('button', { name: 'Confirmar planejamento', exact: true }).click(); await page.getByRole('heading', { name: 'Romaneio mobile', exact: true }).waitFor();
    await page.getByText('Peso, volume ou capacidade precisam de conferência. Carregamento e saída ainda não confirmados.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByLabel('Motivo do cancelamento do planejamento', { exact: true }).fill('Reorganizar a rota antes de carregar');
    await page.getByRole('checkbox', { name: 'Confirmo o cancelamento deste planejamento.' }).check(); await page.getByRole('button', { name: 'Cancelar planejamento', exact: true }).click();
    await page.getByText('Planejamento cancelado', { exact: false }).waitFor();
  } finally { await context.close(); }
  row = await data(await admin.get(`/api/fulfillments/${id}`));
  const trip = await data(await admin.post('/api/delivery-runs', { headers, data: { ...input, requestKey: randomUUID(), label: 'Viagem com retorno', stops: [{ ...input.stops[0], expectedVersion: row.version }] } }));
  const tripRow = await data(await admin.get(`/api/delivery-runs/${trip.id}`));
  const tripLoad = { ...loadInput, requestKey: randomUUID(), expectedVersion: tripRow.version, items: tripRow.stops.flatMap(stop => stop.items.map(item => ({ id: item.id, quantity: item.planned }))), measurements: tripRow.stops.map(stop => ({ stopId: stop.id, loadKg: '100', volumeM3: '0.5' })) };
  const warehouseContext = await browser.newContext({ baseURL });
  let tripLoaded;
  try {
    await warehouseContext.addCookies((await guest.storageState()).cookies);
    const page = await warehouseContext.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/deposito`); await page.getByRole('button', { name: 'Conferir expedição', exact: true }).click();
    await page.getByRole('button', { name: /^Viagem com retorno/ }).click(); await page.getByRole('button', { name: 'Registrar carga ou saída', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    for (const stop of tripRow.stops) for (const item of stop.items) {
      const name = stop.snapshot.items.find(snapshot => snapshot.id === item.fulfillmentItemId).name;
      await page.getByRole('checkbox', { name: `Conferir ${name} (${stop.snapshot.referenceCode})`, exact: true }).check();
    }
    await page.getByLabel('Peso conferido em kg', { exact: true }).fill('100'); await page.getByLabel('Volume conferido em m³', { exact: true }).fill('0,5');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('checkbox', { name: 'Conferi e carreguei fisicamente todos os materiais.' }).check();
    const response = page.waitForResponse(response => new URL(response.url()).pathname === `/api/dispatch/runs/${trip.id}/operations` && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirmar operação', exact: true }).click(); tripLoaded = await data(await response);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await warehouseContext.close(); }
  const departureDriver = await browser.newContext({ baseURL });
  let departed;
  try {
    await data(await departureDriver.request.post('/api/auth/login', { data: { identifier: 'run-driver@example.invalid', password: 'Isolated-Run-2026!' } }));
    const departure = { requestKey: randomUUID(), expectedVersion: tripLoaded.version, confirmed: true, action: 'DEPART' };
    departed = await data(await departureDriver.request.post(`/api/driver/runs/${trip.id}/operations`, { headers, data: departure }));
    assert.deepEqual(await data(await departureDriver.request.post(`/api/driver/runs/${trip.id}/operations`, { headers, data: departure })), departed);
    assert.equal((await data(await owner.get('/api/orders/me'))).find(order => order.id === orderId).fulfillment.status, 'IN_TRANSIT');
    assert.equal((await departureDriver.request.post(`/api/driver/runs/${trip.id}/operations`, { headers, data: { requestKey: randomUUID(), expectedVersion: departed.version, confirmed: true, action: 'UNLOAD', note: 'Motorista não confere recebimento no depósito' } })).status(), 403);
  } finally { await departureDriver.close(); }
  const returned = { requestKey: randomUUID(), expectedVersion: departed.version, confirmed: true, action: 'RETURN_TO_WAREHOUSE', note: 'Materiais não entregues recebidos fisicamente no depósito', items: tripLoad.items };
  const closed = await data(await guest.post(`/api/dispatch/runs/${trip.id}/operations`, { headers, data: returned }));
  assert.deepEqual(await data(await guest.post(`/api/dispatch/runs/${trip.id}/operations`, { headers, data: returned })), closed);
  assert.equal((await data(await admin.get(`/api/delivery-runs/${trip.id}`))).status, 'CLOSED');
  assert.equal((await data(await owner.get('/api/orders/me'))).find(order => order.id === orderId).fulfillment.status, 'CHECKING');
  assert.equal(Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim()), stockBefore, 'Planning/canceling a route must not move stock');
}
