import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function validateDrivers({ admin, guest, browser, baseURL, data, db, id }) {
  const headers = { Origin: baseURL };
  const contextA = await browser.newContext({ baseURL }); const contextB = await browser.newContext({ baseURL });
  try {
    const create = async (suffix, context) => {
      const identifier = `driver-${suffix}@example.invalid`; const password = 'Isolated-Driver-2026!';
      const user = await data(await admin.post('/api/users', { headers, data: { email: identifier, password, name: `Motorista ${suffix}`, role: 'DRIVER', mustChangePassword: false } }), 201);
      await data(await context.request.post('/api/auth/login', { data: { identifier, password } }));
      return user;
    };
    const a = await create('a', contextA); const b = await create('b', contextB);
    let row = await data(await admin.get(`/api/fulfillments/${id}`));
    const input = { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, driverId: a.id, reason: 'Entrega atribuída no teste isolado' };
    assert.equal((await admin.put(`/api/fulfillments/${id}/driver`, { headers, data: input })).status(), 409, 'Pickup cannot be assigned as a delivery');
    await data(await admin.put(`/api/fulfillments/${id}/details`, { headers, data: { requestKey: randomUUID(), expectedVersion: row.version, confirmed: true, mode: 'DELIVERY', address: 'Rua do runner, 100, bairro de teste', region: 'Região de teste', scheduledAt: null, notes: 'Nota privada do depósito' } }));
    row = await data(await admin.get(`/api/fulfillments/${id}`));
    const assignment = { ...input, expectedVersion: row.version };
    assert.equal((await admin.put(`/api/fulfillments/${id}/driver`, { data: assignment })).status(), 403);
    assert.equal((await guest.put(`/api/fulfillments/${id}/driver`, { headers, data: assignment })).status(), 403);
    const saved = await data(await admin.put(`/api/fulfillments/${id}/driver`, { headers, data: assignment }));
    const oldImageGuard = JSON.parse(db(`let blocked=false;try{await prisma.fulfillment.update({where:{id:${JSON.stringify(id)}},data:{mode:'PICKUP'}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1));
    assert.equal(oldImageGuard.blocked, true, 'Older images cannot silently convert an assigned delivery into pickup');
    assert.deepEqual(await data(await admin.put(`/api/fulfillments/${id}/driver`, { headers, data: assignment })), saved);
    assert.equal((await admin.put(`/api/fulfillments/${id}/details`, { headers, data: { requestKey: randomUUID(), expectedVersion: saved.version, confirmed: true, mode: 'PICKUP', address: null, region: null, scheduledAt: null, notes: null } })).status(), 409);
    const tasks = await data(await contextA.request.get('/api/driver/tasks'));
    assert.equal(tasks.tasks.length, 1);
    const task = await data(await contextA.request.get(`/api/driver/tasks/${id}`));
    assert.deepEqual(Object.keys(task).sort(), ['address', 'id', 'items', 'region', 'sale', 'scheduledAt', 'status']);
    assert.equal(JSON.stringify(task).includes('Nota privada'), false);
    assert.equal('price' in task.items[0], false); assert.equal('location' in task.items[0], false);
    assert.equal((await contextB.request.get(`/api/driver/tasks/${id}`)).status(), 404);
    for (const path of ['/api/fulfillments', '/api/vehicles', '/api/customers/admin/list', '/api/sales/admin/revenue', '/api/users']) assert.equal((await contextA.request.get(path)).status(), 403);
    const page = await contextA.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/entregas`);
    await page.getByRole('link', { name: 'Conferir entrega', exact: true }).click();
    await page.getByRole('heading', { name: 'Endereço', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const management = await browser.newContext();
    try {
      await management.addCookies((await admin.storageState()).cookies);
      const dispatcher = await management.newPage(); await dispatcher.setViewportSize({ width: 390, height: 844 });
      await dispatcher.goto(`${baseURL}/painel-lojista/painel/deposito/${id}`);
      await dispatcher.getByRole('button', { name: 'Atribuir motorista', exact: true }).click();
      const driverForm = dispatcher.getByRole('heading', { name: 'Motorista responsável', exact: true }).locator('..');
      await dispatcher.getByLabel('Motorista ativo', { exact: true }).selectOption(b.id);
      await driverForm.getByRole('button', { name: 'Continuar', exact: true }).click();
      await dispatcher.getByLabel('Motivo da atribuição', { exact: true }).fill('Reatribuição revoga acesso anterior');
      await driverForm.getByRole('button', { name: 'Continuar', exact: true }).click();
      await dispatcher.getByRole('checkbox', { name: 'Conferi e autorizo a atribuição.' }).check();
      await dispatcher.getByRole('button', { name: 'Confirmar atribuição', exact: true }).click();
      await dispatcher.getByText(`Conferir materiais · Versão ${saved.version + 1}`, { exact: true }).waitFor();
      assert.equal(await dispatcher.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    } finally { await management.close(); }
    assert.equal((await contextA.request.get(`/api/driver/tasks/${id}`)).status(), 404);
    assert.equal((await data(await contextA.request.get('/api/driver/tasks'))).tasks.length, 0);
    assert.equal((await contextB.request.get(`/api/driver/tasks/${id}`)).status(), 200);
    await data(await admin.patch(`/api/users/${b.id}`, { headers, data: { isActive: false } }));
    assert.equal((await contextB.request.get(`/api/driver/tasks/${id}`)).status(), 401, 'Account deactivation revokes existing driver sessions');
    assert.equal((await admin.put(`/api/fulfillments/${id}/driver`, { headers, data: { ...assignment, driverId: b.id, expectedVersion: saved.version + 1, requestKey: randomUUID() } })).status(), 409);
  } finally { await contextA.close(); await contextB.close(); }
}
