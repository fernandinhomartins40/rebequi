import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function validateReceiptEvidence({ owner, admin, guest, browser, baseURL, data, db, fulfillmentId }) {
  const headers = { Origin: baseURL };
  const receiptId = db(`console.log((await prisma.fulfillmentEvent.findFirstOrThrow({where:{fulfillmentId:${JSON.stringify(fulfillmentId)},kind:'PICKUP_RECEIVED'},orderBy:{version:'asc'}})).id);`).trim();
  const buffer = Buffer.from(db(`const sharp=(await import('sharp')).default; console.log((await sharp({create:{width:300,height:150,channels:3,background:'#f4b328'}}).jpeg().toBuffer()).toString('base64'));`).trim(), 'base64');
  const multipart = { requestKey: randomUUID(), authorized: 'true', image: { name: 'foto.jpg', mimeType: 'image/jpeg', buffer } };
  assert.equal((await owner.post(`/api/receipt-evidence/${receiptId}`, { headers, multipart })).status(), 403);
  assert.equal((await guest.post(`/api/receipt-evidence/${receiptId}`, { multipart })).status(), 403);
  assert.equal((await guest.post(`/api/receipt-evidence/${receiptId}`, { headers, multipart: { ...multipart, authorized: 'false' } })).status(), 400);
  assert.equal((await guest.post(`/api/receipt-evidence/${receiptId}`, { headers, multipart: { ...multipart, image: { name: 'false.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') } } })).status(), 400);
  const uploaded = await data(await guest.post(`/api/receipt-evidence/${receiptId}`, { headers, multipart }), 201);
  assert.deepEqual(await data(await guest.post(`/api/receipt-evidence/${receiptId}`, { headers, multipart }), 201), uploaded);
  assert.equal((await guest.post(`/api/receipt-evidence/${receiptId}`, { headers, multipart: { ...multipart, image: { ...multipart.image, buffer: Buffer.concat([buffer, Buffer.from('changed')]) } } })).status(), 409);
  const images = await data(await owner.get(`/api/receipt-evidence/${receiptId}`)); assert.equal(images.length, 1); assert.equal(images[0].width, 1000); assert.equal(images[0].height, 750);
  const download = await owner.get(uploaded.url); assert.equal(download.status(), 200); assert.match(download.headers()['cache-control'], /no-store/); assert.match(download.headers()['content-type'], /image\/webp/);
  const other = await browser.newContext({ baseURL });
  try {
    assert.equal((await other.request.get(uploaded.url)).status(), 401);
    await data(await other.request.post('/api/auth/register', { headers, data: { name: 'Cliente sem acesso às evidências', whatsapp: '11999998866' } }), 201);
    assert.equal((await other.request.get(`/api/receipt-evidence/${receiptId}`)).status(), 404);
    assert.equal((await other.request.get(uploaded.url)).status(), 404);
  } finally { await other.close(); }
  const immutable = JSON.parse(db(`let blocked=false;try{await prisma.fulfillmentEvidence.update({where:{id:${JSON.stringify(uploaded.id)}},data:{actorId:'changed'}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1)); assert.equal(immutable.blocked, true);
  for (let index = 0; index < 2; index++) await data(await admin.post(`/api/receipt-evidence/${receiptId}`, { headers, multipart: { ...multipart, requestKey: randomUUID() } }), 201);
  assert.equal((await admin.post(`/api/receipt-evidence/${receiptId}`, { headers, multipart: { ...multipart, requestKey: randomUUID() } })).status(), 409);
  assert.equal(Number(db(`console.log(await prisma.fulfillmentEvidence.count({where:{receiptId:${JSON.stringify(receiptId)}}}));`).trim()), 3);
  const warehouse = await browser.newContext({ baseURL });
  try {
    await warehouse.addCookies((await guest.storageState()).cookies); const page = await warehouse.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/deposito/${fulfillmentId}`);
    await page.getByText('Histórico operacional', { exact: true }).click();
    await page.getByText('Fotos do recebimento (opcional)', { exact: true }).first().click();
    await page.getByLabel('1. Escolher e recortar foto', { exact: true }).setInputFiles({ name: 'evidencia.jpg', mimeType: 'image/jpeg', buffer });
    const crop = page.getByRole('dialog'); await crop.getByRole('heading', { name: 'Recortar foto do recebimento', exact: true }).waitFor();
    await crop.getByRole('button', { name: 'Usar imagem recortada', exact: true }).click();
    await page.getByRole('button', { name: '3. Anexar foto', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '3. Anexar foto', exact: true }).isDisabled(), true);
    await page.getByRole('checkbox', { name: '2. O recebedor autorizou esta foto como evidência do recebimento.', exact: true }).check();
    const response = page.waitForResponse(value => value.url().includes('/receipt-evidence/') && value.request().method() === 'POST');
    await page.getByRole('button', { name: '3. Anexar foto', exact: true }).click(); assert.equal((await response).status(), 201);
    await page.getByAltText('Evidência do recebimento', { exact: true }).first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await warehouse.close(); }
}
