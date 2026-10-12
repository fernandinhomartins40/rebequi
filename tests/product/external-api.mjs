import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
export async function validateExternalApi({ owner, admin, guest, browser, baseURL, data, db }) {
  const headers = { Origin: baseURL };
  const input = { requestKey: randomUUID(), name: 'Integrador sintético do runner', scopes: ['catalog:read'], validityDays: 30, confirmed: true };
  assert.equal((await owner.get('/api/integrations/external-api/clients')).status(), 403);
  assert.equal((await admin.post('/api/integrations/external-api/clients', { data: input })).status(), 403);
  const credential = await data(await admin.post('/api/integrations/external-api/clients', { headers, data: input }), 201);
  assert.equal((await admin.post('/api/integrations/external-api/clients', { headers, data: input })).status(), 409);
  const clients = await data(await admin.get('/api/integrations/external-api/clients')); assert.equal(clients.clients.filter(item => item.id === credential.id).length, 1); assert.equal(JSON.stringify(clients).includes(credential.token), false); assert.equal(JSON.stringify(clients).includes('tokenHash'), false);
  const persisted = JSON.parse(db(`console.log(JSON.stringify(await prisma.externalApiClient.findUniqueOrThrow({where:{id:${JSON.stringify(credential.id)}},select:{tokenHash:true}})));`).trim());
  assert.equal(persisted.tokenHash, createHash('sha256').update(credential.token).digest('hex')); assert.notEqual(persisted.tokenHash, credential.token);
  assert.equal((await admin.get('/api/external/v1/products')).status(), 401, 'Admin cookies do not authenticate the external API');
  const bearer = { Authorization: `Bearer ${credential.token}` };
  const response = await guest.get('/api/external/v1/products?limit=2', { headers: bearer }); const products = await data(response);
  assert.match(response.headers()['cache-control'], /no-store/); assert.ok(response.headers()['x-request-id']); assert.equal(products.products.length, 2); assert.equal(products.limit, 2); assert.match(products.products[0].priceCents, /^\d+$/);
  assert.equal((await guest.get('/api/external/v1/stock', { headers: bearer })).status(), 403);
  assert.equal((await guest.get('/api/external/v1/products?limit=101', { headers: bearer })).status(), 400);
  const specResponse = await guest.get('/api/external/v1/openapi.json'); assert.equal(specResponse.status(), 200); assert.equal((await specResponse.json()).openapi, '3.1.1');
  const full = await data(await admin.post('/api/integrations/external-api/clients', { headers, data: { ...input, requestKey: randomUUID(), name: 'Leitura completa sintética', scopes: ['catalog:read', 'stock:read', 'orders:read'] } }), 201);
  const fullBearer = { Authorization: `Bearer ${full.token}` };
  const stock = await data(await guest.get('/api/external/v1/stock?limit=2', { headers: fullBearer })); assert.equal(stock.stock[0].available, Math.max(0, stock.stock[0].stock - stock.stock[0].reservedStock)); assert.equal(stock.stock[0].quantityUnit, 'COMMERCIAL_UNIT');
  const orders = await data(await guest.get('/api/external/v1/orders?limit=2', { headers: fullBearer })); assert.equal(JSON.stringify(orders).includes('customerWhatsapp'), false); assert.equal(JSON.stringify(orders).includes('customerName'), false); assert.equal(JSON.stringify(orders).includes('internalNotes'), false);
  for (let index = 0; index < 30; index++) await guest.get('/api/external/v1/products?limit=1', { headers: bearer });
  assert.equal((await guest.get('/api/external/v1/products?limit=1', { headers: bearer })).status(), 429);
  await data(await admin.post(`/api/integrations/external-api/clients/${full.id}/revoke`, { headers, data: { confirmed: true } }));
  await data(await admin.post(`/api/integrations/external-api/clients/${full.id}/revoke`, { headers, data: { confirmed: true } }));
  assert.equal((await guest.get('/api/external/v1/stock', { headers: fullBearer })).status(), 401);
  db(`await prisma.externalApiClient.update({where:{id:${JSON.stringify(credential.id)}},data:{expiresAt:new Date(0)}});`);
  assert.equal((await guest.get('/api/external/v1/products', { headers: bearer })).status(), 401);
  const context = await browser.newContext();
  try {
    await context.addCookies((await admin.storageState()).cookies); const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/integrações?tab=erp`); await page.getByLabel('Nome do sistema ou integrador', { exact: true }).fill('Credencial mobile sintética');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('checkbox', { name: 'Consultar catálogo e preços', exact: true }).check(); await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Autorizo este sistema a consultar os dados nas permissões selecionadas.' }).check(); await page.getByRole('button', { name: 'Emitir credencial', exact: true }).click();
    await page.getByLabel('Credencial exibida somente nesta emissão', { exact: true }).waitFor(); assert.match(await page.getByLabel('Credencial exibida somente nesta emissão', { exact: true }).inputValue(), /^rb_api_/);
    await page.getByRole('button', { name: 'Fechar credencial', exact: true }).click(); await page.reload(); assert.equal(await page.getByLabel('Credencial exibida somente nesta emissão', { exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await context.close(); }
  const final = await data(await admin.get('/api/integrations/external-api/clients'));
  for (const client of final.clients.filter(item => !item.revokedAt)) await data(await admin.post(`/api/integrations/external-api/clients/${client.id}/revoke`, { headers, data: { confirmed: true } }));
}
