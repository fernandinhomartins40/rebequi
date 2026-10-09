import { execFile } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.util.js';
import {
  IntegrationSettingsService,
  type OpenRouterRuntimeConfig,
} from './integration-settings.service.js';

const execFileAsync = promisify(execFile);

export type BoundingBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type RecognizedQuoteLine = {
  text: string;
  confidence: number;
  source?: 'paddleocr' | 'openrouter' | 'manual';
  bbox?: BoundingBox;
  /** Quantity resolved by the model, when it returned a structured item. */
  quantity?: number | null;
  /** Unit resolved by the model, when it returned a structured item. */
  unit?: string | null;
  /** Catalogue product the model matched this line to, already validated. */
  productId?: string | null;
  /** Exactly what was written on the paper, before any correction. */
  recognitionSourceLine?: string | null;
};

export type RecognizedQuoteDocument = {
  text: string;
  confidence: number;
  lines: RecognizedQuoteLine[];
  source: 'printed' | 'handwritten' | 'hybrid';
  engine?: 'paddleocr' | 'openrouter';
  modelId?: string;
  /** Telemetry for the OcrRun record. */
  usage?: {
    durationMs: number;
    promptTokens?: number;
    completionTokens?: number;
    costUsd?: number;
  };
};

/** A catalogue entry offered to the model so it can resolve names itself. */
export type CatalogHint = {
  id: string;
  name: string;
};

const OPENROUTER_SYSTEM_PROMPT = `Você extrai listas de compras de lojas brasileiras de material de construção.
A imagem é uma foto de uma lista, impressa ou manuscrita, muitas vezes informal.

Regras:
- Extraia APENAS itens de produto. Ignore cabeçalho, nome, telefone, endereço, data e recados.
- Separe a quantidade do nome do produto. "5 sc cimento" tem quantidade 5, unidade "sc", produto "cimento".
- Quando não houver quantidade explícita, use 1.
- Cuidado: medidas fazem parte do nome, não são quantidade. Em "tinta 18L" a quantidade é 1
  e o produto é "tinta 18L". Em "2 caixas de porcelanato 60x60" a quantidade é 2 e o produto
  é "porcelanato 60x60".
- confianca é sua certeza na leitura daquela linha, de 0 a 1. Seja honesto: use valores baixos
  quando a caligrafia estiver ruim ou ambígua.
- texto_original deve conter exatamente o que está escrito no papel, sem correções.
- Mantenha a ordem em que os itens aparecem na lista.`;

const CATALOG_INSTRUCTIONS = `
Os produtos abaixo são os que esta loja vende. Quando um item da lista corresponder
claramente a um deles, devolva o produto_id exato entre colchetes.
Se não corresponder a nenhum, devolva produto_id null e transcreva o texto como está.
NUNCA invente um id que não esteja nesta lista.`;

const QUOTE_JSON_SCHEMA = {
  name: 'lista_de_compras',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['itens', 'tipo_documento'],
    properties: {
      tipo_documento: {
        type: 'string',
        enum: ['impresso', 'manuscrito', 'misto'],
      },
      itens: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['produto', 'quantidade', 'unidade', 'confianca', 'texto_original', 'produto_id'],
          properties: {
            produto: { type: 'string' },
            quantidade: { type: 'number' },
            unidade: { type: ['string', 'null'] },
            confianca: { type: 'number' },
            texto_original: { type: 'string' },
            produto_id: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
} as const;

/** Above this size the catalogue is not inlined into the prompt. */
const MAX_INLINE_CATALOG = 300;

const DOC_TYPE_TO_SOURCE = {
  impresso: 'printed',
  manuscrito: 'handwritten',
  misto: 'hybrid',
} as const;

type ParsedOpenRouterItem = {
  produto?: string;
  quantidade?: number;
  unidade?: string | null;
  confianca?: number;
  texto_original?: string;
  produto_id?: string | null;
};

type PaddleOcrPayload = {
  text?: string;
  confidence?: number;
  source?: 'printed' | 'handwritten' | 'hybrid';
  lines?: Array<{
    text?: string;
    confidence?: number;
    bbox?: BoundingBox;
  }>;
};

/** Retry policy for transient OpenRouter failures. */
const MAX_ATTEMPTS_PER_MODEL = 2;
const BASE_BACKOFF_MS = 1000;
/** Concurrent OpenRouter calls allowed. Network-bound, so serialising is waste. */
const OPENROUTER_CONCURRENCY = 4;

class RetryableOpenRouterError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'RetryableOpenRouterError';
  }
}

export class QuoteOcrService {
  private bridgeReadyPromise?: Promise<void>;
  /** Serialises local OCR only — it spawns a CPU-heavy subprocess. */
  private localQueue: Promise<void> = Promise.resolve();
  private inFlightOpenRouter = 0;
  private openRouterWaiters: Array<() => void> = [];
  private settingsService: IntegrationSettingsService;

  constructor() {
    this.settingsService = new IntegrationSettingsService();
  }

  async recognizeDocument(buffer: Buffer, catalog: CatalogHint[] = []): Promise<RecognizedQuoteDocument> {
    const openRouterConfig = await this.settingsService.getOpenRouterRuntime();

    if (openRouterConfig.enabled && openRouterConfig.apiKey) {
      const modelsToTry = [openRouterConfig.primaryModel, openRouterConfig.fallbackModel].filter(
        (model, index, arr) => Boolean(model) && arr.indexOf(model) === index
      );

      for (const modelId of modelsToTry) {
        try {
          const result = await this.runWithOpenRouterSlot(() =>
            this.recognizeWithOpenRouterRetrying(buffer, modelId, openRouterConfig, catalog)
          );
          if (result.lines.length > 0) {
            return result;
          }
          logger.warn('OpenRouter model returned no lines, trying next.', { modelId });
        } catch (error) {
          logger.warn('OpenRouter model failed, trying next.', { modelId, error });
        }
      }
      logger.warn('All OpenRouter models failed. Falling back to local OCR engine.');
    }

    return this.enqueueLocal(() => this.recognizeWithPaddle(buffer));
  }

  /**
   * Reports whether each engine of the chain is actually usable right now.
   * Backs the OCR health endpoint so the merchant learns about a degraded
   * chain before customers do.
   */
  async getEngineHealth() {
    const config = await this.settingsService.getOpenRouterRuntime();

    let localAvailable = false;
    let localError: string | null = null;
    try {
      await this.ensureBridgeReady();
      localAvailable = true;
    } catch (error) {
      localError = error instanceof Error ? error.message : 'Motor local indisponível';
    }

    const openRouterUsable = config.enabled && Boolean(config.apiKey);

    return {
      openrouter: {
        enabled: config.enabled,
        hasApiKey: config.hasApiKey,
        primaryModel: config.primaryModel,
        fallbackModel: config.fallbackModel,
        usable: openRouterUsable,
      },
      local: {
        engine: 'paddleocr' as const,
        available: localAvailable,
        error: localError,
      },
      // No engine at all means every incoming quote will fail.
      degraded: !openRouterUsable || !localAvailable,
      unavailable: !openRouterUsable && !localAvailable,
    };
  }

  private async recognizeWithPaddle(buffer: Buffer): Promise<RecognizedQuoteDocument> {
    await this.ensureBridgeReady();

    const startedAt = Date.now();
    const tempDir = await mkdtemp(path.join(tmpdir(), 'rebequi-quote-ocr-'));
    const imagePath = path.join(tempDir, 'document.png');

    try {
      await this.prepareImage(buffer).toFile(imagePath);

      const { stdout, stderr } = await execFileAsync(
        env.QUOTE_PADDLE_PYTHON_BIN,
        [resolveBridgeScriptPath(), '--image', imagePath, '--lang', env.QUOTE_PADDLE_LANG],
        {
          timeout: env.QUOTE_PADDLE_TIMEOUT_MS,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      if (stderr?.trim()) {
        logger.warn('PaddleOCR bridge emitted stderr output.', {
          stderr,
        });
      }

      const payload = this.normalizePayload(stdout);
      return {
        ...payload,
        engine: 'paddleocr',
        usage: { durationMs: Date.now() - startedAt },
      };
    } catch (error) {
      logger.error('PaddleOCR failed to recognize quote document.', {
        error,
      });
      throw new Error('Não foi possível reconhecer o documento com PaddleOCR.');
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  }

  /** Wraps a single model with bounded retries for transient failures. */
  private async recognizeWithOpenRouterRetrying(
    buffer: Buffer,
    modelId: string,
    config: OpenRouterRuntimeConfig,
    catalog: CatalogHint[]
  ): Promise<RecognizedQuoteDocument> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await this.recognizeWithOpenRouter(buffer, modelId, config, catalog);
      } catch (error) {
        lastError = error;

        const retryable = error instanceof RetryableOpenRouterError;
        if (!retryable || attempt === MAX_ATTEMPTS_PER_MODEL) {
          throw error;
        }

        // Honour Retry-After when the API sent one; otherwise exponential
        // backoff with jitter so parallel requests don't retry in lockstep.
        const backoff =
          error.retryAfterMs ?? BASE_BACKOFF_MS * 2 ** (attempt - 1) + Math.random() * 400;

        logger.warn('OpenRouter transient failure, retrying.', {
          modelId,
          attempt,
          backoffMs: Math.round(backoff),
        });
        await sleep(backoff);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Falha ao chamar o OpenRouter.');
  }

  private async recognizeWithOpenRouter(
    buffer: Buffer,
    modelId: string,
    config: OpenRouterRuntimeConfig,
    catalog: CatalogHint[]
  ): Promise<RecognizedQuoteDocument> {
    if (!config.apiKey) {
      throw new Error('Chave do OpenRouter ausente.');
    }

    const startedAt = Date.now();
    const jpegBuffer = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .jpeg({ quality: 88 })
      .toBuffer();
    const dataUrl = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

    const inlineCatalog = catalog.length > 0 && catalog.length <= MAX_INLINE_CATALOG ? catalog : [];
    const prompt = this.buildPrompt(inlineCatalog);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': config.referer,
          'X-Title': config.title,
        },
        body: JSON.stringify({
          model: modelId,
          temperature: 0,
          max_tokens: 4000,
          response_format: { type: 'json_schema', json_schema: QUOTE_JSON_SCHEMA },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: dataUrl } },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        const message = `OpenRouter HTTP ${response.status}: ${body.slice(0, 200)}`;

        // 429 and 5xx are worth retrying; 4xx (bad key, bad model) are not.
        if (response.status === 429 || response.status >= 500) {
          throw new RetryableOpenRouterError(message, parseRetryAfter(response));
        }
        throw new Error(message);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
      };
      const rawText = data.choices?.[0]?.message?.content ?? '';
      const parsed = this.parseOpenRouterResponse(rawText, modelId, catalog);

      return {
        ...parsed,
        usage: {
          durationMs: Date.now() - startedAt,
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          costUsd: data.usage?.cost,
        },
      };
    } catch (error) {
      // A timeout surfaces as AbortError — worth one more shot.
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RetryableOpenRouterError(
          `Tempo esgotado (${config.timeoutMs}ms) chamando ${modelId}.`
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private buildPrompt(catalog: CatalogHint[]): string {
    if (catalog.length === 0) {
      return OPENROUTER_SYSTEM_PROMPT;
    }

    const list = catalog.map((product) => `[${product.id}] ${product.name}`).join('\n');
    return `${OPENROUTER_SYSTEM_PROMPT}\n${CATALOG_INSTRUCTIONS}\n\n${list}`;
  }

  private parseOpenRouterResponse(
    rawText: string,
    modelId: string,
    catalog: CatalogHint[]
  ): RecognizedQuoteDocument {
    const parsed = this.extractJson(rawText);

    // Accept both the structured schema and the older { lines: [...] } shape,
    // since models that ignore json_schema still answer in free form.
    const rawItems: ParsedOpenRouterItem[] = Array.isArray(parsed?.itens)
      ? parsed.itens
      : Array.isArray(parsed?.lines)
        ? (parsed.lines as Array<{ text?: string; confidence?: number }>).map((line) => ({
            produto: line.text,
            confianca: typeof line.confidence === 'number' ? line.confidence / 100 : undefined,
            texto_original: line.text,
          }))
        : [];

    if (rawItems.length === 0 && !parsed) {
      throw new Error('Resposta do OpenRouter não pôde ser interpretada como JSON.');
    }

    // Never trust an id the model produced — it may be hallucinated.
    const validIds = new Set(catalog.map((product) => product.id));

    const lines: RecognizedQuoteLine[] = rawItems
      .map((item) => {
        const produto = this.cleanOutputText(String(item.produto ?? ''));
        const original = this.cleanOutputText(String(item.texto_original ?? produto));
        const productId =
          item.produto_id && validIds.has(item.produto_id) ? item.produto_id : null;

        if (item.produto_id && !productId) {
          logger.warn('OpenRouter returned an unknown product id; ignoring it.', {
            modelId,
            produtoId: item.produto_id,
          });
        }

        return {
          text: produto,
          // Model self-reported confidence is 0..1; normalise to the 0..100
          // scale the rest of the pipeline expects.
          confidence: clampConfidence(item.confianca) * 100,
          source: 'openrouter' as const,
          quantity: typeof item.quantidade === 'number' && item.quantidade > 0 ? item.quantidade : null,
          unit: item.unidade ? String(item.unidade) : null,
          productId,
          recognitionSourceLine: original,
        };
      })
      .filter((line) => line.text.length > 0);

    const docType = parsed?.tipo_documento as keyof typeof DOC_TYPE_TO_SOURCE | undefined;

    return {
      text: lines.map((line) => line.text).join('\n'),
      confidence: lines.length > 0 ? this.averageConfidence(lines) : 0,
      lines,
      source: (docType && DOC_TYPE_TO_SOURCE[docType]) || 'hybrid',
      engine: 'openrouter',
      modelId,
    };
  }

  /**
   * Pulls a JSON object out of a model reply. With json_schema the reply is
   * already clean, but models that ignore it still wrap output in prose or
   * fences, so the salvage path stays.
   */
  private extractJson(rawText: string): {
    itens?: ParsedOpenRouterItem[];
    lines?: unknown[];
    tipo_documento?: string;
  } | null {
    const cleaned = rawText
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```\s*$/, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  private prepareImage(buffer: Buffer) {
    return sharp(buffer, {
      failOn: 'none',
    })
      .rotate()
      .grayscale()
      .normalize()
      .sharpen({
        sigma: 1,
      })
      .png();
  }

  private async ensureBridgeReady() {
    if (!this.bridgeReadyPromise) {
      this.bridgeReadyPromise = (async () => {
        const scriptPath = resolveBridgeScriptPath();
        await access(scriptPath);
        await execFileAsync(env.QUOTE_PADDLE_PYTHON_BIN, [scriptPath, '--check'], {
          timeout: 30_000,
          maxBuffer: 1024 * 1024,
        });
      })().catch((error: unknown) => {
        logger.error('PaddleOCR bridge is not available.', {
          error,
          pythonBin: env.QUOTE_PADDLE_PYTHON_BIN,
          scriptPath: env.QUOTE_PADDLE_SCRIPT_PATH,
        });
        // Clear the cache so a later call can retry instead of being stuck
        // with a permanently rejected promise.
        this.bridgeReadyPromise = undefined;
        throw new Error('PaddleOCR não está disponível no ambiente atual.');
      });
    }

    await this.bridgeReadyPromise;
  }

  private normalizePayload(stdout: string): RecognizedQuoteDocument {
    const payload = JSON.parse(stdout.trim()) as PaddleOcrPayload;
    const lines = (payload.lines ?? [])
      .map((line) => ({
        text: this.cleanOutputText(line.text || ''),
        confidence: Number(line.confidence || 0),
        bbox: line.bbox,
        source: 'paddleocr' as const,
      }))
      .filter((line) => line.text.length > 0);

    if (lines.length === 0 && payload.text) {
      const textLines = payload.text
        .split(/\n+/)
        .map((line) => this.cleanOutputText(line))
        .filter(Boolean)
        .map((line) => ({
          text: line,
          confidence: Number(payload.confidence || 0),
          source: 'paddleocr' as const,
        }));

      return {
        text: textLines.map((line) => line.text).join('\n'),
        confidence: textLines.length > 0 ? this.averageConfidence(textLines) : 0,
        lines: textLines,
        source: payload.source || 'hybrid',
      };
    }

    return {
      text: lines.map((line) => line.text).join('\n'),
      confidence: lines.length > 0 ? this.averageConfidence(lines) : Number(payload.confidence || 0),
      lines,
      source: payload.source || 'hybrid',
    };
  }

  private cleanOutputText(value: string) {
    return value.replace(/\s+/g, ' ').trim();
  }

  private averageConfidence(lines: Array<{ confidence: number }>) {
    const total = lines.reduce((sum, line) => sum + (line.confidence || 0), 0);
    return Number((total / lines.length).toFixed(2));
  }

  /** Bounded parallelism for network-bound OpenRouter calls. */
  private async runWithOpenRouterSlot<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inFlightOpenRouter >= OPENROUTER_CONCURRENCY) {
      await new Promise<void>((resolve) => this.openRouterWaiters.push(resolve));
    }
    this.inFlightOpenRouter++;
    try {
      return await fn();
    } finally {
      this.inFlightOpenRouter--;
      this.openRouterWaiters.shift()?.();
    }
  }

  /** Strict serialisation for the CPU-bound local engine. */
  private enqueueLocal<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.localQueue.then(fn, fn);
    this.localQueue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }
}

function clampConfidence(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.8;
  // Tolerate models that answer on a 0..100 scale despite the instructions.
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return Math.min(1, Math.max(0, normalized));
}

function parseRetryAfter(response: Response): number | undefined {
  const header = response.headers.get('retry-after');
  if (!header) return undefined;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000);

  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), 30_000);

  return undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveBridgeScriptPath() {
  const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  return path.resolve(backendRoot, env.QUOTE_PADDLE_SCRIPT_PATH);
}
