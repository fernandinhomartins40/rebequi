import { createRequire } from 'node:module';
import Tesseract from 'tesseract.js';

const require = createRequire(import.meta.url);
const porLanguage = require('@tesseract.js-data/por');
const engLanguage = require('@tesseract.js-data/eng');

export type RecognizedQuoteLine = {
  text: string;
  confidence: number;
};

export type RecognizedQuoteDocument = {
  text: string;
  confidence: number;
  lines: RecognizedQuoteLine[];
};

export class QuoteOcrService {
  private workerPromise?: Promise<Tesseract.Worker>;
  private queue: Promise<void> = Promise.resolve();

  async recognizeDocument(buffer: Buffer): Promise<RecognizedQuoteDocument> {
    return this.enqueue(async () => {
      const worker = await this.getWorker();
      const result = await worker.recognize(
        buffer,
        {
          rotateAuto: true,
        },
        {
          blocks: true,
        }
      );

      const lines = this.extractLines(result.data);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        lines,
      };
    });
  }

  private extractLines(page: Tesseract.Page): RecognizedQuoteLine[] {
    const lines =
      page.blocks?.flatMap((block) =>
        block.paragraphs.flatMap((paragraph) =>
          paragraph.lines
            .map((line) => ({
              text: line.text.trim(),
              confidence: line.confidence,
            }))
            .filter((line) => line.text.length > 0)
        )
      ) ?? [];

    return lines;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.queue.then(fn, fn);
    this.queue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }

  private async getWorker(): Promise<Tesseract.Worker> {
    if (!this.workerPromise) {
      this.workerPromise = Tesseract.createWorker(
        [porLanguage, engLanguage],
        Tesseract.OEM.DEFAULT,
        {
          gzip: true,
        }
      ).then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          preserve_interword_spaces: '1',
        });
        return worker;
      });
    }

    return this.workerPromise;
  }
}
