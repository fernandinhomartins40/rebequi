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

export type VisionModel = {
  id: string;
  name: string;
  isFree: boolean;
  promptPricePerMillion: number | null;
  completionPricePerMillion: number | null;
  contextLength: number | null;
};

/** Modelos com visão listados pela própria API do OpenRouter. */
export async function fetchVisionModels(): Promise<VisionModel[]> {
  const response = await apiFetch<ApiResponse<VisionModel[]> | VisionModel[]>(
    '/integrations/openrouter/models'
  );
  return unwrap<VisionModel[]>(response);
}

export type RecognitionTestResult = {
  ok: boolean;
  message: string;
  engine?: string;
  modelId?: string;
  durationMs?: number;
  costUsd?: number | null;
  items?: Array<{ text: string; quantity: number | null; unit: string | null }>;
};

/** Roda a cadeia real sobre uma foto — a única prova de que a leitura funciona. */
export async function testOpenRouterRecognition(file: File): Promise<RecognitionTestResult> {
  const body = new FormData();
  body.append('document', file);

  const response = await apiFetch<ApiResponse<RecognitionTestResult> | RecognitionTestResult>(
    '/integrations/openrouter/test-recognition',
    { method: 'POST', body }
  );
  return unwrap<RecognitionTestResult>(response);
}

export type OcrHealth = {
  openrouter: {
    enabled: boolean;
    hasApiKey: boolean;
    primaryModel: string;
    fallbackModel: string;
    usable: boolean;
  };
  local: { engine: string; available: boolean; error: string | null };
  degraded: boolean;
  unavailable: boolean;
};

/** Estado real da cadeia de OCR — para o lojista saber antes dos clientes. */
export async function fetchOcrHealth(): Promise<OcrHealth> {
  const response = await apiFetch<ApiResponse<OcrHealth> | OcrHealth>('/quotes/admin/ocr-health');
  return unwrap<OcrHealth>(response);
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
