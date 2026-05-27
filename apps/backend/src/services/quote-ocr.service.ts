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
  source?: 'paddleocr' | 'openrouter';
  bbox?: BoundingBox;
};

export type RecognizedQuoteDocument = {
  text: string;
  confidence: number;
  lines: RecognizedQuoteLine[];
  source: 'printed' | 'handwritten' | 'hybrid';
  engine?: 'paddleocr' | 'openrouter';
  modelId?: string;
};

const OPENROUTER_PROMPT = `Você é um extrator de pedidos de loja brasileira de material de construção.
A imagem é uma foto de uma lista de compras, podendo ser impressa ou manuscrita.

Extraia APENAS os itens de produto que serão comprados. Ignore cabeçalho,
contato, endereço, datas e observações sociais.

Para cada item retorne: text (texto exato do item incluindo quantidade e
unidade quando presente, mantendo a ordem original) e confidence (0 a 100).

Retorne EXCLUSIVAMENTE JSON no formato:
{ "lines": [ { "text": "...", "confidence": 0 } ], "source": "printed" | "handwritten" | "hybrid" }

Sem texto antes ou depois.`;

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

export class QuoteOcrService {
  private bridgeReadyPromise?: Promise<void>;
  private queue: Promise<void> = Promise.resolve();
  private settingsService: IntegrationSettingsService;

  constructor() {
    this.settingsService = new IntegrationSettingsService();
  }

  async recognizeDocument(buffer: Buffer): Promise<RecognizedQuoteDocument> {
    return this.enqueue(async () => {
      // 1. Tenta OpenRouter quando habilitado e configurado.
      const openRouterConfig = await this.settingsService.getOpenRouterRuntime();
      if (openRouterConfig.enabled && openRouterConfig.apiKey) {
        const modelsToTry = [openRouterConfig.primaryModel, openRouterConfig.fallbackModel].filter(
          (model, index, arr) => Boolean(model) && arr.indexOf(model) === index
        );

        for (const modelId of modelsToTry) {
          try {
            const result = await this.recognizeWithOpenRouter(buffer, modelId, openRouterConfig);
            if (result.lines.length > 0) {
              return result;
            }
            logger.warn('OpenRouter model returned no lines, trying next.', { modelId });
          } catch (error) {
            logger.warn('OpenRouter model failed, trying next.', { modelId, error });
          }
        }
        logger.warn('All OpenRouter models failed. Falling back to PaddleOCR.');
      }

      // 2. PaddleOCR (sempre disponível como fallback)
      return this.recognizeWithPaddle(buffer);
    });
  }

  private async recognizeWithPaddle(buffer: Buffer): Promise<RecognizedQuoteDocument> {
    await this.ensureBridgeReady();

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
      return { ...payload, engine: 'paddleocr' };
    } catch (error) {
      logger.error('PaddleOCR failed to recognize quote document.', {
        error,
      });
      throw new Error('Nao foi possivel reconhecer o documento com PaddleOCR.');
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  }

  private async recognizeWithOpenRouter(
    buffer: Buffer,
    modelId: string,
    config: OpenRouterRuntimeConfig
  ): Promise<RecognizedQuoteDocument> {
    if (!config.apiKey) {
      throw new Error('Chave do OpenRouter ausente.');
    }

    const jpegBuffer = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .jpeg({ quality: 88 })
      .toBuffer();
    const dataUrl = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

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
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: dataUrl } },
                { type: 'text', text: OPENROUTER_PROMPT },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawText = data.choices?.[0]?.message?.content ?? '';
      return this.parseOpenRouterResponse(rawText, modelId);
    } finally {
      clearTimeout(timer);
    }
  }

  private parseOpenRouterResponse(rawText: string, modelId: string): RecognizedQuoteDocument {
    const cleaned = rawText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    let parsed: {
      lines?: Array<{ text?: string; confidence?: number }>;
      source?: 'printed' | 'handwritten' | 'hybrid';
    } | null = null;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || !Array.isArray(parsed.lines)) {
      throw new Error('Resposta do OpenRouter não pôde ser interpretada como JSON.');
    }

    const lines: RecognizedQuoteLine[] = parsed.lines
      .map((line) => ({
        text: this.cleanOutputText(String(line.text || '')),
        confidence: Number(line.confidence ?? 90),
        source: 'openrouter' as const,
      }))
      .filter((line) => line.text.length > 0);

    return {
      text: lines.map((line) => line.text).join('\n'),
      confidence: lines.length > 0 ? this.averageConfidence(lines) : 0,
      lines,
      source: parsed.source || 'hybrid',
      engine: 'openrouter',
      modelId,
    };
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
        throw new Error('PaddleOCR nao esta disponivel no ambiente atual.');
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

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.queue.then(fn, fn);
    this.queue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }
}

function resolveBridgeScriptPath() {
  const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  return path.resolve(backendRoot, env.QUOTE_PADDLE_SCRIPT_PATH);
}
