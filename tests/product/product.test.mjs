import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium, request } from 'playwright';

// Mutating validation is confined to a disposable, GitHub-hosted runner.
if (process.env.CI !== 'true' || process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') {
  throw new Error('Product tests may only mutate the isolated GitHub-hosted integration database.');
}
const baseURL = 'http://127.0.0.1:3190';
await mkdir(new URL('./artifacts/', import.meta.url), { recursive: true });
const browser = await chromium.launch();
const contexts = [];
let adminCookies;
async function authenticateAdminContext(context) {
  if (!adminCookies) {
    const admin = await client();
    await data(await admin.post('/api/auth/login', { data: { identifier: 'integration@example.invalid', password: 'integration-only-admin-password' } }));
    adminCookies = (await admin.storageState()).cookies;
  }
  await context.addCookies(adminCookies);
}
async function client() {
  const context = await request.newContext({ baseURL }); contexts.push(context); return context;
}
async function data(response, status = 200) {
  assert.equal(response.status(), status, await response.text());
  const body = await response.json(); assert.equal(body.success, true); return body.data;
}
function db(code) {
  return execFileSync('docker', ['exec', 'rebequi-api', 'node', '--input-type=module', '-e',
    `import {prisma} from './apps/backend/dist/lib/prisma.js'; try { ${code} } finally { await prisma.$disconnect(); }`], { encoding: 'utf8' });
}
let account, order, product, owner, anonymous;

test('Real accounts, ownership, drafts, database rollback and responsive customer flows', { timeout: 240000 }, async (t) => {
  try {
    anonymous = await client(); owner = await client();
    const products = await data(await anonymous.get('/api/products?limit=100'));
    product = products.find ? products.find((p) => p.isActive && p.stock > 5)
      : products.products?.find((p) => p.isActive && p.stock > 5);
    // The public endpoint normally returns the paginated data array.
    assert.ok(product, 'Bootstrap must provide a real in-stock product');
    account = await data(await owner.post('/api/orders/public/checkout', { data: {
      name: 'Cliente Produto', whatsapp: '11987654321', items: [{ productId: product.id, quantity: 2 }],
    } }), 201);
    order = account.order;
    assert.ok(account.provisionalCredentials.password.length >= 16);

    await t.test('Anonymous requests cannot claim existing customers or modify their orders', async () => {
      const draft = await data(await anonymous.post('/api/quotes/public/manual', { data: { text: '5 sacos cimento\n10 tijolos' } }), 201);
      assert.equal(draft.quote.items[0].quantity, 5);
      assert.equal(draft.quote.items[1].quantity, 10);
      const denied = await anonymous.post('/api/quotes/public/anonymous/submit', { data: {
        token: draft.token, whatsapp: '11987654321', name: 'Intruso', items: [{ name: 'Cimento', quantity: 5 }],
      } });
      assert.equal(denied.status(), 409);
      assert.ok((await denied.text()).includes('LOGIN_REQUIRED'));
      assert.equal((await anonymous.get('/api/auth/me')).status(), 401);
      assert.equal((await data(await anonymous.get(`/api/quotes/public/anonymous/${draft.token}`))).status, 'DRAFT');
      assert.equal((await anonymous.post(`/api/orders/public/${order.id}/whatsapp-redirected`)).status(), 401);
      assert.equal((await anonymous.post('/api/quotes/public/document')).status(), 401);
      const stranger = await client();
      await data(await stranger.post('/api/orders/public/checkout', { data: {
        name: 'Outro Cliente', whatsapp: '11987654322', items: [{ productId: product.id, quantity: 1 }],
      } }), 201);
      assert.equal((await stranger.post(`/api/orders/public/${order.id}/whatsapp-redirected`)).status(), 404);
      assert.equal((await stranger.post('/api/quotes/public/anonymous/submit', { data: {
        token: draft.token, whatsapp: '11987654321', items: [{ name: 'Cimento', quantity: 5 }],
      } })).status(), 409);
      db(`await prisma.customerOrder.update({where:{id:${JSON.stringify(order.id)}},data:{internalNotes:'Somente a equipe'}});`);
      const own = await data(await owner.get('/api/orders/me'));
      assert.equal(own[0].internalNotes, undefined);
      await data(await owner.post(`/api/orders/public/${order.id}/whatsapp-redirected`));
    });

    await t.test('Current account status and permissions invalidate old sessions', async () => {
      const id = account.user.id;
      db(`await prisma.user.update({where:{id:${JSON.stringify(id)}},data:{isActive:false}});`);
      assert.equal((await owner.get('/api/auth/me')).status(), 401);
      db(`await prisma.user.update({where:{id:${JSON.stringify(id)}},data:{isActive:true,role:'MANAGER'}});`);
      assert.equal((await owner.get('/api/orders/me')).status(), 403);
      db(`await prisma.user.update({where:{id:${JSON.stringify(id)}},data:{role:'CUSTOMER'}});`);
      await data(await owner.get('/api/auth/me'));
    });

    await t.test('Chinese AI configuration protects keys, validates limits and keeps manual fallback', async () => {
      const admin = await client();
      await data(await admin.post('/api/auth/login', { data: { identifier: 'integration@example.invalid', password: 'integration-only-admin-password' } }));
      adminCookies = (await admin.storageState()).cookies;
      assert.equal((await owner.get('/api/integrations/ai')).status(), 403);
      const secret = 'integration-only-fake-provider-key';
      const configured = await data(await admin.put('/api/integrations/ai', { data: { enabled: false, primaryProvider: 'qwen', qwenApiKey: secret, maxTokens: 2500 } }));
      assert.equal(configured.hasQwenApiKey, true);
      assert.equal(JSON.stringify(configured).includes(secret), false);
      assert.equal(Object.hasOwn(configured, 'qwenApiKey'), false);
      db(`const row=await prisma.setting.findUnique({where:{key:'quoteAi.qwenApiKey'}}); if(!row.isSecret || row.value===${JSON.stringify(secret)}) throw new Error('Provider key is not encrypted');`);
      assert.equal((await admin.put('/api/integrations/ai', { data: { maxTokens: 9000 } })).status(), 400);
      assert.equal((await admin.put('/api/integrations/ai', { data: { endpoint: 'http://arbitrary.invalid' } })).status(), 400);
      await data(await admin.put('/api/integrations/ai', { data: { qwenApiKey: null, deepseekApiKey: null, primaryProvider: 'deepseek', enabled: false } }));
      const health = await data(await admin.get('/api/quotes/admin/ocr-health'));
      assert.equal(health.unavailable, true); assert.equal(Object.hasOwn(health, 'local'), false);
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        await authenticateAdminContext(context);
        const page = await context.newPage(); await page.goto(baseURL + '/painel-lojista/painel/integrações');
        await page.getByRole('heading', { name: '1. Conectar os provedores' }).waitFor();
        await page.getByRole('heading', { name: '3. Testar uma lista real' }).waitFor();
        assert.equal(await page.locator('#key-deepseek').getAttribute('type'), 'password');
        // Only provider transport is simulated; production keys are never used in CI.
        const savedConfig = await data(await admin.get('/api/integrations/ai'));
        await page.route('**/api/integrations/ai', route => route.fulfill({ json: { success: true, data: { ...savedConfig, hasDeepseekApiKey: true } } }));
        let providerOk = true;
        await page.route('**/api/integrations/ai/test', async route => {
          await new Promise(resolve => setTimeout(resolve, 700));
          await route.fulfill({ json: { success: true, data: { ok: providerOk, message: providerOk ? 'Conexão validada no teste.' : 'Confira a chave do provedor.' } } });
        });
        await page.reload();
        const card = page.locator('#key-deepseek').locator('..');
        await card.getByRole('button', { name: 'Testar conexão', exact: true }).click();
        await card.getByRole('button', { name: 'Testando…', exact: true }).waitFor();
        await card.getByTestId('connection-result-deepseek').waitFor();
        assert.equal(await card.getByTestId('connection-result-deepseek').getAttribute('role'), 'status');
        assert.match(await card.innerText(), /Conexão validada no teste/);
        providerOk = false;
        await card.getByRole('button', { name: 'Testar conexão', exact: true }).click();
        await card.getByRole('alert').waitFor();
        assert.match(await card.getByRole('alert').innerText(), /Confira a chave/);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      } finally { await context.close(); }
    });

    await t.test('Cloud quote extraction persists items, matching and telemetry end to end with mocked provider transport', async () => {
      const draft = await data(await anonymous.post('/api/quotes/public/manual', { data: { text: '2 cimento' } }), 201);
      db(`const {QuoteService}=await import('./apps/backend/dist/services/quote.service.js');
        const {QuoteOcrService}=await import('./apps/backend/dist/services/quote-ocr.service.js');
        const sharp=(await import('sharp')).default;
        const id=${JSON.stringify(draft.quote.id)};
        await prisma.quoteItem.deleteMany({where:{quoteRequestId:id}});
        await prisma.quoteRequest.update({where:{id},data:{ocrStatus:'PENDING'}});
        const quoteService=new QuoteService();
        quoteService.ocrService=new QuoteOcrService({settings:{getAiRuntime:async()=>({enabled:true,primaryProvider:'deepseek',fallbackEnabled:false,deepseekModel:'deepseek-flash',qwenModel:'qwen3-vl-flash',deepseekApiKey:'mock-key-not-real',qwenApiKey:null,timeoutMs:10000,maxTokens:2500})},fetch:async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({tipo_documento:'impresso',itens:[{produto:'Cimento Portland CP II 50kg',quantidade:2,unidade:'sc',confianca:0.9,texto_original:'2 sc cimento'}]})}}],usage:{prompt_tokens:600,completion_tokens:100}})});
        await quoteService.runOcrJob({quoteId:id,imageBuffer:await sharp({create:{width:32,height:32,channels:3,background:'white'}}).png().toBuffer()});
        const saved=await prisma.quoteRequest.findUnique({where:{id},include:{items:true}});
        if(saved.ocrStatus!=='COMPLETED' || saved.items.length!==1 || saved.items[0].quantity!==2 || !saved.items[0].productId) throw new Error('Cloud pipeline did not persist a matched quote');
        const run=await prisma.ocrRun.findFirst({where:{quoteRequestId:id}});
        if(run.engine!=='deepseek' || run.promptTokens!==600) throw new Error('Cloud telemetry was not persisted');`);
      const saved = await data(await anonymous.get('/api/quotes/public/anonymous/' + draft.token));
      assert.equal(saved.ocrStatus, 'COMPLETED'); assert.equal(saved.items[0].quantity, 2);
    });

    await t.test('Failed item replacement rolls back without deleting the saved draft', async () => {
      const draft = await data(await anonymous.post('/api/quotes/public/manual', { data: { text: '2 cimento' } }), 201);
      db(`const {QuoteRepository}=await import('./apps/backend/dist/repositories/quote.repository.js');
        const id=${JSON.stringify(draft.quote.id)};
        const before=await prisma.quoteItem.findMany({where:{quoteRequestId:id}});
        let rejected=false; try {await new QuoteRepository().replaceQuoteItems(id,[{quoteRequestId:id,name:'Invalid',quantity:1,productId:'missing-product'}]);} catch {rejected=true;}
        if(!rejected) throw new Error('Invalid foreign key accepted');
        const after=await prisma.quoteItem.findMany({where:{quoteRequestId:id}});
        if(JSON.stringify(before)!==JSON.stringify(after)) throw new Error('Draft lost after failed replacement');
        const repository=new QuoteRepository();
        await repository.finishOcr(id,{ocrStatus:'COMPLETED'},[{quoteRequestId:id,name:'Late OCR',quantity:99}],'Late title',null);
        await repository.failOcr(id,'Late failure');
        const q=await prisma.quoteRequest.findUnique({where:{id},include:{items:true}});
        if(q.ocrStatus!=='SKIPPED'||q.items[0].id!==before[0].id) throw new Error('Late OCR replaced manual work');`);
      db(`await prisma.quoteRequest.update({where:{id:${JSON.stringify(draft.quote.id)}},data:{anonymousExpiresAt:new Date(0)}});`);
      assert.equal((await anonymous.get(`/api/quotes/public/anonymous/${draft.token}`)).status(), 403);
      assert.equal((await anonymous.put('/api/quotes/public/anonymous', { data: {
        token: draft.token, items: [{ name: 'Overwrite expired', quantity: 1 }],
      } })).status(), 403);
    });

    for (const width of [320, 390, 768, 1024, 1440]) {
      await t.test(`Manual list, database autosave and reload at ${width}px`, async () => {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        try {
          const page = await context.newPage();
          await page.goto(`${baseURL}/pedido`);
          await page.getByRole('button', { name: 'Digitar lista', exact: true }).click();
          await page.getByLabel('Lista de produtos, um por linha').fill('5 sacos cimento\n10 tijolos');
          await page.getByRole('button', { name: 'Continuar com 2 itens' }).click();
          await page.getByText('Rascunho salvo', { exact: true }).waitFor();
          const saved = page.waitForResponse((response) => response.url().endsWith('/api/quotes/public/anonymous') && response.request().method() === 'PUT' && response.status() === 200);
          await page.getByRole('button', { name: 'Aumentar', exact: true }).first().click();
          await saved;
          await page.getByText('Rascunho salvo', { exact: true }).waitFor();
          const backup = await page.evaluate(() => Object.values(localStorage).map((v) => {
            try { return JSON.parse(v); } catch { return null; }
          }).find((v) => v?.token && v?.items));
          assert.ok(backup?.token);
          const persisted = await data(await anonymous.get(`/api/quotes/public/anonymous/${backup.token}`));
          assert.equal(persisted.items[0].quantity, 6);
          await page.reload();
          await page.getByText('Rascunho salvo', { exact: true }).waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Horizontal overflow');
          assert.equal(await page.getByRole('button', { name: 'Aumentar', exact: true }).first().locator('..').locator('span').innerText(), '6');
          await page.screenshot({ path: new URL(`./artifacts/manual-${width}.png`, import.meta.url).pathname, fullPage: true });
        } finally { await context.close(); }
      });
    }

    await t.test('Customer order history and repeat purchase use the real catalog', async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
      try {
        await data(await context.request.post(`${baseURL}/api/auth/login`, { data: {
          identifier: '11987654321', password: account.provisionalCredentials.password,
        } }));
        const page = await context.newPage();
        await page.goto(`${baseURL}/painel-cliente?tab=orders&orderId=${order.id}`);
        await page.getByRole('heading', { name: `Pedido ${order.referenceCode}` }).waitFor();
        assert.equal(await page.getByText('Somente a equipe').count(), 0);
        await page.getByText('Ver itens do pedido', { exact: true }).click();
        await page.getByText(product.name, { exact: false }).first().waitFor();
        await page.screenshot({ path: new URL('./artifacts/orders-mobile.png', import.meta.url).pathname, fullPage: true });
        const resume = page.getByRole('link', { name: 'Retomar no WhatsApp' });
        assert.ok((await resume.getAttribute('href')).startsWith('https://'));
        await page.getByRole('button', { name: 'Adicionar itens ao carrinho' }).click();
        await page.waitForURL('**/carrinho');
        await page.getByText(product.name, { exact: false }).first().waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      } finally { await context.close(); }
    });

    await t.test('Authenticated quote prefill, submission and editor refresh preserve user work', async () => {
      const context = await browser.newContext({ viewport: { width: 768, height: 900 } });
      try {
        await data(await context.request.post(`${baseURL}/api/auth/login`, { data: {
          identifier: '11987654321', password: account.provisionalCredentials.password,
        } }));
        const draft = await data(await context.request.post(`${baseURL}/api/quotes/public/manual`, { data: { text: '3 cimento' } }), 201);
        db(`await prisma.quoteRequest.update({where:{id:${JSON.stringify(draft.quote.id)}},data:{userId:${JSON.stringify(account.user.id)},anonymousToken:null,anonymousExpiresAt:null}});`);
        const page = await context.newPage();
        await page.goto(`${baseURL}/painel-cliente?tab=quotes&quoteId=${draft.quote.id}`);
        await page.getByLabel('Título', { exact: true }).fill('Minha edição preservada');
        const refreshed = page.waitForResponse((r) => r.url().endsWith('/api/quotes/me') && r.status() === 200, { timeout: 45000 });
        await refreshed; // Actual 30-second polling request, no intercepted API.
        assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Minha edição preservada');
        await page.goto(`${baseURL}/pedido`);
        await page.getByRole('button', { name: 'Digitar lista', exact: true }).click();
        await page.getByLabel('Lista de produtos, um por linha').fill('2 cimento');
        await page.getByRole('button', { name: 'Continuar com 1 item' }).click();
        await page.getByText('Rascunho salvo', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Nome', { exact: false }).inputValue(), 'Cliente Produto');
        assert.ok((await page.getByLabel('Seu WhatsApp').inputValue()).replace(/\D/g, '').endsWith('11987654321'));
        await page.getByRole('button', { name: 'Enviar 1 item para a loja' }).click();
        await page.getByRole('heading', { name: 'Pronto, lista enviada!' }).waitFor();
      } finally { await context.close(); }
    });

    await t.test('Reference landing remains responsive and adds real products to the cart', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {
        const page = await context.newPage();
        await page.goto(baseURL);
        await page.locator('.landing-product').first().waitFor();
        for (const width of [320, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Landing overflow at ${width}px`);
          await page.screenshot({ path: `tests/product/artifacts/landing-${width}.png`, fullPage: true });
        }
        const card = page.locator('.landing-product').filter({ has: page.getByRole('button', { name: 'Adicionar', exact: true }) }).first();
        await card.getByRole('button', { name: /^Aumentar quantidade/ }).click();
        await card.getByRole('button', { name: 'Adicionar', exact: true }).click();
        await page.getByRole('link', { name: 'Ver carrinho, 2 itens' }).waitFor();
        await page.getByRole('link', { name: 'Ver carrinho, 2 itens' }).click();
        await page.waitForURL('**/carrinho');
        await page.getByRole('link', { name: 'Seguir para o checkout', exact: true }).waitFor();
      } finally { await context.close(); }
    });

    await t.test('Store and authentication pages share the landing design at mobile and desktop sizes', async () => {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        for (const route of ['/login', '/registrar', '/painel-lojista']) {
          await page.goto(`${baseURL}${route}`);
          await page.locator('.design-auth-header').waitFor();
          for (const width of [320, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflow at ${width}px`);
          }
        }
        await authenticateAdminContext(context);
        for (const route of ['/categorias', '/categorias/ferramentas', `/produto/${product.slug}`, '/promoções', '/novidades', '/buscar?q=cimento', '/contato', '/carrinho', '/checkout']) {
          await page.goto(`${baseURL}${route}`);
          await page.locator('.landing-header').waitFor();
          await page.waitForTimeout(250);
          for (const width of [320, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflow at ${width}px`);
          }
          assert.equal(await page.locator('.landing-header .landing-logo img').getAttribute('alt'), 'Rebequi');
          if (['/carrinho', '/checkout'].includes(route)) assert.equal(await page.locator('.landing-mobile-cart').count(), 0);
        }
      } finally { await context.close(); }
    });

    await t.test('Shared dashboards group account settings and guide product editing in three steps', async () => {
      const context = await browser.newContext();
      try {
        await data(await context.request.post(`${baseURL}/api/auth/login`, { data: { identifier: '11987654321', password: account.provisionalCredentials.password } }));
        const page = await context.newPage();
        await page.goto(`${baseURL}/painel-cliente`);
        await page.locator('.dashboard-heading').waitFor();
        for (const width of [320, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Customer dashboard overflow at ${width}px`);
          await page.screenshot({ path: new URL(`./artifacts/customer-dashboard-${width}.png`, import.meta.url).pathname, fullPage: true });
        }
        await page.getByRole('button', { name: /^Minha conta/ }).click();
        await page.getByRole('button', { name: 'Senha e acesso', exact: true }).click();
        await page.getByLabel('Nova senha', { exact: true }).waitFor();
        assert.equal(await page.locator('.dashboard-nav-action[aria-current="page"]').innerText(), await page.locator('.dashboard-nav-action').filter({ hasText: 'Minha conta' }).innerText());
        await page.reload();
        await page.getByLabel('Nova senha', { exact: true }).waitFor();
        await authenticateAdminContext(context);
        await page.goto(`${baseURL}/painel-lojista/painel/produtos/${product.id}/editar`);
        await page.getByLabel('Nome', { exact: true }).waitFor();
        await page.getByLabel('Nome', { exact: true }).fill('Edição local não salva');
        const steps = page.getByRole('navigation', { name: 'Em 3 passos', exact: true });
        await steps.getByRole('button', { name: /Fotos$/ }).click();
        assert.equal(await page.locator('#product-images').evaluate((element) => document.activeElement === element), true);
        await steps.getByRole('button', { name: /Publicar$/ }).click();
        assert.equal(await page.locator('#product-publish').evaluate((element) => document.activeElement === element), true);
        await steps.getByRole('button', { name: /Dados$/ }).click();
        assert.equal(await page.getByLabel('Nome', { exact: true }).inputValue(), 'Edição local não salva');
        for (const width of [320, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Product editor overflow at ${width}px`);
          await page.screenshot({ path: new URL(`./artifacts/admin-editor-${width}.png`, import.meta.url).pathname, fullPage: true });
        }
      } finally { await context.close(); }
    });

    await t.test('Dashboard lists clear filters, recover from errors and fit every viewport', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
      try {
        await authenticateAdminContext(context);
        const page = await context.newPage();
        for (const route of ['produtos', 'produtos/categorias', 'clientes', 'pedidos', 'vendas', 'promoções', 'acesso', 'orçamentos']) {
          await page.goto(`${baseURL}/painel-lojista/painel/${route}`);
          await page.locator('.dashboard-heading').waitFor();
          await page.waitForTimeout(400);
          for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${route} overflow at ${width}px`);
          }
          if (route !== 'orçamentos') {
            const search = page.getByRole('searchbox');
            await search.fill('zz-no-matching-record-ux');
            await page.getByRole('button', { name: 'Limpar busca', exact: true }).click();
            assert.equal(await search.inputValue(), '');
            assert.equal(await search.evaluate((element) => element === document.activeElement), true);
          } else {
            await page.setViewportSize({ width: 390, height: 900 });
            await page.locator('.dashboard-selection').first().click();
            assert.equal(await page.locator('#merchant-quote-detail').evaluate((element) => element === document.activeElement), true);
          }
        }
        await page.goto(`${baseURL}/painel-lojista/painel/produtos`);
        await page.locator('.dashboard-catalog-record').first().waitFor();
        assert.equal(await page.locator('.dashboard-catalog-record').count(), 12);
        const firstProduct = await page.locator('.dashboard-catalog-record h3').first().innerText();
        await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
        await page.getByText(/Página 2 de/).waitFor();
        assert.notEqual(await page.locator('.dashboard-catalog-record h3').first().innerText(), firstProduct);
        await page.getByRole('searchbox').fill('zz-no-matching-record-ux');
        await page.getByRole('button', { name: 'Limpar filtros', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
        assert.equal(await page.getByRole('searchbox').inputValue(), '');
        await page.locator('article').first().waitFor();
        await page.getByText(/Página 1 de/).waitFor();
        await page.getByRole('button', { name: /^Mais ações para / }).first().click();
        await page.getByRole('menuitem', { name: 'Excluir produto', exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.route('**/api/products/admin/list*', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Integration test outage' }) }));
        await page.reload();
        await page.getByRole('alert').filter({ hasText: 'Não foi possível carregar produtos.' }).waitFor({ timeout: 30000 });
        assert.equal(await page.getByText('Nenhum resultado encontrado', { exact: true }).count(), 0);
        await page.unroute('**/api/products/admin/list*');
        await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
        await page.locator('article').first().waitFor();
        await page.screenshot({ path: new URL('./artifacts/admin-list-1440.png', import.meta.url).pathname, fullPage: true });
        await page.setViewportSize({ width: 390, height: 900 });
        await page.screenshot({ path: new URL('./artifacts/admin-list-390.png', import.meta.url).pathname, fullPage: true });
      } finally { await context.close(); }
    });

    await t.test('Catalog alert opens the exact product editor', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {
        db(`await prisma.productImage.deleteMany({where:{productId:${JSON.stringify(product.id)}}});
          await prisma.product.update({where:{id:${JSON.stringify(product.id)}},data:{stock:0,description:null,shortDesc:null,sku:null}});`);
        await authenticateAdminContext(context);
        const page = await context.newPage();
        await page.goto(`${baseURL}/painel-lojista/painel`);
        const link = page.getByRole('link', { name: `Corrigir ${product.name}`, exact: true });
        await link.waitFor();
        assert.ok((await link.getAttribute('href')).endsWith(`/produtos/${product.id}/editar`));
        await link.click();
        await page.waitForURL(`**/produtos/${product.id}/editar`);
        assert.equal(await page.locator('.design-workspace header.sticky').evaluate((header) => getComputedStyle(header).backgroundColor), 'rgb(255, 235, 24)');
      } finally { await context.close(); }
    });
  } finally {
    await browser.close();
    await Promise.all(contexts.map((context) => context.dispose()));
  }
});
