import Jscanify from 'jscanify/client';

type OpenCvNamespace = any;

type ScannerCornerPoint = {
  x: number;
  y: number;
};

type ScannerCornerPoints = {
  topLeftCorner?: ScannerCornerPoint;
  topRightCorner?: ScannerCornerPoint;
  bottomLeftCorner?: ScannerCornerPoint;
  bottomRightCorner?: ScannerCornerPoint;
};

type DetectionDetails = {
  detection: DocumentDetection;
  corners: Required<ScannerCornerPoints>;
  targetWidth: number;
  targetHeight: number;
};

export type DocumentScannerPoint = {
  x: number;
  y: number;
};

export type DocumentDetection = {
  points: DocumentScannerPoint[];
  coverage: number;
  score: number;
};

export type ProcessedDocumentResult = {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
  autoCropped: boolean;
  qualityScore: number;
};

const ANALYSIS_MAX_SIDE = 960;
const CAPTURE_MAX_SIDE = 2200;
const OUTPUT_MAX_SIDE = 1700;
const MIN_DOCUMENT_COVERAGE = 0.12;

let openCvPromise: Promise<OpenCvNamespace> | null = null;
let scannerPromise: Promise<Jscanify> | null = null;

declare global {
  interface Window {
    cv?: OpenCvNamespace;
  }
}

export async function loadOpenCv() {
  if (!openCvPromise) {
    openCvPromise = (async () => {
      const module = await import('@techstark/opencv-js');
      const cvModule = module.default || module;
      const resolved =
        cvModule instanceof Promise
          ? await cvModule
          : typeof cvModule.Mat === 'function'
            ? cvModule
            : await new Promise<OpenCvNamespace>((resolve) => {
                cvModule.onRuntimeInitialized = () => resolve(cvModule);
              });

      if (typeof window !== 'undefined') {
        window.cv = resolved;
      }

      return resolved;
    })();
  }

  return openCvPromise;
}

export async function prepareDocumentFromVideo(params: {
  video: HTMLVideoElement;
  fileName?: string;
}) {
  const sourceCanvas = document.createElement('canvas');
  drawSourceToCanvas(params.video, sourceCanvas, CAPTURE_MAX_SIDE);

  return processSourceCanvas(sourceCanvas);
}

export async function prepareDocumentFromFile(params: {
  file: File;
  fileName?: string;
}) {
  const image = await loadImageElement(params.file);
  const sourceCanvas = document.createElement('canvas');

  try {
    drawSourceToCanvas(image, sourceCanvas, CAPTURE_MAX_SIDE);
    return await processSourceCanvas(sourceCanvas);
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

export async function detectDocumentFromVideoFrame(params: {
  video: HTMLVideoElement;
  analysisCanvas: HTMLCanvasElement;
}) {
  drawSourceToCanvas(params.video, params.analysisCanvas, ANALYSIS_MAX_SIDE);
  const details = await detectDocumentInCanvas(params.analysisCanvas);
  return details?.detection ?? null;
}

async function processSourceCanvas(sourceCanvas: HTMLCanvasElement): Promise<ProcessedDocumentResult> {
  const [cv, scanner] = await Promise.all([loadOpenCv(), getScanner()]);
  const details = await detectDocumentInCanvas(sourceCanvas);
  const preparedCanvas = details
    ? extractAndEnhanceCanvas(cv, scanner, sourceCanvas, details)
    : enhanceCanvas(cv, sourceCanvas);
  const blob = await canvasToBlob(preparedCanvas, 'image/png');
  const previewUrl = URL.createObjectURL(blob);

  return {
    blob,
    width: preparedCanvas.width,
    height: preparedCanvas.height,
    previewUrl,
    autoCropped: Boolean(details),
    qualityScore: details?.detection.score ?? 0,
  };
}

async function getScanner() {
  if (!scannerPromise) {
    scannerPromise = (async () => {
      await loadOpenCv();
      return new Jscanify();
    })();
  }

  return scannerPromise;
}

async function detectDocumentInCanvas(canvas: HTMLCanvasElement): Promise<DetectionDetails | null> {
  const [cv, scanner] = await Promise.all([loadOpenCv(), getScanner()]);
  const source = cv.imread(canvas);
  let contour: any = null;

  try {
    contour = scanner.findPaperContour(source);
    if (!contour) {
      return null;
    }

    const corners = scanner.getCornerPoints(contour);

    if (!hasAllCorners(corners)) {
      return null;
    }

    const normalizedPoints = normalizePoints(
      [corners.topLeftCorner, corners.topRightCorner, corners.bottomRightCorner, corners.bottomLeftCorner],
      canvas.width,
      canvas.height
    );
    const coverage = polygonArea(normalizedPoints);

    if (coverage < MIN_DOCUMENT_COVERAGE || coverage > 0.98) {
      return null;
    }

    const score = scoreDocumentCandidate(normalizedPoints, coverage);
    return {
      detection: {
        points: normalizedPoints,
        coverage,
        score,
      },
      corners,
      targetWidth: clampDimension(
        Math.round(
          Math.max(
            distance(corners.topLeftCorner, corners.topRightCorner),
            distance(corners.bottomLeftCorner, corners.bottomRightCorner)
          )
        )
      ),
      targetHeight: clampDimension(
        Math.round(
          Math.max(
            distance(corners.topLeftCorner, corners.bottomLeftCorner),
            distance(corners.topRightCorner, corners.bottomRightCorner)
          )
        )
      ),
    };
  } finally {
    contour?.delete?.();
    source.delete();
  }
}

function extractAndEnhanceCanvas(
  cv: OpenCvNamespace,
  scanner: Jscanify,
  sourceCanvas: HTMLCanvasElement,
  details: DetectionDetails
) {
  const extractedCanvas =
    scanner.extractPaper(sourceCanvas, details.targetWidth, details.targetHeight, details.corners) || sourceCanvas;
  return enhanceCanvas(cv, extractedCanvas);
}

function enhanceCanvas(cv: OpenCvNamespace, sourceCanvas: HTMLCanvasElement) {
  const source = cv.imread(sourceCanvas);
  const resized = new cv.Mat();
  const grayscale = new cv.Mat();
  const normalized = new cv.Mat();
  const denoised = new cv.Mat();
  const thresholded = new cv.Mat();
  const output = new cv.Mat();

  try {
    const longestSide = Math.max(source.cols, source.rows);

    if (longestSide > OUTPUT_MAX_SIDE) {
      const scale = OUTPUT_MAX_SIDE / longestSide;
      cv.resize(
        source,
        resized,
        new cv.Size(Math.max(1, Math.round(source.cols * scale)), Math.max(1, Math.round(source.rows * scale))),
        0,
        0,
        cv.INTER_AREA
      );
    } else {
      source.copyTo(resized);
    }

    cv.cvtColor(resized, grayscale, cv.COLOR_RGBA2GRAY, 0);
    cv.equalizeHist(grayscale, normalized);
    cv.GaussianBlur(normalized, denoised, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(
      denoised,
      thresholded,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      31,
      12
    );
    cv.cvtColor(thresholded, output, cv.COLOR_GRAY2RGBA, 0);

    const canvas = document.createElement('canvas');
    canvas.width = output.cols;
    canvas.height = output.rows;
    cv.imshow(canvas, output);
    return canvas;
  } finally {
    source.delete();
    resized.delete();
    grayscale.delete();
    normalized.delete();
    denoised.delete();
    thresholded.delete();
    output.delete();
  }
}

function hasAllCorners(corners: ScannerCornerPoints): corners is Required<ScannerCornerPoints> {
  return Boolean(corners.topLeftCorner && corners.topRightCorner && corners.bottomLeftCorner && corners.bottomRightCorner);
}

function polygonArea(points: DocumentScannerPoint[]) {
  let total = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    total += current.x * next.y - next.x * current.y;
  }

  return Math.abs(total / 2);
}

function normalizePoints(points: ScannerCornerPoint[], width: number, height: number) {
  return points.map((point) => ({
    x: clamp(point.x / width, 0, 1),
    y: clamp(point.y / height, 0, 1),
  }));
}

function scoreDocumentCandidate(points: DocumentScannerPoint[], coverage: number) {
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  const horizontalSkew = Math.abs(topLeft.y - topRight.y) + Math.abs(bottomLeft.y - bottomRight.y);
  const verticalSkew = Math.abs(topLeft.x - bottomLeft.x) + Math.abs(topRight.x - bottomRight.x);
  const centeredness =
    1 -
    Math.abs(0.5 - average(points.map((point) => point.x))) -
    Math.abs(0.5 - average(points.map((point) => point.y)));
  const geometryPenalty = Math.min(0.55, horizontalSkew + verticalSkew);

  return coverage * 0.78 + clamp(centeredness, 0, 1) * 0.32 - geometryPenalty * 0.24;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function distance(first: ScannerCornerPoint, second: ScannerCornerPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function clampDimension(value: number) {
  return Math.max(720, Math.min(OUTPUT_MAX_SIDE, value || OUTPUT_MAX_SIDE));
}

function drawSourceToCanvas(
  source: HTMLVideoElement | HTMLImageElement,
  canvas: HTMLCanvasElement,
  maxSide: number
) {
  const sourceWidth =
    source instanceof HTMLVideoElement
      ? source.videoWidth || source.clientWidth || 1280
      : source.naturalWidth || source.width || 1280;
  const sourceHeight =
    source instanceof HTMLVideoElement
      ? source.videoHeight || source.clientHeight || 720
      : source.naturalHeight || source.height || 720;
  const longestSide = Math.max(sourceWidth, sourceHeight);
  const scale = longestSide > maxSide ? maxSide / longestSide : 1;

  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Nao foi possivel preparar o canvas do scanner.');
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Nao foi possivel abrir a imagem selecionada.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Nao foi possivel gerar a imagem tratada.'));
          return;
        }

        resolve(blob);
      },
      type,
      1
    );
  });
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
