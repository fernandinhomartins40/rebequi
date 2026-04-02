import { execFile } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.util.js';

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
  source?: 'paddleocr';
  bbox?: BoundingBox;
};

export type RecognizedQuoteDocument = {
  text: string;
  confidence: number;
  lines: RecognizedQuoteLine[];
  source: 'printed' | 'handwritten' | 'hybrid';
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

export class QuoteOcrService {
  private bridgeReadyPromise?: Promise<void>;
  private queue: Promise<void> = Promise.resolve();

  async recognizeDocument(buffer: Buffer): Promise<RecognizedQuoteDocument> {
    return this.enqueue(async () => {
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

        return this.normalizePayload(stdout);
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
    });
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
  return path.resolve(process.cwd(), env.QUOTE_PADDLE_SCRIPT_PATH);
}
