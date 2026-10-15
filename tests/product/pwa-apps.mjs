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
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const banner = page.getByRole('region', { name: 'Mais perto da sua obra. A um toque de distância.' });
      await banner.scrollIntoViewIfNeeded();
      await banner.getByRole('img').waitFor();
      await banner.getByRole('img').evaluate(image => image.decode());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.ok(await banner.getByRole('img').evaluate(image => image.naturalWidth > 0));
      const cta = banner.getByRole('link', { name: 'Escolher meu aplicativo' });
      assert.equal(await cta.getAttribute('href'), '/aplicativos/');
      assert.ok((await cta.boundingBox()).height >= 44);
      await banner.screenshot({ path: `tests/product/artifacts/pwa-landing-banner-${width}.png` });
      await cta.click();
      await page.getByRole('heading', { name: 'Escolha seu aplicativo' }).waitFor();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/aplicativos/');
    await page.getByRole('heading', { name: 'Escolha seu aplicativo' }).waitFor();
    assert.equal(await page.getByRole('link', { name: /^Instalar Rebequi/ }).count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'tests/product/artifacts/pwa-choice-mobile.png', fullPage: true });
    const ids = [];
    for (const app of apps) {
      await page.goto('/aplicativos/');
      await page.getByRole('link', { name: `Instalar ${app.name}`, exact: true }).click();
      await page.getByRole('heading', { name: app.name, exact: true }).waitFor();
      assert.equal(await page.locator('#install-help').getAttribute('open'), null);
      const url = `/aplicativos/${app.key}/manifest.webmanifest`;
      assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), url);
      assert.equal(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'), app.name);
      const response = await context.request.get(url);
      assert.match(response.headers()['content-type'], /application\/manifest\+json/);
      assert.match(response.headers()['cache-control'], /no-cache/);
      const manifest = await response.json(); ids.push(manifest.id);
      assert.equal(manifest.name, app.name); assert.equal(manifest.short_name, app.name);
      assert.equal(await page.title(), app.name);
      await page.screenshot({ path: `tests/product/artifacts/pwa-clean-${app.key}.png`, fullPage: true });
      assert.equal(manifest.scope, app.scope); assert.equal(manifest.start_url, app.start); assert.equal(manifest.display, 'standalone');
      for (const icon of manifest.icons) assert.equal((await context.request.get(icon.src)).headers()['content-type'], 'image/png');
      assert.equal(manifest.icons.some(icon => icon.purpose === 'maskable' && icon.sizes === '512x512'), true);
      for (const size of [32, 48, 96, 152, 167, 180, 192, 512, 1024]) {
        const response = await context.request.get(`/aplicativos/${app.key}/icon-v2-${size}.png`);
        assert.equal(response.status(), 200);
        const bytes = await response.body(); assert.equal(bytes.readUInt32BE(16), size); assert.equal(bytes.readUInt32BE(20), size);
      }
      const ico = await context.request.get(`/aplicativos/${app.key}/favicon.ico`);
      assert.equal((await ico.body()).readUInt16LE(2), 1);
      const cdp = await context.newCDPSession(page);
      const inspected = await cdp.send('Page.getAppManifest');
      assert.equal(inspected.errors.length, 0); assert.equal(JSON.parse(inspected.data).id, manifest.id);
      assert.deepEqual((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors, []);
      await cdp.detach();
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
          const event = new Event('beforeinstallprompt', { cancelable: true });
          window.installPromptCalls = 0;
          Object.assign(event, { prompt: async () => { window.installPromptCalls++; }, userChoice: Promise.resolve({ outcome }) });
          window.dispatchEvent(event);
          window.installPromotionBlocked = event.defaultPrevented;
        }, outcome);
        assert.equal(await page.evaluate(() => window.installPromptCalls), 0);
        assert.equal(await page.evaluate(() => window.installPromotionBlocked), false);
        await page.getByRole('button', { name: `Instalar ${app.name}`, exact: true }).click();
        assert.equal(await page.evaluate(() => window.installPromptCalls), 1);
        await page.getByRole('status').filter({ hasText: outcome === 'accepted' ? 'Instalação solicitada' : 'Instalação cancelada' }).waitFor();
      }
      await page.getByRole('button', { name: `Instalar ${app.name}`, exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'O convite depende do navegador.' }).waitFor();
      assert.notEqual(await page.locator('#install-help').getAttribute('open'), null);
      await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
      assert.equal(await page.getByRole('button', { name: `Instalar ${app.name}`, exact: true }).count(), 0);
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
      await page.goto('/aplicativos/');
      await page.getByText('No iPhone/iPad, primeiro escolha um aplicativo abaixo.', { exact: false }).waitFor();
      await page.getByRole('link', { name: `Instalar ${app.name}`, exact: true }).click();
      const preview = page.getByTestId('ios-app-preview');
      await preview.getByText(app.name, { exact: true }).waitFor();
      assert.equal(await preview.getByRole('img').getAttribute('src'), `/aplicativos/${app.key}/icon-v2-192.png`);
      assert.equal(await page.locator('link[rel="apple-touch-icon"][sizes="180x180"]').getAttribute('href'), `/aplicativos/${app.key}/icon-v2-180.png`);
      assert.equal(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'), app.name);
      assert.equal(await page.title(), app.name);
      assert.equal(await page.locator('#android-instructions').isVisible(), false);
      for (const other of apps.filter(other => other.key !== app.key)) assert.equal(await page.getByText(other.name, { exact: true }).count(), 0);
      assert.equal(await page.locator('#install-help').getAttribute('open'), null);
      await page.screenshot({ path: `tests/product/artifacts/pwa-ios-clean-${app.key}.png`, fullPage: true });
      await page.getByRole('button', { name: `Adicionar ${app.name}`, exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'No Safari, use Compartilhar' }).waitFor();
      assert.match(await page.getByRole('status').innerText(), new RegExp(app.name));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `tests/product/artifacts/pwa-ios-${app.key}.png`, fullPage: true });
      await page.locator('a.back').click();
      await page.getByRole('heading', { name: 'Escolha seu aplicativo' }).waitFor();
    }
  } finally { await ios.close(); }
  const ipad = await browser.newContext({ baseURL, viewport: { width: 768, height: 1024 } });
  try {
    await ipad.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
    });
    const page = await ipad.newPage();
    await page.goto('/painel-lojista/instalar/');
    await page.getByRole('button', { name: 'Adicionar Rebequi Vendas', exact: true }).waitFor();
    assert.equal(await page.locator('#android-instructions').isVisible(), false);
    await page.getByRole('button', { name: 'Adicionar Rebequi Vendas', exact: true }).click();
    assert.equal(await page.locator('#ios-instructions').isVisible(), true);
  } finally { await ipad.close(); }
}
