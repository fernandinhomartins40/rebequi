import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function validateDeliveryRuns({ admin, guest, owner, browser, baseURL, data, db, id, sale, product }) {
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
    assert.deepEqual(Object.keys(ownRun).sort(), ['id', 'label', 'scheduledAt', 'snapshot', 'stops']);
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
  const cancellation = { requestKey: randomUUID(), expectedVersion: first.version, confirmed: true, reason: 'Replanejamento autorizado no runner' };
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
  assert.equal(Number(db(`console.log((await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}}})).stock);`).trim()), stockBefore, 'Planning/canceling a route must not move stock');
}
