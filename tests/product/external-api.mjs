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
  const existingCustomer = JSON.parse(db(`console.log(JSON.stringify(await prisma.user.findFirstOrThrow({where:{role:'CUSTOMER',isActive:true,email:{contains:'@'}},select:{id:true,email:true,whatsapp:true}})));`).trim());
  const customerRows = [
    { externalId: 'known-customer', name: 'Cliente existente', email: existingCustomer.email },
    { externalId: 'new-customer', name: 'Cliente novo', email: `import-${randomUUID()}@example.invalid` },
  ];
  const customerInput = { source: 'pdv-runner', rows: customerRows };
  const customerPath = '/api/integrations/external-api/imports/customers/preview';
  assert.equal((await owner.post(customerPath, { headers, data: customerInput })).status(), 403);
  assert.equal((await admin.post(customerPath, { data: customerInput })).status(), 403);
  assert.equal((await admin.post(customerPath, { headers, data: { ...customerInput, apply: true } })).status(), 400);
  const customerResponse = await admin.post(customerPath, { headers, data: customerInput });
  const customerPreview = await data(customerResponse);
  assert.match(customerResponse.headers()['cache-control'], /no-store/);
  assert.deepEqual(customerPreview.rows[0].conflicts, ['LOCAL_CUSTOMER_EXISTS']);
  assert.equal(customerPreview.rows[0].localCustomerId, existingCustomer.id);
  assert.equal(customerPreview.rows[1].status, 'READY_FOR_REVIEW');
  assert.equal(JSON.stringify(customerPreview).includes(existingCustomer.email), false);
  assert.equal(Number(db(`console.log(await prisma.user.count({where:{email:${JSON.stringify(customerRows[1].email)}}}));`).trim()), 0);
  const customerLinksPath = '/api/integrations/external-api/imports/customers/links';
  const customerLinkInput = { requestKey: randomUUID(), source: customerInput.source, externalId: customerRows[0].externalId,
    customerId: existingCustomer.id, expectedEmail: existingCustomer.email, confirmed: true };
  assert.equal((await owner.post(customerLinksPath, { headers, data: customerLinkInput })).status(), 403);
  assert.equal((await admin.post(customerLinksPath, { data: customerLinkInput })).status(), 403);
  const customerLink = await data(await admin.post(customerLinksPath, { headers, data: customerLinkInput }), 201);
  assert.equal(customerLink.customerId, existingCustomer.id);
  assert.deepEqual(await data(await admin.post(customerLinksPath, { headers, data: customerLinkInput }), 201), customerLink);
  assert.equal((await admin.post(customerLinksPath, { headers, data: { ...customerLinkInput, requestKey: randomUUID() } })).status(), 409);
  assert.equal((await admin.post(customerLinksPath, { headers, data: { ...customerLinkInput, requestKey: randomUUID(), expectedEmail: 'wrong@example.invalid' } })).status(), 409);
  assert.equal((await data(await admin.post(customerPath, { headers, data: customerInput }))).rows[0].status, 'LINKED_REVIEW');
  assert.equal((await data(await admin.get(`${customerLinksPath}?page=1`))).links.some(row => row.id === customerLink.id), true);
  await data(await admin.post(`${customerLinksPath}/${customerLink.id}/revoke`, { headers, data: { confirmed: true, reason: 'Revisão isolada do runner' } }));
  assert.deepEqual((await data(await admin.post(customerPath, { headers, data: customerInput }))).rows[0].conflicts, ['LOCAL_CUSTOMER_EXISTS']);
  const blockedCustomerMutation = JSON.parse(db(`let blocked=false;try{await prisma.externalCustomerLink.delete({where:{id:${JSON.stringify(customerLink.id)}}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1));
  assert.equal(blockedCustomerMutation.blocked, true);
  const importPath = '/api/integrations/external-api/imports/products/preview';
  const batchesPath = '/api/integrations/external-api/imports/products/batches';
  const catalog = JSON.parse(db(`console.log(JSON.stringify(await prisma.product.findFirstOrThrow({where:{sku:{not:null},deletedAt:null,category:{isActive:true,deletedAt:null}},select:{id:true,sku:true,categoryId:true,stock:true,reservedStock:true,price:true}})));`).trim());
  const category = JSON.parse(db(`console.log(JSON.stringify(await prisma.category.findUniqueOrThrow({where:{id:${JSON.stringify(catalog.categoryId)}},select:{id:true,slug:true,name:true}})));`).trim());
  const categoryRows = [
    { externalId: 'existing-category', slug: category.slug, name: category.name },
    { externalId: 'new-category', slug: `runner-${randomUUID()}`, name: `Categoria runner ${randomUUID()}` },
  ];
  const categoryInput = { source: 'pdv-runner', rows: categoryRows };
  const categoryPreviewPath = '/api/integrations/external-api/imports/categories/preview';
  const categoryLinksPath = '/api/integrations/external-api/imports/categories/links';
  assert.equal((await owner.post(categoryPreviewPath, { headers, data: categoryInput })).status(), 403);
  assert.equal((await admin.post(categoryPreviewPath, { data: categoryInput })).status(), 403);
  const categoryPreview = await data(await admin.post(categoryPreviewPath, { headers, data: categoryInput }));
  assert.equal(categoryPreview.applied, false); assert.equal(categoryPreview.rows[0].localCategoryId, category.id);
  assert.deepEqual(categoryPreview.rows[0].conflicts, ['SLUG_ALREADY_LOCAL']);
  assert.equal(categoryPreview.rows[1].status, 'READY_FOR_REVIEW');
  const categoryLinkInput = { requestKey: randomUUID(), source: categoryInput.source, externalId: categoryRows[0].externalId,
    categoryId: category.id, expectedSlug: category.slug, confirmed: true };
  assert.equal((await owner.post(categoryLinksPath, { headers, data: categoryLinkInput })).status(), 403);
  assert.equal((await admin.post(categoryLinksPath, { data: categoryLinkInput })).status(), 403);
  const categoryLink = await data(await admin.post(categoryLinksPath, { headers, data: categoryLinkInput }), 201);
  assert.equal(categoryLink.categoryId, category.id);
  const linkedProductInput = { source: categoryInput.source, rows: [{ externalId: 'mapped-category-preview', sku: `MAPPED-${randomUUID()}`,
    name: 'Material com categoria vinculada', externalCategoryId: categoryRows[0].externalId, priceCents: '1000', stockQuantity: '5' }] };
  const linkedProductPreview = await data(await admin.post(importPath, { headers, data: linkedProductInput }));
  assert.equal(linkedProductPreview.rows[0].resolvedCategoryId, category.id);
  assert.equal(linkedProductPreview.rows[0].status, 'READY_FOR_REVIEW');
  const mappedBatch = await data(await admin.post(batchesPath, { headers,
    data: { ...linkedProductInput, requestKey: randomUUID(), confirmed: true } }), 201);
  assert.deepEqual((await data(await admin.get(`${batchesPath}/${mappedBatch.id}`))).changedRows, []);
  assert.deepEqual(await data(await admin.post(categoryLinksPath, { headers, data: categoryLinkInput }), 201), categoryLink);
  assert.equal((await admin.post(categoryLinksPath, { headers, data: { ...categoryLinkInput, requestKey: randomUUID() } })).status(), 409);
  assert.equal((await data(await admin.post(categoryPreviewPath, { headers, data: categoryInput }))).rows[0].status, 'LINKED_REVIEW');
  const listedCategories = await data(await admin.get(`${categoryLinksPath}?page=1`));
  assert.equal(listedCategories.links.some(row => row.id === categoryLink.id && row.category.slug === category.slug), true);
  await data(await admin.post(`${categoryLinksPath}/${categoryLink.id}/revoke`, { headers, data: { confirmed: true, reason: 'Revisão isolada do runner' } }));
  const revokedProductPreview = await data(await admin.post(importPath, { headers, data: linkedProductInput }));
  assert.deepEqual(revokedProductPreview.rows[0].conflicts, ['EXTERNAL_CATEGORY_NOT_LINKED']);
  assert.deepEqual((await data(await admin.get(`${batchesPath}/${mappedBatch.id}`))).changedRows, [1]);
  assert.deepEqual((await data(await admin.post(categoryPreviewPath, { headers, data: categoryInput }))).rows[0].conflicts, ['SLUG_ALREADY_LOCAL']);
  const blockedCategoryMutation = JSON.parse(db(`let blocked=false;try{await prisma.externalCategoryLink.delete({where:{id:${JSON.stringify(categoryLink.id)}}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1));
  assert.equal(blockedCategoryMutation.blocked, true);
  const importRows = [
    { externalId: 'existing', sku: catalog.sku, name: 'Material existente', categoryId: catalog.categoryId, priceCents: '1000', stockQuantity: '5' },
    { externalId: 'new', sku: `IMPORT-${randomUUID()}`, name: 'Material novo', categoryId: catalog.categoryId, priceCents: '1000', stockQuantity: '5' },
  ];
  const importInput = { source: 'pdv-runner', rows: importRows };
  assert.equal((await owner.post(importPath, { headers, data: importInput })).status(), 403);
  assert.equal((await guest.post(importPath, { headers, data: importInput })).status(), 401);
  assert.equal((await admin.post(importPath, { data: importInput })).status(), 403);
  assert.equal((await admin.post(importPath, { headers, data: { ...importInput, apply: true } })).status(), 400);
  const importResponse = await admin.post(importPath, { headers, data: importInput });
  const importPreview = await data(importResponse);
  assert.match(importResponse.headers()['cache-control'], /no-store/);
  assert.equal(importPreview.applied, false); assert.equal(importPreview.authority.stock, 'LOCAL');
  assert.deepEqual(importPreview.rows[0].conflicts, ['SKU_ALREADY_LOCAL']);
  assert.equal(importPreview.rows[0].localProductId, catalog.id);
  assert.equal(importPreview.rows[1].status, 'READY_FOR_REVIEW');
  const stageInput = { ...importInput, requestKey: randomUUID(), confirmed: true };
  assert.equal((await owner.post(batchesPath, { headers, data: stageInput })).status(), 403);
  assert.equal((await admin.post(batchesPath, { data: stageInput })).status(), 403);
  const staged = await data(await admin.post(batchesPath, { headers, data: stageInput }), 201);
  assert.equal(staged.applied, false);
  assert.deepEqual(await data(await admin.post(batchesPath, { headers, data: stageInput }), 201), staged);
  assert.equal((await admin.post(batchesPath, { headers, data: { ...stageInput, rows: [importRows[0]] } })).status(), 409);
  const saved = await data(await admin.get(`${batchesPath}?page=1`));
  assert.equal(saved.batches.some(value => value.id === staged.id && value.summary.total === 2 && value.applied === false), true);
  assert.equal(JSON.stringify(saved).includes('priceCents'), false);
  const initialReview = await data(await admin.get(`${batchesPath}/${staged.id}`));
  assert.equal(initialReview.changedRows.length, 0);
  assert.deepEqual(initialReview.savedPreview.rows, initialReview.currentPreview.rows);
  const stagedInDb = JSON.parse(db(`console.log(JSON.stringify(await prisma.externalProductImportBatch.findUniqueOrThrow({where:{id:${JSON.stringify(staged.id)}},select:{rows:true,preview:true,requestKey:true}})));`).trim());
  assert.equal(stagedInDb.rows.length, 2); assert.equal(stagedInDb.preview.applied, false);
  assert.notEqual(stagedInDb.requestKey, stageInput.requestKey);
  const immutableBatch = JSON.parse(db(`let blocked=false;try{await prisma.externalProductImportBatch.delete({where:{id:${JSON.stringify(staged.id)}}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1));
  assert.equal(immutableBatch.blocked, true);
  const linksPath = '/api/integrations/external-api/imports/products/links';
  const linkInput = { requestKey: randomUUID(), source: importInput.source, externalId: importRows[0].externalId,
    productId: catalog.id, expectedSku: catalog.sku, confirmed: true };
  assert.equal((await owner.post(linksPath, { headers, data: linkInput })).status(), 403);
  assert.equal((await admin.post(linksPath, { data: linkInput })).status(), 403);
  const linked = await data(await admin.post(linksPath, { headers, data: linkInput }), 201);
  assert.equal(linked.productId, catalog.id);
  const listedLinks = await data(await admin.get(`${linksPath}?page=1`));
  assert.equal(listedLinks.links.some(value => value.id === linked.id && value.product.sku === catalog.sku && !value.revokedAt), true);
  assert.deepEqual(await data(await admin.post(linksPath, { headers, data: linkInput }), 201), linked);
  assert.equal((await admin.post(linksPath, { headers, data: { ...linkInput, productId: 'other' } })).status(), 409);
  assert.equal((await admin.post(linksPath, { headers, data: { ...linkInput, requestKey: randomUUID() } })).status(), 409);
  const linkedPreview = await data(await admin.post(importPath, { headers, data: importInput }));
  assert.equal(linkedPreview.rows[0].status, 'LINKED_REVIEW');
  assert.deepEqual(linkedPreview.rows[0].conflicts, []);
  const updatedReview = await data(await admin.get(`${batchesPath}/${staged.id}`));
  assert.deepEqual(updatedReview.changedRows, [1]);
  assert.equal(updatedReview.currentPreview.rows[0].status, 'LINKED_REVIEW');
  const reusedProduct = await data(await admin.post(importPath, { headers, data: { ...importInput,
    rows: [{ ...importRows[0], externalId: 'second-external-id' }] } }));
  assert.deepEqual(reusedProduct.rows[0].conflicts, ['PRODUCT_LINKED_TO_OTHER_ID']);
  const revocation = { confirmed: true, reason: 'Vínculo revogado no teste isolado' };
  const revokePath = `${linksPath}/${linked.id}/revoke`;
  assert.equal((await owner.post(revokePath, { headers, data: revocation })).status(), 403);
  await data(await admin.post(revokePath, { headers, data: revocation }));
  await data(await admin.post(revokePath, { headers, data: revocation }));
  assert.equal((await admin.post(linksPath, { headers, data: linkInput })).status(), 409);
  assert.deepEqual((await data(await admin.post(importPath, { headers, data: importInput }))).rows[0].conflicts, ['SKU_ALREADY_LOCAL']);
  const rebound = await data(await admin.post(linksPath, { headers, data: { ...linkInput, requestKey: randomUUID() } }), 201);
  assert.notEqual(rebound.id, linked.id);
  assert.equal((await data(await admin.post(importPath, { headers, data: importInput }))).rows[0].status, 'LINKED_REVIEW');
  await data(await admin.post(`${linksPath}/${rebound.id}/revoke`, { headers, data: revocation }));
  const blockedMutation = JSON.parse(db(`let blocked=false;try{await prisma.externalProductLink.update({where:{id:${JSON.stringify(linked.id)}},data:{externalId:'rewritten'}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1));
  assert.equal(blockedMutation.blocked, true);
  assert.deepEqual(JSON.parse(db(`console.log(JSON.stringify(await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(catalog.id)}},select:{stock:true,reservedStock:true,price:true}})));`).trim()), { stock: catalog.stock, reservedStock: catalog.reservedStock, price: catalog.price });
  assert.equal(Number(db(`console.log(await prisma.product.count({where:{sku:${JSON.stringify(importRows[1].sku)}}}));`).trim()), 0);
  assert.equal((await admin.get('/api/external/v1/products')).status(), 401, 'Admin cookies do not authenticate the external API');
  const bearer = { Authorization: `Bearer ${credential.token}` };
  const response = await guest.get('/api/external/v1/products?limit=2', { headers: bearer }); const products = await data(response);
  assert.match(response.headers()['cache-control'], /no-store/); assert.ok(response.headers()['x-request-id']); assert.equal(products.products.length, 2); assert.equal(products.limit, 2); assert.match(products.products[0].priceCents, /^\d+$/);
  assert.equal((await guest.get('/api/external/v1/stock', { headers: bearer })).status(), 403);
  assert.equal((await guest.get('/api/external/v1/quotes', { headers: bearer })).status(), 403);
  assert.equal((await guest.get('/api/external/v1/products?limit=101', { headers: bearer })).status(), 400);
  const specResponse = await guest.get('/api/external/v1/openapi.json'); assert.equal(specResponse.status(), 200); assert.equal((await specResponse.json()).openapi, '3.1.1');
  const full = await data(await admin.post('/api/integrations/external-api/clients', { headers, data: { ...input, requestKey: randomUUID(), name: 'Leitura completa sintética', scopes: ['catalog:read', 'stock:read', 'orders:read', 'quotes:read'] } }), 201);
  const fullBearer = { Authorization: `Bearer ${full.token}` };
  const stock = await data(await guest.get('/api/external/v1/stock?limit=2', { headers: fullBearer })); assert.equal(stock.stock[0].available, Math.max(0, stock.stock[0].stock - stock.stock[0].reservedStock)); assert.equal(stock.stock[0].quantityUnit, 'COMMERCIAL_UNIT');
  const orders = await data(await guest.get('/api/external/v1/orders?limit=2', { headers: fullBearer })); assert.equal(JSON.stringify(orders).includes('customerWhatsapp'), false); assert.equal(JSON.stringify(orders).includes('customerName'), false); assert.equal(JSON.stringify(orders).includes('internalNotes'), false);
  const quoteId = `external_quote_${randomUUID()}`; const draftId = `external_draft_${randomUUID()}`; const customer = await data(await owner.get('/api/auth/me'));
  db(`await prisma.quoteRequest.create({data:{id:${JSON.stringify(quoteId)},referenceCode:${JSON.stringify(quoteId)},userId:${JSON.stringify(customer.id)},status:'SUBMITTED',submittedAt:new Date(),title:'Título privado',customerNote:'Nota privada',ocrText:'OCR privado',documentUrl:'private/document',items:{create:[{name:'Material A',quantity:1.5,unit:'kg',position:0},{name:'Material B',quantity:2,position:1},{name:'Material C',quantity:3,position:2}]}}});await prisma.quoteRequest.create({data:{id:${JSON.stringify(draftId)},referenceCode:${JSON.stringify(draftId)},userId:${JSON.stringify(customer.id)},status:'DRAFT',documentUrl:''}});`);
  const quotes = await data(await guest.get('/api/external/v1/quotes?limit=100', { headers: fullBearer }));
  const exported = quotes.quotes.find(value => value.id === quoteId); assert.equal(exported.itemCount, 3); assert.equal(quotes.quotes.some(value => value.id === draftId), false);
  assert.deepEqual(Object.keys(exported).sort(), ['id', 'itemCount', 'referenceCode', 'source', 'status', 'submittedAt', 'updatedAt']);
  const materials = await data(await guest.get(`/api/external/v1/quotes/${quoteId}/items?limit=2`, { headers: fullBearer }));
  assert.equal(materials.quoteId, quoteId); assert.equal(materials.quoteUpdatedAt, exported.updatedAt); assert.equal(materials.total, 3); assert.equal(materials.items.length, 2); assert.equal(materials.items[0].quantity, 1.5); assert.equal(materials.items[0].unit, 'kg');
  assert.deepEqual(Object.keys(materials.items[0]).sort(), ['id', 'name', 'position', 'productId', 'quantity', 'unit']);
  const lastMaterials = await data(await guest.get(`/api/external/v1/quotes/${quoteId}/items?limit=2&page=2`, { headers: fullBearer })); assert.equal(lastMaterials.items.length, 1); assert.equal(lastMaterials.items[0].name, 'Material C');
  assert.equal((await guest.get(`/api/external/v1/quotes/${draftId}/items`, { headers: fullBearer })).status(), 404);
  assert.equal((await guest.get(`/api/external/v1/quotes/${quoteId}/items`, { headers: bearer })).status(), 403);
  for (let index = 0; index < 30; index++) await guest.get('/api/external/v1/products?limit=1', { headers: bearer });
  assert.equal((await guest.get('/api/external/v1/products?limit=1', { headers: bearer })).status(), 429);
  await data(await admin.post(`/api/integrations/external-api/clients/${full.id}/revoke`, { headers, data: { confirmed: true } }));
  await data(await admin.post(`/api/integrations/external-api/clients/${full.id}/revoke`, { headers, data: { confirmed: true } }));
  assert.equal((await guest.get('/api/external/v1/stock', { headers: fullBearer })).status(), 401);
  assert.equal((await guest.get(`/api/external/v1/quotes/${quoteId}/items`, { headers: fullBearer })).status(), 401);
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
    await page.getByText('Conferir clientes de outro sistema', { exact: true }).click();
    const customerPanel = page.getByRole('region', { name: 'Prévia de clientes externos', exact: true });
    await customerPanel.getByLabel('Identificação do sistema', { exact: true }).fill(customerInput.source);
    await customerPanel.getByLabel('Arquivo de clientes (.json)', { exact: true }).setInputFiles({
      name: 'clientes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(customerRows)),
    });
    await customerPanel.getByRole('button', { name: 'Conferir clientes', exact: true }).click();
    await customerPanel.getByText('2 clientes · 1 com conflito. Nenhuma conta foi alterada.', { exact: true }).waitFor();
    await customerPanel.getByRole('button', { name: 'Conferir vínculo do cliente', exact: true }).click();
    await customerPanel.getByRole('button', { name: 'Confirmar vínculo do cliente', exact: true }).click();
    await customerPanel.getByText('Vínculo de cliente registrado.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByText('Conferir categorias de outro sistema', { exact: true }).click();
    const categoryPanel = page.getByRole('region', { name: 'Prévia de categorias externas', exact: true });
    await categoryPanel.getByLabel('Identificação do sistema', { exact: true }).fill(categoryInput.source);
    await categoryPanel.getByLabel('Arquivo de categorias (.json)', { exact: true }).setInputFiles({ name: 'categorias.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(categoryRows)) });
    await categoryPanel.getByRole('button', { name: 'Conferir categorias', exact: true }).click();
    await categoryPanel.getByText('2 categorias · 1 com conflito. Nenhuma categoria foi importada.', { exact: true }).waitFor();
    await categoryPanel.getByRole('button', { name: 'Conferir vínculo da categoria', exact: true }).click();
    await categoryPanel.getByRole('button', { name: 'Confirmar vínculo da categoria', exact: true }).click();
    await categoryPanel.getByText('Vínculo de categoria registrado.', { exact: true }).waitFor();
    await page.getByText('Conferir produtos de outro sistema', { exact: true }).click();
    const importPanel = page.getByRole('region', { name: 'Prévia de importação de produtos', exact: true });
    await importPanel.getByLabel('Identificação do sistema', { exact: true }).fill(importInput.source);
    const mappedBrowserRows = importRows.map(row => ({ externalId: row.externalId, sku: row.sku, name: row.name,
      externalCategoryId: categoryRows[0].externalId, priceCents: row.priceCents, stockQuantity: row.stockQuantity }));
    await importPanel.getByLabel('Arquivo de produtos (.json)', { exact: true }).setInputFiles({
      name: 'produtos.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(mappedBrowserRows)),
    });
    await importPanel.getByRole('button', { name: 'Conferir arquivo', exact: true }).click();
    await importPanel.getByText('2 produtos · 1 com conflito. Nenhum produto foi importado.', { exact: true }).waitFor();
    await importPanel.getByRole('button', { name: 'Salvar análise', exact: true }).click();
    await importPanel.getByText('Análise registrada. Os preços e o estoque não foram alterados.', { exact: true }).waitFor();
    await importPanel.getByText('Análises salvas', { exact: true }).click();
    await importPanel.getByRole('button', { name: 'Rever análise', exact: true }).first().click();
    await importPanel.getByText('Os conflitos permanecem iguais ao registro. Nenhum produto foi importado.', { exact: true }).waitFor();
    await importPanel.getByRole('button', { name: 'Conferir vínculo', exact: true }).click();
    await importPanel.getByRole('button', { name: 'Confirmar vínculo', exact: true }).click();
    await importPanel.getByText('Vínculo registrado. Confira os demais conflitos antes de importar.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await context.close(); }
  const final = await data(await admin.get('/api/integrations/external-api/clients'));
  for (const client of final.clients.filter(item => !item.revokedAt)) await data(await admin.post(`/api/integrations/external-api/clients/${client.id}/revoke`, { headers, data: { confirmed: true } }));
}
