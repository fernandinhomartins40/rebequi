import { createRequire } from 'node:module';
import sharp from 'sharp';
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
      const preparedVariants = await this.prepareImageVariants(buffer);
      const firstPass = await worker.recognize(
        preparedVariants.enhanced,
        {
          rotateAuto: true,
        },
        {
          blocks: true,
        }
      );
      const firstPassDocument = this.buildRecognizedDocument(firstPass.data);

      if (firstPassDocument.lines.length >= 3 || firstPassDocument.confidence >= 55) {
        return firstPassDocument;
      }

      const thresholdPass = await worker.recognize(
        preparedVariants.thresholded,
        {
          rotateAuto: true,
        },
        {
          blocks: true,
        }
      );
      const thresholdDocument = this.buildRecognizedDocument(thresholdPass.data);

      return thresholdDocument.confidence > firstPassDocument.confidence ? thresholdDocument : firstPassDocument;
    });
  }

  private buildRecognizedDocument(page: Tesseract.Page): RecognizedQuoteDocument {
    const lines = this.extractLines(page);

    return {
      text: page.text,
      confidence: page.confidence,
      lines,
    };
  }

  private async prepareImageVariants(buffer: Buffer) {
    const baseImage = sharp(buffer, {
      failOn: 'none',
    }).rotate();
    const metadata = await baseImage.metadata();
    const longestSide = Math.max(metadata.width || 0, metadata.height || 0);
    const normalizedImage =
      longestSide > 2200
        ? baseImage.resize({
            width: metadata.width && metadata.width >= (metadata.height || 0) ? 2200 : undefined,
            height: metadata.height && metadata.height > (metadata.width || 0) ? 2200 : undefined,
            fit: 'inside',
            withoutEnlargement: true,
          })
        : baseImage;

    const enhanced = await normalizedImage
      .clone()
      .grayscale()
      .normalize()
      .sharpen({
        sigma: 1.2,
      })
      .png()
      .toBuffer();

    const thresholded = await sharp(enhanced)
      .threshold(172)
      .png()
      .toBuffer();

    return {
      enhanced,
      thresholded,
    };
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
