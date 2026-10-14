import assert from 'node:assert/strict';

const apps = [
  { key: 'cliente', name: 'Rebequi Cliente', scope: '/painel-cliente', start: '/painel-cliente', worker: '/customer-sw.js', offline: '/aplicativos/cliente/offline.html' },
  { key: 'vendedor', name: 'Rebequi Vendas', scope: '/painel-lojista', start: '/painel-lojista/painel/atendimentos', worker: '/seller-sw.js', offline: '/aplicativos/vendedor/offline.html' },
  { key: 'entregas', name: 'Rebequi Entregas', scope: '/painel-lojista/painel/entregas', start: '/painel-lojista/painel/entregas', worker: '/driver-sw.js', offline: '/motoristas/offline.html' },
];
export async function validatePwaApps({ browser, baseURL }) {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/aplicativos/');
    await page.getByRole('heading', { name: 'Escolha seu aplicativo' }).waitFor();
    assert.equal(await page.getByRole('link', { name: /^Instalar Rebequi/ }).count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'tests/product/artifacts/pwa-choice-mobile.png', fullPage: true });
    const ids = [];
    for (const app of apps) {
      await page.goto('/aplicativos/');
      await page.getByRole('link', { name: `Instalar ${app.name}`, exact: true }).click();
      await page.getByRole('heading', { name: `Instalar ${app.name}`, exact: true }).waitFor();
      const url = `/aplicativos/${app.key}/manifest.webmanifest`;
      assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), url);
      assert.equal(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'), app.name);
      const response = await context.request.get(url);
      assert.match(response.headers()['content-type'], /application\/manifest\+json/);
      assert.match(response.headers()['cache-control'], /no-cache/);
      const manifest = await response.json(); ids.push(manifest.id);
      assert.equal(manifest.scope, app.scope); assert.equal(manifest.start_url, app.start); assert.equal(manifest.display, 'standalone');
      for (const icon of manifest.icons) assert.equal((await context.request.get(icon.src)).headers()['content-type'], 'image/png');
      const cdp = await context.newCDPSession(page);
      const inspected = await cdp.send('Page.getAppManifest');
      assert.equal(inspected.errors.length, 0); assert.equal(JSON.parse(inspected.data).id, manifest.id); await cdp.detach();
      const worker = await context.request.get(app.worker);
      assert.equal(worker.headers()['service-worker-allowed'], app.scope); assert.match(worker.headers()['cache-control'], /no-cache/);
      await page.evaluate(async scope => {
        const registration = await navigator.serviceWorker.getRegistration(scope + '/instalar/');
        if (!registration?.active) await navigator.serviceWorker.ready;
      }, app.scope);
      await page.reload();
      await page.waitForFunction(worker => navigator.serviceWorker.controller?.scriptURL.endsWith(worker), app.worker);
      // Exercise both outcomes of the browser event; no native OS installation is claimed.
      for (const outcome of ['dismissed', 'accepted']) {
        await page.evaluate(outcome => {
          const event = new Event('beforeinstallprompt');
          Object.assign(event, { prompt: async () => {}, userChoice: Promise.resolve({ outcome }) });
          window.dispatchEvent(event);
        }, outcome);
        await page.getByRole('button', { name: 'Instalar aplicativo', exact: true }).click();
        await page.getByRole('status').filter({ hasText: outcome === 'accepted' ? 'Instalação solicitada' : 'Instalação cancelada' }).waitFor();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await context.setOffline(true);
      try {
        await page.goto(app.start);
        await page.getByRole('heading', { name: 'Você está sem conexão', exact: true }).waitFor();
      } finally { await context.setOffline(false); }
    }
    assert.equal(new Set(ids).size, 3);
    await page.goto('/aplicativos/');
    const registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(registration => ({ scope: new URL(registration.scope).pathname, script: new URL(registration.active.scriptURL).pathname })));
    for (const app of apps) assert.equal(registrations.some(registration => registration.scope === app.scope && registration.script === app.worker), true);
    const cached = await page.evaluate(async () => {
      const paths = [];
      for (const key of await caches.keys()) for (const request of await (await caches.open(key)).keys()) paths.push(new URL(request.url).pathname);
      return paths.sort();
    });
    assert.deepEqual(cached, apps.map(app => app.offline).sort());
    // The install directory must not shadow the real SPA/login entrypoints in Nginx.
    for (const path of ['/painel-cliente', '/painel-lojista', '/painel-lojista/painel', '/painel-lojista/painel/entregas']) {
      const response = await context.request.get(path); assert.equal(response.status(), 200); assert.match(await response.text(), /id="root"/);
    }
  } finally { await context.close(); }
  const ios = await browser.newContext({ baseURL, viewport: { width: 375, height: 812 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });
  try {
    const page = await ios.newPage();
    for (const app of apps) {
      await page.goto(`${app.scope}/instalar/`);
      await page.getByRole('button', { name: 'Instalar aplicativo', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'No Safari, use Compartilhar' }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.screenshot({ path: 'tests/product/artifacts/pwa-ios-instructions.png', fullPage: true });
  } finally { await ios.close(); }
}
