import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretTechnicalService } from './partner-ai-transport.js';
import { tokenCost, usageCost, validateTechnicalDescription } from './partner-ai-cost.js';

const result = { service: 'PAINT', areaM2: 80, openingsM2: 8, coats: 2, lossPercent: null };
const response = (content: unknown, usage: unknown = { prompt_tokens: 100, completion_tokens: 50 }) => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }], usage }));
test('technical interpreter constrains providers, disables thinking and preserves missing measures', async () => {
  for (const provider of ['deepseek', 'qwen'] as const) {
    const fake: typeof fetch = async (url, options) => {
      assert.match(String(url), provider === 'deepseek' ? /^https:\/\/api.deepseek.com\// : /^https:\/\/dashscope-intl.aliyuncs.com\//);
      const body = JSON.parse(String(options?.body)); assert.equal(body.max_tokens, 512); assert.equal(body.response_format.type, 'json_object');
      assert.equal(options?.redirect, 'error'); assert.equal(body.temperature, 0);
      if (provider === 'deepseek') assert.equal(body.thinking.type, 'disabled'); else assert.equal(body.enable_thinking, false);
      return response(result);
    };
    const attempt = await interpretTechnicalService(provider, 'synthetic-test-only', 'Pintar 80 m², descontar 8 m² e aplicar 2 demãos.', fake);
    assert.deepEqual(attempt.result, result); assert.deepEqual(attempt.usage, { promptTokens: 100, completionTokens: 50 });
  }
});
test('invalid output retains consumption; failed calls do not expose provider text or retry', async () => {
  const invalid = await interpretTechnicalService('deepseek', 'synthetic', 'texto técnico', async () => response({ ...result, customer: 'PII' }));
  assert.equal(invalid.result, undefined); assert.equal(invalid.usage?.promptTokens, 100);
  let calls = 0;
  const unavailable = await interpretTechnicalService('deepseek', 'synthetic', 'texto técnico', async () => { calls++; return new Response('sensitive provider body', { status: 429 }); });
  assert.equal(calls, 1); assert.equal(unavailable.errorCode, 'HTTP_429'); assert.equal(unavailable.usage, undefined);
  assert.equal((await interpretTechnicalService('deepseek', 'synthetic', 'texto', async () => new Response('x'.repeat(50001)))).result, undefined);
});
test('budget math rounds upward in integer micro-USD and rejects likely personal identifiers', () => {
  assert.equal(tokenCost(1, 300000), 1n); assert.equal(usageCost(6000, 512, 300000, 1200000), 2415n);
  assert.throws(() => tokenCost(-1, 1));
  for (const text of ['Contato teste@example.com', 'Ligar (11) 98765-4321', 'CPF 123.456.789-00', 'https://example.com', 'ç'.repeat(2300)]) assert.throws(() => validateTechnicalDescription(text));
  assert.doesNotThrow(() => validateTechnicalDescription('Pintar 80 m², descontar 8 m² e aplicar 2 demãos.'));
});
