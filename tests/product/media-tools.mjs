import assert from 'node:assert/strict';

export async function validateMediaTools(browser, baseURL) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  try {
    const page = await context.newPage();
    let role = 'ADMIN'; let uploads = 0; let savedCategory;
    await page.route('**/api/**', async route => {
      const request = route.request(); const path = new URL(request.url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: { id: 'media-test', name: 'Media Test', role, whatsapp: '11912345678', isActive: true } } });
      if (path === '/api/categories/images/upload') {
        uploads++;
        const multipart = request.postDataBuffer().toString('latin1');
        assert.ok(multipart.includes('image/webp')); assert.ok(multipart.includes('.webp'));
        return route.fulfill({ status: 201, json: { success: true, data: { url: '/uploads/categories/test.webp' } } });
      }
      if (path === '/api/categories' && request.method() === 'POST') {
        savedCategory = request.postDataJSON();
        return route.fulfill({ status: 201, json: { success: true, data: { ...savedCategory, id: 'category-test' } } });
      }
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto(`${baseURL}/painel-lojista/painel/produtos/categorias/nova`);
    await page.getByLabel('Nome', { exact: true }).fill('Categoria com imagem');
    const encoded = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1200; canvas.getContext('2d').fillRect(0, 0, 2400, 1200); return canvas.toDataURL('image/png').split(',')[1]; });
    const png = { name: 'selected.png', mimeType: 'image/png', buffer: Buffer.from(encoded, 'base64') };
    await page.getByLabel('Imagem da categoria', { exact: true }).setInputFiles(png);
    await page.getByRole('dialog', { name: 'Recortar imagem' }).waitFor();
    await page.getByRole('button', { name: 'Usar imagem recortada', exact: true }).click();
    await page.getByAltText('Prévia da categoria').waitFor();
    assert.equal(await page.getByAltText('Prévia da categoria').evaluate(img => img.naturalWidth), 800);
    assert.equal(uploads, 0, 'Local cropping does not write to the VPS');
    await page.getByRole('button', { name: 'Cadastrar categoria', exact: true }).click();
    await page.waitForURL('**/painel-lojista/painel/produtos');
    assert.equal(uploads, 1); assert.equal(savedCategory.image, '/uploads/categories/test.webp');

    role = 'CUSTOMER';
    await page.goto(`${baseURL}/pedido`);
    await page.getByRole('button', { name: 'Tirar foto da lista', exact: true }).click();
    await page.getByRole('button', { name: 'Tirar foto', exact: true }).waitFor();
    await page.getByLabel('Escolher foto da galeria', { exact: true }).setInputFiles(png);
    await page.getByRole('heading', { name: 'Confira a foto', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Recortar foto', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Recortar imagem' });
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Usar imagem recortada', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('heading', { name: 'Confira a foto', exact: true }).waitFor();
    assert.equal(await page.getByAltText('Prévia da lista fotografada').evaluate(img => img.naturalWidth), 1800);
    assert.equal(await page.getByAltText('Prévia da lista fotografada').evaluate(img => img.naturalHeight), 900, 'Initial crop preserves the full document');
    assert.equal(uploads, 1, 'Document cropping does not upload or call paid AI');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally { await context.close(); }
}
