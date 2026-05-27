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
  timeoutMs: 12_000,
  referer: 'https://rebequi.com.br',
  title: 'Rebequi OCR',
} as const;

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

  private parseTimeout(raw: string | undefined): number {
    if (!raw) return DEFAULTS.timeoutMs;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULTS.timeoutMs;
    return this.clampTimeout(parsed);
  }

  private clampTimeout(value: number): number {
    if (value < 2000) return 2000;
    if (value > 60_000) return 60_000;
    return Math.round(value);
  }

  private toPublic(runtime: OpenRouterRuntimeConfig): OpenRouterPublicConfig {
    const { apiKey: _apiKey, ...rest } = runtime;
    return rest;
  }
}
