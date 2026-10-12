import assert from 'node:assert/strict';

export async function validatePartnerReferrals({ owner, guest, admin, browser, baseURL, data, db, product }) {
  const headers = { Origin: baseURL };
  const profile = await data(await owner.get('/api/partners/me'));
  const referral = { code: profile.referralCode, confirmed: true };
  const lookup = await data(await guest.get(`/api/orders/referral/${referral.code}`));
  assert.deepEqual(Object.keys(lookup), ['code']);
  assert.equal((await guest.get('/api/orders/referral/RB0000000000000000')).status(), 404);
  assert.equal((await guest.get('/api/partners/referrals')).status(), 401);
  const before = Number(db(`console.log(await prisma.customerOrder.count({where:{userId:${JSON.stringify(profile.userId)}}}));`).trim());
  assert.equal((await owner.post('/api/orders/checkout', { headers, data: { referral, items: [{ productId: product.id, quantity: 1 }] } })).status(), 400);
  assert.equal(Number(db(`console.log(await prisma.customerOrder.count({where:{userId:${JSON.stringify(profile.userId)}}}));`).trim()), before);
  const body = { name: 'Cliente indicado privado', whatsapp: '11987654330', referral, items: [{ productId: product.id, quantity: 1 }] };
  assert.equal((await guest.post('/api/orders/public/checkout', { headers, data: { ...body, referral: { ...referral, confirmed: false } } })).status(), 400);
  assert.equal((await guest.post('/api/orders/public/checkout', { data: body })).status(), 403);
  const checkout = await data(await guest.post('/api/orders/public/checkout', { headers, data: body }), 201);
  assert.equal(checkout.order.referral.code, profile.referralCode);
  const own = await data(await owner.get('/api/partners/referrals'));
  assert.equal(own.total, 1); assert.equal(own.referrals[0].referenceCode, checkout.order.referenceCode); assert.equal(own.referrals[0].saleStatus, null);
  assert.equal(JSON.stringify(own).includes(body.name), false); assert.equal(JSON.stringify(own).includes(body.whatsapp), false); assert.equal(JSON.stringify(own).includes(product.name), false);
  assert.equal((await guest.get('/api/partners/referrals')).status(), 404);
  assert.equal((await data(await admin.get(`/api/orders/admin/${checkout.order.id}`))).referral.code, profile.referralCode);
  const context = await browser.newContext();
  try {
    await context.addCookies((await owner.storageState()).cookies); const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/parceiros/?area=beneficios`);
    await page.getByRole('heading', { name: 'Seu link de indicação', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Link de indicação', { exact: true }).inputValue(), `${baseURL}/indicacao/${profile.referralCode}`);
    await page.waitForFunction(() => { const canvas = document.querySelector('canvas'); return canvas?.width === 220 && canvas?.getContext('2d')?.getImageData(0, 0, 220, 220).data.some((value, index) => index % 4 < 3 && value === 0); });
    assert.equal(await page.getByText(checkout.order.referenceCode, { exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.goto(`${baseURL}/indicacao/${profile.referralCode}`);
    await page.getByRole('button', { name: 'Usar indicação e ver produtos', exact: true }).click();
    await page.waitForURL('**/categorias');
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('rebequi.referral.intent.v1')).code), profile.referralCode);
  } finally { await context.close(); }
  const suspended = await data(await admin.post(`/api/partners/admin/${profile.id}/review`, { headers, data: { status: 'SUSPENDED', expectedVersion: profile.version, reason: 'Teste isolado de bloqueio de indicação' } }));
  assert.equal((await guest.get(`/api/orders/referral/${referral.code}`)).status(), 404);
  assert.equal((await data(await owner.get('/api/partners/referrals'))).canShare, false);
  await data(await admin.post(`/api/partners/admin/${profile.id}/review`, { headers, data: { status: 'APPROVED', expectedVersion: suspended.version, reason: 'Concluir teste isolado' } }));
}
