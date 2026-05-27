import type { OpenRouterUpdateBody } from '@rebequi/shared/schemas';
import { apiFetch } from './client';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type OpenRouterConfig = {
  enabled: boolean;
  primaryModel: string;
  fallbackModel: string;
  timeoutMs: number;
  referer: string;
  title: string;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  updatedAt: string | null;
};

export type OpenRouterTestResult = {
  ok: boolean;
  message: string;
  modelCount?: number;
  sampleModels?: string[];
};

function unwrap<T>(payload: unknown): T {
  if (typeof payload === 'object' && payload !== null && 'success' in payload) {
    const resp = payload as ApiResponse<T>;
    if (!resp.success) {
      throw new Error(resp.error || resp.message || 'Erro na API');
    }
    if (resp.data === undefined) {
      throw new Error('Resposta inesperada da API');
    }
    return resp.data;
  }
  return payload as T;
}

export async function fetchOpenRouterConfig(): Promise<OpenRouterConfig> {
  const response = await apiFetch<ApiResponse<OpenRouterConfig> | OpenRouterConfig>(
    '/integrations/openrouter'
  );
  return unwrap<OpenRouterConfig>(response);
}

export async function updateOpenRouterConfig(payload: OpenRouterUpdateBody): Promise<OpenRouterConfig> {
  const response = await apiFetch<ApiResponse<OpenRouterConfig> | OpenRouterConfig>(
    '/integrations/openrouter',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return unwrap<OpenRouterConfig>(response);
}

export async function testOpenRouterConnection(apiKey?: string): Promise<OpenRouterTestResult> {
  const response = await apiFetch<ApiResponse<OpenRouterTestResult> | OpenRouterTestResult>(
    '/integrations/openrouter/test',
    {
      method: 'POST',
      body: JSON.stringify(apiKey ? { apiKey } : {}),
    }
  );
  return unwrap<OpenRouterTestResult>(response);
}
