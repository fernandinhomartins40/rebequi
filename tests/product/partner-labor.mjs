import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function validatePartnerLabor({ owner, guest, admin, browser, baseURL, data }) {
  const headers = { Origin: baseURL };
  const projectInput = { title: 'Serviços particulares', service: 'PAINT', clientName: 'Cliente particular', expectedVersion: 0, requestKey: randomUUID() };
  const project = await data(await owner.post('/api/partners/projects', { headers, data: projectInput }), 201);
  const input = { projectId: project.id, title: 'Pintura de ambientes', items: [{ description: 'Pintura da sala', quantity: 1.25, unit: 'm²', unitPriceCents: 1999 }], notes: 'Somente serviços de pintura', validityDays: 7, expectedLatestVersion: 0, requestKey: randomUUID() };
  assert.equal((await guest.post('/api/partners/labor-quotes', { headers, data: input })).status(), 401);
  assert.equal((await admin.post('/api/partners/labor-quotes', { headers, data: input })).status(), 403);
  assert.equal((await owner.post('/api/partners/labor-quotes', { data: input })).status(), 403);
  assert.equal((await owner.post('/api/partners/labor-quotes', { headers, data: { ...input, totalCents: 1 } })).status(), 400);
  const responses = await Promise.all([1, 2].map(() => owner.post('/api/partners/labor-quotes', { headers, data: input })));
  const versions = await Promise.all(responses.map(response => data(response, 201)));
  assert.equal(versions[0].id, versions[1].id); assert.equal(versions[0].totalCents, 2499); assert.equal(versions[0].version, 1);
  assert.equal(versions[0].clientNameSnapshot, 'Cliente particular');
  assert.equal(versions[0].fingerprint, undefined); assert.equal(versions[0].requestKey, undefined);
  assert.equal((await owner.post('/api/partners/labor-quotes', { headers, data: { ...input, title: 'Envio alterado' } })).status(), 409);
  assert.equal((await owner.post('/api/partners/labor-quotes', { headers, data: { ...input, requestKey: randomUUID() } })).status(), 409);
  await data(await owner.put(`/api/partners/projects/${project.id}`, { headers, data: { ...projectInput, title: 'Obra renomeada', clientName: 'Outro nome', expectedVersion: 1 } }));
  assert.equal((await data(await owner.get(`/api/partners/projects/${project.id}/labor-quotes`))).quotes[0].projectTitleSnapshot, 'Serviços particulares');
  const competitors = await Promise.all([1, 2].map(index => owner.post('/api/partners/labor-quotes', { headers, data: { ...input, title: `Revisão ${index}`, expectedLatestVersion: 1, requestKey: randomUUID() } })));
  assert.deepEqual(competitors.map(response => response.status()).sort(), [201, 409]);
  const context = await browser.newContext();
  try {
    await context.addCookies((await owner.storageState()).cookies);
    const page = await context.newPage(); await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`${baseURL}/parceiros/?area=mao-de-obra&project=${project.id}`);
    await page.getByRole('button', { name: 'Nova versão', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Preço unitário (R$)').fill('25,50');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar versão', exact: true }).click();
    const document = page.locator('#partner-labor-document');
    await document.getByText('Versão 3', { exact: false }).waitFor();
    assert.ok((await document.innerText()).replace(/\s+/g, ' ').includes('R$ 31,88'));
    assert.ok(!(await document.innerText()).includes('Outro nome'), 'Client is excluded from print by default');
    await page.getByRole('checkbox', { name: 'Incluir nome do cliente na impressão' }).check();
    assert.ok((await document.innerText()).includes('Cliente: Outro nome'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  } finally { await context.close(); }
  const saved = await data(await owner.get(`/api/partners/projects/${project.id}/labor-quotes`));
  assert.equal(saved.total, 3); assert.equal(saved.quotes.at(-1).totalCents, 2499);
}
