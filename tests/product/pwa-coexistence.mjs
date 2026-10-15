import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Uses real Chromium install events and installed apps in a disposable profile.
// Run with a desktop session (or xvfb-run on Linux). No business data is changed.
export async function validatePwaCoexistence(baseURL) {
  const context = await chromium.launchPersistentContext(await mkdtemp(join(tmpdir(), 'rebequi-pwa-coexistence-')), { headless: false });
  const installed = [];
  const origin = new URL(baseURL).origin;
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const install = async (manifestId, installUrlOrBundleUrl) => {
    console.log(`Installing ${manifestId}`);
    let timer;
    try {
      await Promise.race([
        cdp.send('PWA.install', { manifestId, installUrlOrBundleUrl }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Installation timed out: ${manifestId}`)), 20000); }),
      ]);
      installed.push(manifestId);
    } finally { clearTimeout(timer); }
  };
  try {
    await page.goto(`${origin}/loja/`);
    await install(`${origin}/`, `${origin}/loja/`);
    await context.addInitScript(() => {
      window.nativeInstall = { received: false, called: false };
      window.addEventListener('beforeinstallprompt', event => {
        window.nativeInstall.received = event.isTrusted;
        const prompt = event.prompt.bind(event);
        event.prompt = () => { window.nativeInstall.called = true; return prompt(); };
      });
    });
    for (const [path, id] of [
      ['/apps/cliente', '/aplicativos/cliente'],
      ['/apps/vendas', '/aplicativos/vendedor'],
      ['/apps/entregas', '/painel-lojista/painel/entregas'],
    ]) {
      const promptPage = await context.newPage();
      try {
        await promptPage.goto(`${origin}${path}/instalar/`);
        await promptPage.waitForFunction(() => window.nativeInstall.received, undefined, { timeout: 15000 });
        const promptCdp = await context.newCDPSession(promptPage);
        assert.deepEqual((await promptCdp.send('Page.getInstallabilityErrors')).installabilityErrors, []);
        await promptPage.locator('#install').click();
        assert.equal(await promptPage.evaluate(() => window.nativeInstall.called), true);
      } finally { await promptPage.close(); }
      // Programmatic test installation replaces confirmation by a person; this
      // does not claim an Android WebAPK download or a physical-device test.
      await install(origin + id, `${origin}${path}/instalar/`);
      console.log(`${path}: trusted install event, button prompt and installation passed`);
    }
    assert.equal(installed.length, 4);
    console.log('Store, customer, sales and deliveries coexist in the same profile.');
  } finally {
    for (const manifestId of installed.reverse()) await cdp.send('PWA.uninstall', { manifestId }).catch(() => {});
    await context.close();
  }
}

if (process.argv[2]) await validatePwaCoexistence(process.argv[2]);
