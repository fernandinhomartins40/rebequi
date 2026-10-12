import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function validatePartnerPortfolio({ owner, guest, admin, browser, baseURL, data, db }) {
  const headers = { Origin: baseURL };
  const buffer = Buffer.from(db(`const sharp=(await import('sharp')).default; console.log((await sharp({create:{width:1000,height:750,channels:3,background:'#f4b328'}}).jpeg().toBuffer()).toString('base64'));`).trim(), 'base64');
  const multipart = { image: { name: 'trabalho.jpg', mimeType: 'image/jpeg', buffer }, caption: 'Pintura concluída', authorized: 'true', requestKey: randomUUID() };
  assert.equal((await guest.post('/api/partners/portfolio', { headers, multipart })).status(), 401);
  assert.equal((await owner.post('/api/partners/portfolio', { headers, multipart: { ...multipart, authorized: 'false' } })).status(), 400);
  assert.equal((await owner.post('/api/partners/portfolio', { headers, multipart: { ...multipart, image: { name: 'falso.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') } } })).status(), 400);
  const image = await data(await owner.post('/api/partners/portfolio', { headers, multipart }), 201);
  assert.match(image.url, /^\/uploads\/partners\/.*\.webp$/); assert.equal(image.width, 1000); assert.equal(image.height, 750); assert.ok(image.size <= 250 * 1024);
  assert.equal((await data(await owner.post('/api/partners/portfolio', { headers, multipart }), 201)).id, image.id);
  assert.equal((await owner.post('/api/partners/portfolio', { headers, multipart: { ...multipart, caption: 'Mudança do envio' } })).status(), 409);
  assert.equal((await guest.get(image.url)).status(), 401);
  assert.equal((await guest.get(image.url.replace('/partners/', '/%70artners/'))).status(), 401);
  const ownFile = await owner.get(image.url); assert.equal(ownFile.status(), 200); assert.equal(ownFile.headers()['cache-control'], 'private, no-store'); assert.match(ownFile.headers()['content-type'], /image\/webp/);
  assert.equal((await admin.get(image.url)).status(), 200);
  await data(await guest.post('/api/quotes/public/start', { data: { name: 'Outro visitante', whatsapp: '11987654326' } }), 201);
  assert.equal((await guest.get(image.url)).status(), 404);
  await data(await guest.delete(`/api/partners/portfolio/${image.id}`, { headers }));
  assert.equal((await owner.get(image.url)).status(), 200, 'Another account cannot remove the photo');
  for (let index = 1; index < 8; index++) await data(await owner.post('/api/partners/portfolio', { headers, multipart: { ...multipart, requestKey: randomUUID() } }), 201);
  assert.equal((await owner.post('/api/partners/portfolio', { headers, multipart: { ...multipart, requestKey: randomUUID() } })).status(), 400);
  assert.equal((await data(await owner.get('/api/partners/portfolio'))).length, 8);
  await data(await owner.delete(`/api/partners/portfolio/${image.id}`, { headers }));
  await data(await owner.delete(`/api/partners/portfolio/${image.id}`, { headers }));
  assert.equal((await owner.get(image.url)).status(), 404);
  const context = await browser.newContext();
  try {
    await context.addCookies((await owner.storageState()).cookies);
    const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/parceiros/?area=portfolio`);
    await page.getByLabel('Descrição da foto (opcional)').fill('Trabalho pelo celular');
    await page.getByRole('checkbox', { name: 'Tenho autorização para usar esta foto.' }).check();
    await page.getByLabel('Foto de trabalho para o portfólio').setInputFiles({ name: 'celular.jpg', mimeType: 'image/jpeg', buffer });
    await page.getByRole('button', { name: 'Usar imagem recortada', exact: true }).click();
    await page.getByText('Trabalho pelo celular', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const saved = await data(await owner.get('/api/partners/portfolio'));
    assert.equal(saved.length, 8); assert.ok(saved.every(photo => photo.size <= 250 * 1024));
  } finally { await context.close(); }
}
