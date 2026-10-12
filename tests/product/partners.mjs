import assert from 'node:assert/strict';

export async function validatePartners({ owner, guest, admin, browser, baseURL, data, db }) {
  const origin = { Origin: baseURL };
  assert.equal((await guest.get('/api/partners/me')).status(), 401);
  assert.equal(await data(await owner.get('/api/partners/me')), null);
  const input = { specialties: ['Pintura', 'Pisos e revestimentos'], city: 'São Paulo', region: 'Zona Norte', services: 'Pintura residencial', experienceYears: 5, expectedVersion: 0, acceptedTermsVersion: '2026-10-11' };
  assert.equal((await owner.put('/api/partners/me', { data: input })).status(), 403);
  assert.equal((await owner.put('/api/partners/me', { headers: origin, data: { ...input, status: 'APPROVED' } })).status(), 400);
  const created = await data(await owner.put('/api/partners/me', { headers: origin, data: input }));
  assert.equal(created.status, 'PENDING'); assert.equal(created.version, 1); assert.match(created.referralCode, /^RB[A-F0-9]{16}$/);
  assert.equal(created.userId, (await data(await owner.get('/api/auth/me'))).id);
  assert.equal((await owner.get('/api/partners/admin/list')).status(), 403);
  const competing = await Promise.all([1, 2].map(experienceYears => owner.put('/api/partners/me', { headers: origin, data: { ...input, experienceYears, expectedVersion: 1 } })));
  assert.deepEqual(competing.map(response => response.status()).sort(), [200, 409]);
  let profile = await data(await owner.get('/api/partners/me'));
  const suspended = await data(await admin.post(`/api/partners/admin/${profile.id}/review`, { headers: origin, data: { status: 'SUSPENDED', reason: 'Conferência de cadastro', expectedVersion: profile.version } }));
  assert.equal(suspended.status, 'SUSPENDED');
  profile = await data(await owner.put('/api/partners/me', { headers: origin, data: { ...input, expectedVersion: suspended.version } }));
  assert.equal(profile.status, 'SUSPENDED', 'Editing cannot remove a store suspension');
  const approved = await data(await admin.post(`/api/partners/admin/${profile.id}/review`, { headers: origin, data: { status: 'APPROVED', reason: 'Cadastro conferido', expectedVersion: profile.version } }));
  assert.equal(approved.status, 'APPROVED');
  assert.equal((await admin.post(`/api/partners/admin/${profile.id}/review`, { headers: origin, data: { status: 'REJECTED', reason: 'Obsolete review', expectedVersion: profile.version } })).status(), 409);
  const audit = JSON.parse(db(`console.log(JSON.stringify(await prisma.partnerProfileAudit.findMany({where:{partnerId:${JSON.stringify(profile.id)}},orderBy:{createdAt:'asc'}})));`).trim());
  assert.equal(audit.length, 5); assert.equal(audit.at(-1).action, 'PROFILE_REVIEWED');
  assert.ok(audit.every(entry => !('password' in entry)));
  const context = await browser.newContext();
  try {
    await context.addCookies((await owner.storageState()).cookies);
    const page = await context.newPage();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(`${baseURL}/parceiros/`);
      assert.equal(response.status(), 200, 'The PWA entry must serve the application, not a directory listing');
      await page.getByText('Cadastro aprovado', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole('button', { name: 'Conferir meu perfil' }).click();
      await page.getByRole('heading', { name: 'Seu perfil profissional' }).waitFor();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByLabel('Cidade', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByText('Li e aceito as condições deste cadastro.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.goto(`${baseURL}/parceiros/`);
    await page.getByText('Cadastro aprovado', { exact: true }).waitFor();
    const manifest = await context.request.get(`${baseURL}/parceiros/manifest.webmanifest`);
    assert.equal((await manifest.json()).scope, '/parceiros/');
    const workerResponse = await context.request.get(`${baseURL}/parceiros/sw.js`);
    assert.equal(workerResponse.status(), 200); assert.match(workerResponse.headers()['cache-control'], /no-cache/);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.getByText('Cadastro aprovado', { exact: true }).waitFor();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const cachedUrls = await page.evaluate(async () => {
      const results = [];
      for (const name of await caches.keys()) {
        if (!name.startsWith('rebequi-partners')) continue;
        const cache = await caches.open(name); results.push(...(await cache.keys()).map(request => request.url));
      }
      return results;
    });
    assert.ok(cachedUrls.some(url => new URL(url).pathname === '/index.html'));
    assert.ok(cachedUrls.every(url => !url.includes('/api/') && !url.includes('/uploads/')));
    await context.setOffline(true); await page.reload();
    await page.getByRole('heading', { name: 'Você está sem conexão' }).waitFor();
    assert.equal(await page.getByText('Cadastro aprovado', { exact: true }).count(), 0);
    await context.setOffline(false); await page.reload();
    await page.getByText('Cadastro aprovado', { exact: true }).waitFor();
  } finally { await context.close(); }
}
