import assert from 'node:assert/strict';
export async function validateDriverPwa({ context, page, baseURL }) {
  const manifest = await context.request.get('/motoristas/manifest.webmanifest'); assert.equal(manifest.status(), 200);
  assert.match(manifest.headers()['content-type'], /application\/manifest\+json/);
  const worker = await context.request.get('/driver-sw.js'); assert.equal(worker.status(), 200);
  assert.match(worker.headers()['cache-control'], /no-cache/); assert.equal(worker.headers()['service-worker-allowed'], '/painel-lojista/painel/entregas');
  const config = await manifest.json(); assert.equal(config.start_url, '/painel-lojista/painel/entregas'); assert.equal(config.display, 'standalone');
  await page.goto(`${baseURL}/painel-lojista/painel/entregas`);
  await page.getByRole('button', { name: 'Instalar aplicativo', exact: true }).waitFor();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), '/motoristas/manifest.webmanifest');
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/driver-sw.js'));
  const paths = await page.evaluate(async () => {
    const keys = await caches.keys(); const result = [];
    for (const key of keys.filter(value => value.startsWith('rebequi-driver-'))) {
      for (const request of await (await caches.open(key)).keys()) result.push(new URL(request.url).pathname);
    }
    return result;
  });
  assert.deepEqual(paths, ['/motoristas/offline.html'], 'Driver cache contains only the public offline notice');
  await context.setOffline(true);
  try {
    await page.getByText('Sem conexão. Mantenha esta tela aberta e reconecte-se para confirmar operações. Nada será enviado automaticamente.', { exact: true }).waitFor();
    await page.goto(`${baseURL}/painel-lojista/painel/entregas`);
    await page.getByRole('heading', { name: 'Você está sem conexão', exact: true }).waitFor();
    await page.getByText('Nenhum recebimento foi registrado por esta tela.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const leaked = await page.evaluate(async () => {
      for (const key of await caches.keys()) {
        if (!key.startsWith('rebequi-driver-')) continue;
        for (const request of await (await caches.open(key)).keys()) if (/\/api\/|\/uploads\//.test(new URL(request.url).pathname)) return true;
      }
      return false;
    });
    assert.equal(leaked, false);
  } finally { await context.setOffline(false); }
  await page.getByRole('link', { name: 'Tentar novamente', exact: true }).click();
  await page.getByRole('heading', { name: 'Minhas entregas', exact: true }).waitFor();
}
