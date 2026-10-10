import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit';
process.env.JWT_SECRET ??= 'unit-test-secret-not-used-in-production-123';
const { QuoteOcrService } = await import('./quote-ocr.service.js');
import type { QuoteAiRuntimeConfig } from './integration-settings.service.js';
const config: QuoteAiRuntimeConfig = { enabled: true, primaryProvider: 'deepseek', fallbackEnabled: true, deepseekModel: 'deepseek-flash', qwenModel: 'qwen3-vl-flash', deepseekApiKey: 'test-deepseek-not-a-real-key', qwenApiKey: 'test-qwen-not-a-real-key', timeoutMs: 10000, maxTokens: 2500 };
const item = { produto: 'Cimento 50 kg', quantidade: 2, unidade: 'sc', confianca: 0.9, texto_original: '2 sc cimento 50 kg', produto_id: 'catalog-1' };
const image = () => sharp({ create: { width: 16, height: 16, channels: 3, background: 'white' } }).png().toBuffer();
function response(items: unknown[] = [item], finish_reason = 'stop') {
 return Response.json({ choices: [{ finish_reason, message: { content: JSON.stringify({ tipo_documento: 'manuscrito', itens: items }) } }], usage: { prompt_tokens: 600, completion_tokens: 100 } });
}
function service(transport: typeof fetch, overrides: Partial<QuoteAiRuntimeConfig> = {}) {
 return new QuoteOcrService({ settings: { getAiRuntime: async () => ({ ...config, ...overrides }) }, fetch: transport });
}
test('direct DeepSeek vision payload, token budget, quantities and telemetry', async () => {
 let calls = 0;
 const result = await service(async (url, options) => {
  calls++; assert.equal(url, 'https://api.deepseek.com/chat/completions');
  const body = JSON.parse(String(options?.body));
  assert.equal(body.model, 'deepseek-flash'); assert.equal(body.max_tokens, 2500);
  assert.equal(body.response_format.type, 'json_object'); assert.equal(options?.redirect, 'error');
  assert.equal(body.thinking.type, 'disabled');
  assert.match(body.messages[0].content[1].image_url.url, /^data:image\/jpeg;base64,/);
  assert.match(body.messages[0].content[0].text, /catalog-1/);
  return response();
 }).recognizeDocument(await image(), [{ id: 'catalog-1', name: 'Cimento 50 kg' }]);
 assert.equal(calls, 1); assert.equal(result.engine, 'deepseek');
 assert.equal(result.lines[0].quantity, 2); assert.equal(result.lines[0].productId, 'catalog-1');
 assert.equal(result.lines[0].confidence, 90); assert.equal(result.usage?.promptTokens, 600);
});
test('a failed provider uses Qwen directly once and never a local process', async () => {
 const urls: string[] = [];
 const result = await service(async (url, options) => {
  urls.push(String(url));
  if (urls.length === 1) return new Response('private response must not be exposed', { status: 429 });
  const body = JSON.parse(String(options?.body)); assert.equal(body.model, 'qwen3-vl-flash'); assert.equal(body.enable_thinking, false);
  return response();
 }).recognizeDocument(await image());
 assert.deepEqual(urls, ['https://api.deepseek.com/chat/completions', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions']);
 assert.equal(result.engine, 'qwen'); assert.equal(result.lines[0].productId, null);
});
test('missing configuration fails safely before processing or network calls', async () => {
 let calls = 0;
 await assert.rejects(service(async () => { calls++; return response(); }, { deepseekApiKey: null, qwenApiKey: null }).recognizeDocument(Buffer.alloc(0)), /documento foi preservado/);
 assert.equal(calls, 0);
});
test('disabled reserve never calls a second provider', async () => {
 let calls = 0;
 await assert.rejects(service(async () => { calls++; return new Response('', { status: 401 }); }, { fallbackEnabled: false }).recognizeDocument(await image()), /revise a lista manualmente/);
 assert.equal(calls, 1);
});
test('truncation, malformed JSON, invalid quantity and invented IDs are guarded', async () => {
 for (const bad of [response([item], 'length'), response([{ ...item, quantidade: -2 }]), response([{ ...item, quantidade: 1000001 }]), Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'not json' } }] })]) {
  await assert.rejects(service(async () => bad, { fallbackEnabled: false }).recognizeDocument(await image()), /documento foi preservado/);
 }
 const result = await service(async () => response([{ ...item, produto_id: 'invented' }])).recognizeDocument(await image(), [{ id: 'catalog-1', name: 'Cimento' }]);
 assert.equal(result.lines[0].productId, null);
});
test('large catalogs stay out of the prompt and matching remains available downstream', async () => {
 const catalog = Array.from({ length: 101 }, (_, index) => ({ id: `id-${index}`, name: 'Catalog item' }));
 await service(async (_url, options) => { assert.doesNotMatch(String(options?.body), /Catalog item/); return response(); }).recognizeDocument(await image(), catalog);
});
test('concurrency is shared between service instances and released on errors', async () => {
 let active = 0; let max = 0;
 const transport: typeof fetch = async () => { active++; max = Math.max(max, active); await new Promise(resolve => setTimeout(resolve, 20)); active--; return response(); };
 const buffer = await image();
 await Promise.all(Array.from({ length: 7 }, () => service(transport).recognizeDocument(buffer)));
 assert.equal(max, 3);
});

test('Qwen can be primary without a DeepSeek key; health reports configuration only', async () => {
 const instance = service(async url => { assert.match(String(url), /dashscope-intl/); return response(); }, { primaryProvider: 'qwen', deepseekApiKey: null, fallbackEnabled: false });
 const health = await instance.getEngineHealth(); assert.equal(health.unavailable, false); assert.equal(health.degraded, false); assert.equal(health.status, 'configuration-only');
 const result = await instance.recognizeDocument(await image()); assert.equal(result.engine, 'qwen');
});
test('disabled automatic reading never consumes provider tokens', async () => {
 let calls = 0;
 await assert.rejects(service(async () => { calls++; return response(); }, { enabled: false }).recognizeDocument(await image()), /não configurada/);
 assert.equal(calls, 0);
});

test('manual editing cancels the reserve before another paid request', async () => {
 let calls = 0; let edited = false;
 const instance = service(async () => { calls++; edited = true; return new Response('', { status: 500 }); });
 await assert.rejects(instance.recognizeDocument(await image(), [], async () => !edited), /cancelada após edição/);
 assert.equal(calls, 1);
});
