import type { QuoteAiProvider, QuoteAiUpdateBody } from '@rebequi/shared/schemas';
import { apiFetch } from './client';
import type { MarketplaceDefinition, MarketplaceType } from '@rebequi/shared/constants';
export type MarketplaceSettings = MarketplaceDefinition & { accounts: Array<{ id: string; name: string; isActive: boolean; status: string; configuredFields: string[] }> };
export const fetchMarketplaceSettings = () => call<MarketplaceSettings[]>('/integrations/marketplaces');
export const saveMarketplaceSettings = (type: MarketplaceType, body: { channelId?: string; credentials: Record<string, string | null> }) =>
 call<{ channelId: string; configuredFields: string[] }>(`/integrations/marketplaces/${type}`, { method: 'PUT', body: JSON.stringify(body) });
export type QuoteAiConfig = {
 enabled: boolean; primaryProvider: QuoteAiProvider; fallbackEnabled: boolean;
 deepseekModel: string; qwenModel: string; timeoutMs: number; maxTokens: number;
 hasDeepseekApiKey: boolean; hasQwenApiKey: boolean;
};
export type AiTestResult = {
 ok: boolean; message: string; engine?: string; modelId?: string;
 durationMs?: number; promptTokens?: number; completionTokens?: number;
 items?: Array<{ text: string; quantity: number | null; unit: string | null }>;
};
async function call<T>(path: string, options?: Parameters<typeof apiFetch>[1]): Promise<T> {
 const response = await apiFetch<{ success: boolean; data: T; message?: string }>(path, options);
 if (!response.success) throw new Error(response.message ?? 'Não foi possível concluir.');
 return response.data;
}
export const fetchQuoteAiConfig = () => call<QuoteAiConfig>('/integrations/ai');
export const updateQuoteAiConfig = (body: QuoteAiUpdateBody) => call<QuoteAiConfig>('/integrations/ai', { method: 'PUT', body: JSON.stringify(body) });
export const testAiConnection = (provider: QuoteAiProvider) => call<AiTestResult>('/integrations/ai/test', { method: 'POST', body: JSON.stringify({ provider }) });
export function testAiRecognition(file: File) {
 const body = new FormData(); body.append('document', file);
 return call<AiTestResult>('/integrations/ai/test-recognition', { method: 'POST', body });
}
