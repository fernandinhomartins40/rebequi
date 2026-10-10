import type { QuoteAiProvider, QuoteAiUpdateBody } from '@rebequi/shared/schemas';
import { SettingRepository } from '../repositories/setting.repository.js';
import { prisma } from '../lib/prisma.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.util.js';
// Fixed official endpoints prevent redirects of documents and keys to arbitrary hosts.
export const AI_ENDPOINTS = {
 deepseek: 'https://api.deepseek.com',
 qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
} as const;
export type QuoteAiRuntimeConfig = {
 enabled: boolean; primaryProvider: QuoteAiProvider; fallbackEnabled: boolean;
 deepseekModel: string; qwenModel: string; deepseekApiKey: string | null; qwenApiKey: string | null;
 timeoutMs: number; maxTokens: number;
};
export class IntegrationSettingsService {
 private repository = new SettingRepository();
 async getAiRuntime(): Promise<QuoteAiRuntimeConfig> {
  const fields = ['enabled', 'primaryProvider', 'fallbackEnabled', 'deepseekModel', 'qwenModel', 'deepseekApiKey', 'qwenApiKey', 'timeoutMs', 'maxTokens'];
  const rows = await this.repository.findManyByKeys(fields.map(field => `quoteAi.${field}`));
  const values = new Map(rows.map(row => [row.key.replace('quoteAi.', ''), row.value]));
  const readKey = (field: string) => { try { return values.get(field) ? decryptSecret(values.get(field)!) : null; } catch { return null; } };
  const bounded = (field: string, fallback: number, min: number, max: number) => {
   const value = Number(values.get(field));
   return Number.isFinite(value) && value >= min && value <= max ? Math.round(value) : fallback;
  };
  return {
   enabled: values.get('enabled') === 'true', primaryProvider: values.get('primaryProvider') === 'qwen' ? 'qwen' : 'deepseek',
   fallbackEnabled: values.get('fallbackEnabled') !== 'false', deepseekModel: 'deepseek-flash',
   qwenModel: values.get('qwenModel') === 'qwen3-vl-plus' ? 'qwen3-vl-plus' : 'qwen3-vl-flash',
   deepseekApiKey: readKey('deepseekApiKey'), qwenApiKey: readKey('qwenApiKey'),
   timeoutMs: bounded('timeoutMs', 30000, 10000, 45000), maxTokens: bounded('maxTokens', 2500, 512, 8000),
  };
 }
 async getAiPublic() {
  const { deepseekApiKey, qwenApiKey, ...config } = await this.getAiRuntime();
  return { ...config, hasDeepseekApiKey: Boolean(deepseekApiKey), hasQwenApiKey: Boolean(qwenApiKey) };
 }
 async updateAi(input: QuoteAiUpdateBody) {
  await prisma.$transaction(Object.entries(input).filter(([, value]) => value !== undefined).map(([field, value]) => {
   const key = `quoteAi.${field}`; const isSecret = field.endsWith('ApiKey');
   if (isSecret && !value) return prisma.setting.deleteMany({ where: { key } });
   const stored = isSecret ? encryptSecret(String(value).trim()) : String(value);
   return prisma.setting.upsert({ where: { key }, update: { value: stored, isSecret }, create: { key, value: stored, isSecret } });
  }));
  return this.getAiPublic();
 }
 async testProvider(provider: QuoteAiProvider) {
  const config = await this.getAiRuntime();
  const key = provider === 'deepseek' ? config.deepseekApiKey : config.qwenApiKey;
  if (!key) return { ok: false, message: 'Cadastre e salve a chave deste provedor.' };
  try {
   const response = await fetch(`${AI_ENDPOINTS[provider]}/${provider === 'deepseek' ? 'models' : 'files'}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000), redirect: 'error' });
   if (!response.ok) return { ok: false, message: `Provedor respondeu HTTP ${response.status}. Confira a chave e a região da conta.` };
   return { ok: true, message: 'Conexão validada. Teste uma foto para confirmar a leitura e o saldo.' };
  } catch { return { ok: false, message: 'Não foi possível conectar ao provedor. Tente novamente.' }; }
 }
 async testRecognition(buffer: Buffer, catalog: Array<{ id: string; name: string }> = []) {
  const { QuoteOcrService } = await import('./quote-ocr.service.js');
  const startedAt = Date.now();
  try {
   const result = await new QuoteOcrService().recognizeDocument(buffer, catalog);
   return { ok: true, message: `${result.lines.length} itens reconhecidos.`, engine: result.engine, modelId: result.modelId, ...result.usage,
    items: result.lines.slice(0, 20).map(line => ({ text: line.text, quantity: line.quantity ?? null, unit: line.unit ?? null })) };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Falha na leitura.', durationMs: Date.now() - startedAt }; }
 }
}
