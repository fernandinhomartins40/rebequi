import { createRequire } from 'node:module';
import sharp from 'sharp';
import { pipeline, RawImage } from '@huggingface/transformers';
import Tesseract from 'tesseract.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.util.js';

const require = createRequire(import.meta.url);
const porLanguage = require('@tesseract.js-data/por');
const engLanguage = require('@tesseract.js-data/eng');

type BoundingBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type PreparedImageVariants = {
  enhanced: Buffer;
  thresholded: Buffer;
  width: number;
  height: number;
};

export type RecognizedQuoteLine = {
  text: string;
  confidence: number;
  source?: 'tesseract' | 'handwriting';
  bbox?: BoundingBox;
};

export type RecognizedQuoteDocument = {
  text: string;
  confidence: number;
  lines: RecognizedQuoteLine[];
  source: 'printed' | 'handwritten' | 'hybrid';
};

export class QuoteOcrService {
  private workerPromise?: Promise<Tesseract.Worker>;
  private handwritingPipelinePromise?: Promise<any | null>;
  private handwritingModelDisabled = false;
  private queue: Promise<void> = Promise.resolve();

  async recognizeDocument(buffer: Buffer): Promise<RecognizedQuoteDocument> {
    return this.enqueue(async () => {
      const [worker, preparedVariants] = await Promise.all([this.getWorker(), this.prepareImageVariants(buffer)]);

      const firstPass = await this.recognizeWithWorker(worker, preparedVariants.enhanced);
      const thresholdPass =
        firstPass.lines.length >= 3 && firstPass.confidence >= 68
          ? null
          : await this.recognizeWithWorker(worker, preparedVariants.thresholded);

      const baseDocument = this.pickBestPrintedDocument(firstPass, thresholdPass);
      const shouldInspectHandwriting =
        !this.shouldTrustPrintedDocument(baseDocument) || baseDocument.lines.some((line) => line.confidence < 78);

      if (!shouldInspectHandwriting) {
        return baseDocument;
      }

      const handwritingPipeline = await this.getHandwritingPipeline();
      if (!handwritingPipeline) {
        return baseDocument;
      }

      const handwritingLines = await this.recognizeHandwrittenLines({
        image: preparedVariants.enhanced,
        lines: baseDocument.lines,
        handwritingPipeline,
      });

      if (handwritingLines.length === 0) {
        return baseDocument;
      }

      return this.buildRecognizedDocument(handwritingLines);
    });
  }

  private async recognizeWithWorker(worker: Tesseract.Worker, image: Buffer): Promise<RecognizedQuoteDocument> {
    const page = await worker.recognize(
      image,
      {
        rotateAuto: true,
      },
      {
        blocks: true,
      }
    );

    return this.buildRecognizedDocument(this.extractLines(page.data));
  }

  private buildRecognizedDocument(lines: RecognizedQuoteLine[]): RecognizedQuoteDocument {
    const normalizedLines = lines
      .map((line) => ({
        ...line,
        text: this.cleanOutputText(line.text),
      }))
      .filter((line) => line.text.length > 0);

    const text = normalizedLines.map((line) => line.text).join('\n');
    const confidence = normalizedLines.length > 0 ? this.averageConfidence(normalizedLines) : 0;
    const source = normalizedLines.some((line) => line.source === 'handwriting')
      ? 'hybrid'
      : 'printed';

    return {
      text,
      confidence,
      lines: normalizedLines,
      source,
    };
  }

  private async prepareImageVariants(buffer: Buffer): Promise<PreparedImageVariants> {
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

    const enhancedMetadata = await sharp(enhanced).metadata();

    const thresholded = await sharp(enhanced)
      .threshold(172)
      .png()
      .toBuffer();

    return {
      enhanced,
      thresholded,
      width: enhancedMetadata.width ?? metadata.width ?? 0,
      height: enhancedMetadata.height ?? metadata.height ?? 0,
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
              bbox: line.bbox,
              source: 'tesseract' as const,
            }))
            .filter((line) => line.text.length > 0)
        )
      ) ?? [];

    if (lines.length > 0) {
      return lines;
    }

    return page.text
      .split(/\n+/)
      .map((text) => text.trim())
      .filter((text) => text.length > 0)
      .map((text) => ({
        text,
        confidence: page.confidence,
        source: 'tesseract' as const,
        bbox: {
          x0: 0,
          y0: 0,
          x1: 0,
          y1: 0,
        },
      }));
  }

  private async recognizeHandwrittenLines(params: {
    image: Buffer;
    lines: RecognizedQuoteLine[];
    handwritingPipeline: any;
  }): Promise<RecognizedQuoteLine[]> {
    const candidateLines = params.lines.filter(
      (line): line is RecognizedQuoteLine & { bbox: BoundingBox } => this.hasCropableBoundingBox(line)
    );

    if (candidateLines.length === 0) {
      return this.recognizeWholeImageWithHandwritingModel(params.image, params.handwritingPipeline);
    }

    const recognizedLines: RecognizedQuoteLine[] = [];

    for (const line of candidateLines) {
      const handwritingText = await this.recognizeHandwritingCrop(params.image, line.bbox, params.handwritingPipeline);
      recognizedLines.push(this.pickBetterLine({
        baseLine: line,
        handwritingText,
      }));
    }

    return recognizedLines.length > 0 ? recognizedLines : this.recognizeWholeImageWithHandwritingModel(params.image, params.handwritingPipeline);
  }

  private async recognizeWholeImageWithHandwritingModel(image: Buffer, handwritingPipeline: any): Promise<RecognizedQuoteLine[]> {
    try {
      const handwritingText = await this.recognizeHandwritingCrop(
        image,
        {
          x0: 0,
          y0: 0,
          x1: 0,
          y1: 0,
        },
        handwritingPipeline,
        true
      );

      if (!handwritingText) {
        return [];
      }

      return [
        {
          text: handwritingText,
          confidence: 50,
          source: 'handwriting',
        },
      ];
    } catch {
      return [];
    }
  }

  private async recognizeHandwritingCrop(
    image: Buffer,
    bbox: BoundingBox,
    handwritingPipeline: any,
    wholeImage = false
  ): Promise<string> {
    const cropBuffer = wholeImage ? image : await this.cropLineImage(image, bbox);
    if (!cropBuffer) {
      return '';
    }

    const rawImage = await RawImage.read(new Blob([cropBuffer], { type: 'image/png' }));
    const output = await handwritingPipeline(rawImage);

    return this.extractGeneratedText(output);
  }

  private extractGeneratedText(output: any): string {
    const firstResult = Array.isArray(output) ? output[0] : output;

    if (!firstResult) {
      return '';
    }

    const text = firstResult.generated_text ?? firstResult.text ?? '';
    return this.cleanOutputText(String(text));
  }

  private pickBetterLine(params: {
    baseLine: RecognizedQuoteLine;
    handwritingText: string;
  }): RecognizedQuoteLine {
    const baseLine = params.baseLine;
    const handwritingText = this.cleanOutputText(params.handwritingText);

    if (handwritingText.length === 0) {
      return baseLine;
    }

    const baseScore = this.textQualityScore(baseLine.text);
    const handwritingScore = this.textQualityScore(handwritingText);
    const handwritingHasMoreLetters = this.letterCount(handwritingText) >= this.letterCount(baseLine.text);
    const handwritingLooksReadable = handwritingScore >= baseScore || handwritingHasMoreLetters;
    const shouldReplace = baseLine.confidence < 78 && handwritingLooksReadable;

    if (!shouldReplace) {
      return baseLine;
    }

    return {
      text: handwritingText,
      confidence: Math.max(45, Math.min(90, Math.round(baseLine.confidence + 8))),
      source: 'handwriting',
      bbox: baseLine.bbox,
    };
  }

  private async cropLineImage(image: Buffer, bbox: BoundingBox): Promise<Buffer | null> {
    const paddingX = Math.max(10, Math.round((bbox.x1 - bbox.x0) * 0.06));
    const paddingY = Math.max(8, Math.round((bbox.y1 - bbox.y0) * 0.18));
    const metadata = await sharp(image).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    const left = Math.max(0, Math.floor(bbox.x0 - paddingX));
    const top = Math.max(0, Math.floor(bbox.y0 - paddingY));
    const right = Math.min(width, Math.ceil(bbox.x1 + paddingX));
    const bottom = Math.min(height, Math.ceil(bbox.y1 + paddingY));
    const cropWidth = right - left;
    const cropHeight = bottom - top;

    if (cropWidth <= 1 || cropHeight <= 1) {
      return null;
    }

    return sharp(image)
      .extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight,
      })
      .normalize()
      .sharpen({
        sigma: 0.8,
      })
      .png()
      .toBuffer();
  }

  private canCropLine(bbox: BoundingBox): boolean {
    return bbox.x1 > bbox.x0 + 3 && bbox.y1 > bbox.y0 + 3;
  }

  private hasCropableBoundingBox(line: RecognizedQuoteLine): line is RecognizedQuoteLine & { bbox: BoundingBox } {
    return !!line.bbox && this.canCropLine(line.bbox);
  }

  private shouldTrustPrintedDocument(document: RecognizedQuoteDocument): boolean {
    if (document.lines.length === 0) {
      return false;
    }

    if (document.confidence >= 82 && document.lines.length >= 2) {
      return true;
    }

    return document.confidence >= 72 && !this.looksLikeHandwrittenText(document.text);
  }

  private looksLikeHandwrittenText(text: string): boolean {
    const normalized = this.normalizeRecognizedText(text);

    if (!normalized) {
      return true;
    }

    const letters = this.letterCount(normalized);
    const digits = (normalized.match(/\d/g) ?? []).length;
    const words = normalized.split(' ').filter((token) => token.length >= 2);
    const weirdSymbols = (text.match(/[^A-Za-zÀ-ÿ0-9\s.,;:()/\-]/g) ?? []).length;
    const readableRatio = letters / Math.max(1, normalized.length);

    return weirdSymbols > 2 || (words.length <= 2 && letters >= 5 && readableRatio < 0.55) || (digits >= 3 && readableRatio < 0.45);
  }

  private normalizeRecognizedText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanOutputText(value: string) {
    return value.replace(/\s+/g, ' ').trim();
  }

  private letterCount(value: string) {
    return (value.match(/[a-z]/gi) ?? []).length;
  }

  private textQualityScore(value: string) {
    const normalized = this.normalizeRecognizedText(value);

    if (!normalized) {
      return 0;
    }

    const letters = this.letterCount(normalized);
    const words = normalized.split(' ').filter((token) => token.length >= 2);
    const weirdSymbols = (normalized.match(/[^a-z0-9\s]/gi) ?? []).length;
    return letters + words.length * 2 - weirdSymbols * 1.5;
  }

  private averageConfidence(lines: RecognizedQuoteLine[]) {
    const total = lines.reduce((sum, line) => sum + (line.confidence || 0), 0);
    return Number((total / lines.length).toFixed(2));
  }

  private pickBestPrintedDocument(firstPass: RecognizedQuoteDocument, thresholdPass: RecognizedQuoteDocument | null) {
    if (!thresholdPass) {
      return firstPass;
    }

    const firstScore = this.textQualityScore(firstPass.text) + firstPass.confidence / 2;
    const thresholdScore = this.textQualityScore(thresholdPass.text) + thresholdPass.confidence / 2;

    return thresholdScore > firstScore ? thresholdPass : firstPass;
  }

  private async getHandwritingPipeline(): Promise<any | null> {
    if (this.handwritingModelDisabled) {
      return null;
    }

    if (!this.handwritingPipelinePromise) {
      this.handwritingPipelinePromise = pipeline('image-to-text', env.QUOTE_HANDWRITING_MODEL, {
        device: 'auto',
      }).catch((error: unknown) => {
        this.handwritingModelDisabled = true;
        logger.warn('Handwriting OCR model unavailable, falling back to Tesseract only.', {
          error,
          model: env.QUOTE_HANDWRITING_MODEL,
        });
        return null;
      });
    }

    return this.handwritingPipelinePromise;
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
