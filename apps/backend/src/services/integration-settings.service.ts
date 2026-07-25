/**
 * Integration Settings Service
 *
 * Reads and writes integration configuration that is persisted in the database
 * via the generic Setting model. Currently used for the OpenRouter OCR config,
 * but the same pattern can host other integrations in the future.
 *
 * Secret values (e.g. API keys) are encrypted at rest with crypto.util.ts.
 */

import { SettingRepository } from '../repositories/setting.repository.js';
import { decryptSecret, encryptSecret, maskSecret } from '../utils/crypto.util.js';
import { logger } from '../utils/logger.util.js';

const SETTING_KEYS = {
  enabled: 'openrouter.enabled',
  apiKey: 'openrouter.apiKey',
  primaryModel: 'openrouter.primaryModel',
  fallbackModel: 'openrouter.fallbackModel',
  timeoutMs: 'openrouter.timeoutMs',
  referer: 'openrouter.referer',
  title: 'openrouter.title',
} as const;

const DEFAULTS = {
  primaryModel: 'qwen/qwen2.5-vl-72b-instruct:free',
  fallbackModel: 'google/gemini-2.0-flash-exp:free',
  // Vision models on the free tier routinely queue. 12s aborted calls that
  // would have succeeded, and the chain paid that cost twice before failing.
  timeoutMs: 45_000,
  referer: 'https://rebequi.com.br',
  title: 'Rebequi OCR',
} as const;

const TIMEOUT_MIN_MS = 10_000;
const TIMEOUT_MAX_MS = 120_000;

export type OpenRouterPublicConfig = {
  enabled: boolean;
  primaryModel: string;
  fallbackModel: string;
  timeoutMs: number;
  referer: string;
  title: string;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  updatedAt: Date | null;
};

export type OpenRouterRuntimeConfig = OpenRouterPublicConfig & {
  apiKey: string | null;
};

export type VisionModel = {
  id: string;
  name: string;
  isFree: boolean;
  promptPricePerMillion: number | null;
  completionPricePerMillion: number | null;
  contextLength: number | null;
};

type RawOpenRouterModel = {
  id: string;
  name?: string;
  context_length?: number;
  architecture?: { input_modalities?: string[]; modality?: string };
  pricing?: { prompt?: string; completion?: string };
};

const VISION_MODELS_TTL_MS = 60 * 60 * 1000;
let visionModelsCache: { models: VisionModel[]; fetchedAt: number } | null = null;

export type OpenRouterUpdateInput = {
  enabled?: boolean;
  apiKey?: string | null;
  primaryModel?: string;
  fallbackModel?: string;
  timeoutMs?: number;
  referer?: string;
  title?: string;
};

export class IntegrationSettingsService {
  private repository: SettingRepository;

  constructor() {
    this.repository = new SettingRepository();
  }

  async getOpenRouterPublic(): Promise<OpenRouterPublicConfig> {
    const runtime = await this.getOpenRouterRuntime();
    return this.toPublic(runtime);
  }

  async getOpenRouterRuntime(): Promise<OpenRouterRuntimeConfig> {
    const rows = await this.repository.findManyByKeys(Object.values(SETTING_KEYS));
    const map = new Map(rows.map((row) => [row.key, row]));

    const enabledRow = map.get(SETTING_KEYS.enabled);
    const apiKeyRow = map.get(SETTING_KEYS.apiKey);
    const primaryRow = map.get(SETTING_KEYS.primaryModel);
    const fallbackRow = map.get(SETTING_KEYS.fallbackModel);
    const timeoutRow = map.get(SETTING_KEYS.timeoutMs);
    const refererRow = map.get(SETTING_KEYS.referer);
    const titleRow = map.get(SETTING_KEYS.title);

    let apiKey: string | null = null;
    if (apiKeyRow?.value) {
      try {
        apiKey = decryptSecret(apiKeyRow.value);
      } catch (error) {
        logger.error('Failed to decrypt OpenRouter API key. Clearing stored secret.', { error });
        apiKey = null;
      }
    }

    const updatedAt = [enabledRow, apiKeyRow, primaryRow, fallbackRow, timeoutRow, refererRow, titleRow]
      .map((row) => row?.updatedAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      enabled: enabledRow?.value === 'true',
      apiKey,
      apiKeyPreview: maskSecret(apiKey),
      hasApiKey: Boolean(apiKey),
      primaryModel: primaryRow?.value || DEFAULTS.primaryModel,
      fallbackModel: fallbackRow?.value || DEFAULTS.fallbackModel,
      timeoutMs: this.parseTimeout(timeoutRow?.value),
      referer: refererRow?.value || DEFAULTS.referer,
      title: titleRow?.value || DEFAULTS.title,
      updatedAt,
    };
  }

  async updateOpenRouter(input: OpenRouterUpdateInput): Promise<OpenRouterPublicConfig> {
    if (input.enabled !== undefined) {
      await this.repository.upsert({
        key: SETTING_KEYS.enabled,
        value: input.enabled ? 'true' : 'false',
        description: 'Liga/desliga a cadeia de OCR via OpenRouter.',
      });
    }

    if (input.apiKey !== undefined) {
      if (input.apiKey === null || input.apiKey.trim() === '') {
        await this.repository.deleteByKey(SETTING_KEYS.apiKey);
      } else {
        await this.repository.upsert({
          key: SETTING_KEYS.apiKey,
          value: encryptSecret(input.apiKey.trim()),
          isSecret: true,
          description: 'Chave de API do OpenRouter (criptografada).',
        });
      }
    }

    if (input.primaryModel !== undefined) {
      await this.repository.upsert({
        key: SETTING_KEYS.primaryModel,
        value: input.primaryModel.trim() || DEFAULTS.primaryModel,
        description: 'Modelo principal usado no OCR via OpenRouter.',
      });
    }

    if (input.fallbackModel !== undefined) {
      await this.repository.upsert({
        key: SETTING_KEYS.fallbackModel,
        value: input.fallbackModel.trim() || DEFAULTS.fallbackModel,
        description: 'Modelo de fallback antes de cair no PaddleOCR.',
      });
    }

    if (input.timeoutMs !== undefined) {
      await this.repository.upsert({
        key: SETTING_KEYS.timeoutMs,
        value: String(this.clampTimeout(input.timeoutMs)),
        description: 'Timeout em ms para cada chamada ao OpenRouter.',
      });
    }

    if (input.referer !== undefined) {
      await this.repository.upsert({
        key: SETTING_KEYS.referer,
        value: input.referer.trim() || DEFAULTS.referer,
        description: 'HTTP-Referer enviado ao OpenRouter (créditos e ranking).',
      });
    }

    if (input.title !== undefined) {
      await this.repository.upsert({
        key: SETTING_KEYS.title,
        value: input.title.trim() || DEFAULTS.title,
        description: 'X-Title enviado ao OpenRouter (créditos e ranking).',
      });
    }

    return this.getOpenRouterPublic();
  }

  /**
   * Tests the OpenRouter connection by listing the user's available models.
   * Uses GET /api/v1/models which is cheap and does not consume credits.
   * If apiKey is provided, uses it; otherwise falls back to the stored one.
   */
  async testOpenRouter(apiKey?: string): Promise<{
    ok: boolean;
    message: string;
    modelCount?: number;
    sampleModels?: string[];
  }> {
    const runtime = await this.getOpenRouterRuntime();
    const effectiveKey = apiKey?.trim() || runtime.apiKey;

    if (!effectiveKey) {
      return { ok: false, message: 'Nenhuma chave de API configurada.' };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(runtime.timeoutMs, 10_000));

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${effectiveKey}`,
          'HTTP-Referer': runtime.referer,
          'X-Title': runtime.title,
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text();
        return {
          ok: false,
          message: `HTTP ${response.status}: ${body.slice(0, 160)}`,
        };
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data ?? [];
      return {
        ok: true,
        message: 'Conexão com OpenRouter validada.',
        modelCount: models.length,
        sampleModels: models.slice(0, 5).map((m) => m.id),
      };
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Tempo esgotado conectando ao OpenRouter.'
          : error instanceof Error
            ? error.message
            : 'Falha desconhecida ao conectar.';
      return { ok: false, message };
    }
  }

  /**
   * Lists the OpenRouter models that actually accept images.
   *
   * The hardcoded frontend list went stale on its own — `:free` vision models
   * come and go constantly. Cached for an hour since it changes slowly and the
   * merchant may reopen the settings page repeatedly.
   */
  async listVisionModels(): Promise<VisionModel[]> {
    const now = Date.now();
    if (visionModelsCache && now - visionModelsCache.fetchedAt < VISION_MODELS_TTL_MS) {
      return visionModelsCache.models;
    }

    const runtime = await this.getOpenRouterRuntime();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          ...(runtime.apiKey ? { Authorization: `Bearer ${runtime.apiKey}` } : {}),
          'HTTP-Referer': runtime.referer,
          'X-Title': runtime.title,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenRouter HTTP ${response.status}`);
      }

      const data = (await response.json()) as { data?: RawOpenRouterModel[] };

      const models = (data.data ?? [])
        .filter((model) => {
          const modalities =
            model.architecture?.input_modalities ?? model.architecture?.modality?.split('+') ?? [];
          return modalities.some((mode) => mode.toLowerCase().includes('image'));
        })
        .map((model) => {
          const promptPrice = Number(model.pricing?.prompt ?? '0');
          const completionPrice = Number(model.pricing?.completion ?? '0');
          return {
            id: model.id,
            name: model.name || model.id,
            isFree: promptPrice === 0 && completionPrice === 0,
            // OpenRouter prices per token; per-million is what humans read.
            promptPricePerMillion: Number.isFinite(promptPrice) ? promptPrice * 1_000_000 : null,
            completionPricePerMillion: Number.isFinite(completionPrice)
              ? completionPrice * 1_000_000
              : null,
            contextLength: model.context_length ?? null,
          };
        })
        .sort((a, b) => {
          if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      visionModelsCache = { models, fetchedAt: now };
      return models;
    } catch (error) {
      logger.warn('Failed to list OpenRouter vision models.', { error });
      // Serve a stale cache rather than nothing.
      if (visionModelsCache) return visionModelsCache.models;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Runs the full recognition chain against a real image.
   *
   * Listing models only proves the key is valid — it says nothing about
   * whether the chosen model can actually read a shopping list. This is the
   * only check that answers that.
   */
  async testRecognition(
    imageBuffer: Buffer,
    catalog: Array<{ id: string; name: string }> = []
  ): Promise<{
    ok: boolean;
    message: string;
    engine?: string;
    modelId?: string;
    durationMs?: number;
    costUsd?: number | null;
    items?: Array<{ text: string; quantity: number | null; unit: string | null }>;
  }> {
    // Imported lazily to avoid a circular import at module load time.
    const { QuoteOcrService } = await import('./quote-ocr.service.js');
    const ocrService = new QuoteOcrService();

    const startedAt = Date.now();
    try {
      const result = await ocrService.recognizeDocument(imageBuffer, catalog);

      return {
        ok: result.lines.length > 0,
        message:
          result.lines.length > 0
            ? `Leitura concluída: ${result.lines.length} itens reconhecidos.`
            : 'A leitura rodou mas nenhum item foi reconhecido na imagem.',
        engine: result.engine,
        modelId: result.modelId,
        durationMs: result.usage?.durationMs ?? Date.now() - startedAt,
        costUsd: result.usage?.costUsd ?? null,
        items: result.lines.slice(0, 20).map((line) => ({
          text: line.text,
          quantity: line.quantity ?? null,
          unit: line.unit ?? null,
        })),
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Falha ao executar a leitura de teste.',
        durationMs: Date.now() - startedAt,
      };
    }
  }

  private parseTimeout(raw: string | undefined): number {
    if (!raw) return DEFAULTS.timeoutMs;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULTS.timeoutMs;
    return this.clampTimeout(parsed);
  }

  private clampTimeout(value: number): number {
    if (value < TIMEOUT_MIN_MS) return TIMEOUT_MIN_MS;
    if (value > TIMEOUT_MAX_MS) return TIMEOUT_MAX_MS;
    return Math.round(value);
  }

  private toPublic(runtime: OpenRouterRuntimeConfig): OpenRouterPublicConfig {
    const { apiKey: _apiKey, ...rest } = runtime;
    return rest;
  }
}
