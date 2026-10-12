import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function validatePartnerAi({ owner, guest, admin, browser, baseURL, data, db }) {
  const headers = { Origin: baseURL };
  const profile = await data(await owner.get('/api/partners/me'));
  const input = { description: 'Pintar 80 m² com duas demãos.', technicalOnly: true, requestKey: randomUUID() };
  assert.equal((await guest.post('/api/partners/ai/interpret', { headers, data: input })).status(), 401);
  assert.equal((await owner.post('/api/partners/ai/interpret', { headers, data: input })).status(), 403);
  assert.equal((await owner.get('/api/integrations/partner-ai')).status(), 403);
  const initial = await data(await admin.get('/api/integrations/partner-ai'));
  const settings = { enabled: true, provider: 'deepseek', dailyLimit: 3, monthlyBudgetCents: 1, inputRateMicroUsd: 300000, outputRateMicroUsd: 1200000, expectedVersion: initial.version, tariffsConfirmed: true };
  assert.equal((await admin.put('/api/integrations/partner-ai', { data: settings })).status(), 403);
  await data(await admin.put('/api/integrations/partner-ai', { headers, data: settings }));
  assert.equal((await admin.put('/api/integrations/partner-ai', { headers, data: settings })).status(), 409);
  // Real PostgreSQL transactions; replace only provider transport/key with synthetic values.
  const summary = JSON.parse(db(`
    const {interpretPartnerDescription}=await import('./apps/backend/dist/services/partner-ai.service.js');
    const runtime=Promise.resolve({deepseekApiKey:'synthetic',qwenApiKey:null});
    let calls=0; const transport=async()=>{calls++; await new Promise(resolve=>setTimeout(resolve,50)); return new Response(JSON.stringify({usage:{prompt_tokens:100,completion_tokens:50},choices:[{finish_reason:'stop',message:{content:JSON.stringify({service:'PAINT',areaM2:80,openingsM2:null,coats:2,lossPercent:null})}}]}));};
    const userId=${JSON.stringify(profile.userId)}; const input=${JSON.stringify(input)};
    const concurrent=await Promise.allSettled([interpretPartnerDescription(userId,input,{runtime,transport}),interpretPartnerDescription(userId,input,{runtime,transport})]);
    const replay=await interpretPartnerDescription(userId,input,{runtime,transport});
    const cached=await interpretPartnerDescription(userId,{...input,requestKey:${JSON.stringify(randomUUID())}},{runtime,transport});
    const bad=await Promise.allSettled([interpretPartnerDescription(userId,{...input,description:'Ligar (11) 98765-4321',requestKey:${JSON.stringify(randomUUID())}},{runtime,transport})]);
    const failure=await Promise.allSettled([interpretPartnerDescription(userId,{...input,description:'Instalar piso em 20 m².',requestKey:${JSON.stringify(randomUUID())}},{runtime,transport:async()=>{calls++; throw new Error('synthetic-network-failure');}})]);
    const exhausted=await Promise.allSettled([interpretPartnerDescription(userId,{...input,description:'Pintar 100 m².',requestKey:${JSON.stringify(randomUUID())}},{runtime,transport})]);
    const rows=await prisma.partnerAiRun.findMany({where:{partnerId:${JSON.stringify(profile.id)}},orderBy:{createdAt:'asc'}});
    console.log(JSON.stringify({calls,concurrent:concurrent.map(x=>x.status),cached:cached.cached,replay:replay.cached,bad:bad[0].status,failure:failure[0].status,exhausted:exhausted[0].status,rows:rows.map(r=>({status:r.status,charged:Number(r.chargedMicroUsd),reserved:Number(r.reservedMicroUsd)}))}));
  `).trim());
  assert.equal(summary.calls, 2); assert.ok(summary.concurrent.includes('fulfilled'));
  assert.equal(summary.cached, true); assert.equal(summary.replay, true); assert.equal(summary.bad, 'rejected'); assert.equal(summary.failure, 'rejected'); assert.equal(summary.exhausted, 'rejected');
  assert.equal(summary.rows.length, 3); assert.equal(summary.rows[0].charged, 90); assert.equal(summary.rows[1].charged, 0); assert.equal(summary.rows[2].status, 'UNKNOWN'); assert.equal(summary.rows[2].charged, summary.rows[2].reserved);
  assert.equal((await data(await owner.get('/api/partners/ai/status'))).remaining, 0);
  // A global monthly budget must block all new requests before the fake provider runs.
  db(`const row=await prisma.setting.findUniqueOrThrow({where:{key:'partnerAi.config'}});const value=JSON.parse(row.value);value.dailyLimit=20;await prisma.setting.update({where:{key:row.key},data:{value:JSON.stringify(value)}});await prisma.partnerAiRun.updateMany({where:{partnerId:${JSON.stringify(profile.id)},status:'UNKNOWN'},data:{chargedMicroUsd:10000n}});`);
  const budget = db(`const {interpretPartnerDescription}=await import('./apps/backend/dist/services/partner-ai.service.js');let calls=0;try{await interpretPartnerDescription(${JSON.stringify(profile.userId)},{...${JSON.stringify(input)},description:'Pintar 120 m².',requestKey:${JSON.stringify(randomUUID())}},{runtime:Promise.resolve({deepseekApiKey:'synthetic'}),transport:async()=>{calls++;throw new Error('must not call');}});}catch(error){console.log(JSON.stringify({calls,message:error.message}));}`);
  assert.equal(JSON.parse(budget).calls, 0); assert.match(JSON.parse(budget).message, /mensal/);
  const context = await browser.newContext();
  try {
    await context.addCookies((await admin.storageState()).cookies); const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/painel-lojista/painel/integrações?tab=ia`);
    await page.getByRole('heading', { name: 'IA da calculadora de parceiros', exact: true }).waitFor();
    await page.getByLabel('Leituras por profissional/dia', { exact: true }).fill('5');
    await page.getByRole('checkbox', { name: 'Conferi as tarifas e autorizo o limite de gasto informado.' }).check();
    await page.getByRole('button', { name: 'Salvar limites', exact: true }).click();
    await page.getByText('Configuração salva.', { exact: true }).waitFor();
    assert.equal((await data(await admin.get('/api/integrations/partner-ai'))).dailyLimit, 5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await context.close(); }
  const last = await data(await admin.get('/api/integrations/partner-ai'));
  await data(await admin.put('/api/integrations/partner-ai', { headers, data: { ...settings, enabled: false, expectedVersion: last.version } }));
}
