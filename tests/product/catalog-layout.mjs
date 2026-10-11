import assert from 'node:assert/strict';

export async function validateCatalogLayout(browser, baseURL) {
  const category = { id: 'layout-category', name: 'Ferramentas', slug: 'ferramentas', isActive: true };
  const products = Array.from({ length: 4 }, (_, index) => ({
    id: `layout-product-${index}`, slug: `layout-product-${index}`,
    name: index ? 'Furadeira profissional' : 'Ferramenta profissional para acabamento e manutenção com nome bastante longo',
    price: 1999.99, originalPrice: 2499.99, stock: 10, category,
    images: [{ url: `${baseURL}/layout-image-${index}.png`, isPrimary: true }],
  }));
  for (const width of [320, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    try {
      const page = await context.newPage();
      let releaseImages;
      const imagesReady = new Promise(resolve => { releaseImages = resolve; });
      await page.route('**/layout-image-*', async route => { await imagesReady; await route.abort(); });
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (!path.startsWith('/api/')) return route.continue();
        if (path === '/api/auth/me') return route.fulfill({ status: 401, json: { success: false } });
        if (path.startsWith('/api/products')) return route.fulfill({ json: { success: true, data: products, pagination: { total: 4, totalPages: 1, page: 1, limit: 24 } } });
        return route.fulfill({ json: { success: true, data: path.includes('/categories/slug/') ? category : [] } });
      });
      for (const path of ['/categorias/ferramentas', '/buscar?termo=ferramenta']) {
        await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
        const cards = page.locator('[data-ui="product-card"]');
        await cards.first().waitFor();
        if (path.startsWith('/categorias/')) {
          assert.equal(await page.getByText('Slug', { exact: true }).count(), 0);
          const position = await cards.first().boundingBox();
          assert.ok(position.y < 520, `Products appear near the top at ${width}px`);
        }
        await cards.first().scrollIntoViewIfNeeded();
        assert.equal(await cards.count(), 4);
        const before = await cards.first().boundingBox();
        assert.ok(before.height < 420, `Compact card while loading: ${path} at ${width}px`);
        if (width < 640) {
          const second = await cards.nth(1).boundingBox();
          assert.ok(Math.abs(before.y - second.y) < 2, 'Two products share each mobile row');
        }
        releaseImages();
        await cards.first().getByRole('img', { name: /^Imagem indisponível:/ }).waitFor();
        const after = await cards.first().boundingBox();
        assert.ok(Math.abs(before.height - after.height) < 2, 'Failed image does not increase or collapse card height');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path} overflow at ${width}px`);
        assert.equal(await cards.first().evaluate(card => card.scrollWidth > card.clientWidth + 1), false, 'Card content stays within its width');
      }
    } finally { await context.close(); }
  }
}
