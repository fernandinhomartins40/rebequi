type OpenCvNamespace = any;
type OpenCvMat = any;

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

const ANALYSIS_MAX_SIDE = 720;
const CAPTURE_MAX_SIDE = 2200;
const OUTPUT_MAX_SIDE = 1600;
const MIN_DOCUMENT_COVERAGE = 0.16;

let openCvPromise: Promise<OpenCvNamespace> | null = null;

export async function loadOpenCv() {
  if (!openCvPromise) {
    openCvPromise = (async () => {
      const module = await import('@techstark/opencv-js');
      const cvModule = module.default || module;

      if (cvModule instanceof Promise) {
        return cvModule;
      }

      if (typeof cvModule.Mat === 'function') {
        return cvModule;
      }

      await new Promise<void>((resolve) => {
        cvModule.onRuntimeInitialized = () => resolve();
      });

      return cvModule;
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
  return processSourceCanvas({
    sourceCanvas,
    fileName: params.fileName || 'orcamento-camera.png',
  });
}

export async function prepareDocumentFromFile(params: {
  file: File;
  fileName?: string;
}) {
  const image = await loadImageElement(params.file);
  const sourceCanvas = document.createElement('canvas');

  try {
    drawSourceToCanvas(image, sourceCanvas, CAPTURE_MAX_SIDE);
    return await processSourceCanvas({
      sourceCanvas,
      fileName: params.fileName || params.file.name || 'orcamento-galeria.png',
    });
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

export async function detectDocumentFromVideoFrame(params: {
  video: HTMLVideoElement;
  analysisCanvas: HTMLCanvasElement;
}) {
  drawSourceToCanvas(params.video, params.analysisCanvas, ANALYSIS_MAX_SIDE);
  const cv = await loadOpenCv();
  return detectDocumentInCanvas(cv, params.analysisCanvas);
}

async function processSourceCanvas(params: {
  sourceCanvas: HTMLCanvasElement;
  fileName: string;
}): Promise<ProcessedDocumentResult> {
  const cv = await loadOpenCv();
  const detection = detectDocumentInCanvas(cv, params.sourceCanvas);
  const preparedCanvas = renderPreparedCanvas(cv, params.sourceCanvas, detection);
  const blob = await canvasToBlob(preparedCanvas, 'image/png');
  const previewUrl = URL.createObjectURL(blob);

  return {
    blob,
    width: preparedCanvas.width,
    height: preparedCanvas.height,
    previewUrl,
    autoCropped: Boolean(detection),
    qualityScore: detection?.score ?? 0,
  };
}

function detectDocumentInCanvas(cv: OpenCvNamespace, canvas: HTMLCanvasElement): DocumentDetection | null {
  const source = cv.imread(canvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const dilated = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blurred, edges, 50, 150, 3, false);
    cv.dilate(edges, dilated, kernel);
    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const imageArea = canvas.width * canvas.height;
    let bestCandidate: DocumentDetection | null = null;

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const perimeter = cv.arcLength(contour, true);
      const approximation = new cv.Mat();

      try {
        cv.approxPolyDP(contour, approximation, 0.02 * perimeter, true);

        if (approximation.rows !== 4) {
          continue;
        }

        if (typeof cv.isContourConvex === 'function' && !cv.isContourConvex(approximation)) {
          continue;
        }

        const area = Math.abs(cv.contourArea(approximation));
        const coverage = area / imageArea;

        if (coverage < MIN_DOCUMENT_COVERAGE || coverage > 0.96) {
          continue;
        }

        const orderedPoints = normalizePoints(orderPoints(extractPoints(approximation)), canvas.width, canvas.height);
        const score = scoreDocumentCandidate(orderedPoints, coverage);

        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = {
            points: orderedPoints,
            coverage,
            score,
          };
        }
      } finally {
        approximation.delete();
        contour.delete();
      }
    }

    return bestCandidate;
  } finally {
    source.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    dilated.delete();
    contours.delete();
    hierarchy.delete();
    kernel.delete();
  }
}

function renderPreparedCanvas(
  cv: OpenCvNamespace,
  sourceCanvas: HTMLCanvasElement,
  detection: DocumentDetection | null
) {
  const source = cv.imread(sourceCanvas);
  let workingMat: OpenCvMat | null = null;
  const grayscale = new cv.Mat();
  const normalized = new cv.Mat();
  const denoised = new cv.Mat();
  const thresholded = new cv.Mat();
  const output = new cv.Mat();

  try {
    workingMat = detection ? warpDetectedDocument(cv, source, detection) : source.clone();

    if (Math.max(workingMat.cols, workingMat.rows) > OUTPUT_MAX_SIDE) {
      const resized = new cv.Mat();
      const scale = OUTPUT_MAX_SIDE / Math.max(workingMat.cols, workingMat.rows);
      const targetSize = new cv.Size(
        Math.max(1, Math.round(workingMat.cols * scale)),
        Math.max(1, Math.round(workingMat.rows * scale))
      );
      cv.resize(workingMat, resized, targetSize, 0, 0, cv.INTER_AREA);
      workingMat.delete();
      workingMat = resized;
    }

    cv.cvtColor(workingMat, grayscale, cv.COLOR_RGBA2GRAY, 0);
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
    workingMat?.delete();
    grayscale.delete();
    normalized.delete();
    denoised.delete();
    thresholded.delete();
    output.delete();
  }
}

function warpDetectedDocument(cv: OpenCvNamespace, source: OpenCvMat, detection: DocumentDetection) {
  const absolutePoints = detection.points.map((point) => ({
    x: point.x * source.cols,
    y: point.y * source.rows,
  }));
  const [topLeft, topRight, bottomRight, bottomLeft] = absolutePoints;

  const maxWidth = Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight));
  const maxHeight = Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight));

  const destinationWidth = Math.max(1, Math.round(maxWidth));
  const destinationHeight = Math.max(1, Math.round(maxHeight));

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    topLeft.x,
    topLeft.y,
    topRight.x,
    topRight.y,
    bottomRight.x,
    bottomRight.y,
    bottomLeft.x,
    bottomLeft.y,
  ]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    destinationWidth - 1,
    0,
    destinationWidth - 1,
    destinationHeight - 1,
    0,
    destinationHeight - 1,
  ]);
  const transform = cv.getPerspectiveTransform(srcTri, dstTri);
  const warped = new cv.Mat();

  try {
    cv.warpPerspective(
      source,
      warped,
      transform,
      new cv.Size(destinationWidth, destinationHeight),
      cv.INTER_LINEAR,
      cv.BORDER_REPLICATE,
      new cv.Scalar()
    );

    return warped;
  } finally {
    srcTri.delete();
    dstTri.delete();
    transform.delete();
  }
}

function extractPoints(mat: OpenCvMat) {
  const points: DocumentScannerPoint[] = [];

  for (let index = 0; index < mat.rows; index += 1) {
    const coordinates = mat.intPtr(index, 0);
    points.push({
      x: coordinates[0],
      y: coordinates[1],
    });
  }

  return points;
}

function normalizePoints(points: DocumentScannerPoint[], width: number, height: number) {
  return points.map((point) => ({
    x: clamp(point.x / width, 0, 1),
    y: clamp(point.y / height, 0, 1),
  }));
}

function orderPoints(points: DocumentScannerPoint[]) {
  const sortedBySum = [...points].sort((left, right) => left.x + left.y - (right.x + right.y));
  const topLeft = sortedBySum[0];
  const bottomRight = sortedBySum[sortedBySum.length - 1];

  const remaining = points.filter((point) => point !== topLeft && point !== bottomRight);
  const [candidateA, candidateB] = remaining;

  if (candidateA.x < candidateB.x) {
    return [topLeft, candidateB, bottomRight, candidateA];
  }

  return [topLeft, candidateA, bottomRight, candidateB];
}

function scoreDocumentCandidate(points: DocumentScannerPoint[], coverage: number) {
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  const horizontalSkew = Math.abs(topLeft.y - topRight.y) + Math.abs(bottomLeft.y - bottomRight.y);
  const verticalSkew = Math.abs(topLeft.x - bottomLeft.x) + Math.abs(topRight.x - bottomRight.x);
  const centeredness =
    1 -
    Math.abs(0.5 - average(points.map((point) => point.x))) -
    Math.abs(0.5 - average(points.map((point) => point.y)));
  const geometryPenalty = Math.min(0.5, horizontalSkew + verticalSkew);

  return coverage * 0.75 + clamp(centeredness, 0, 1) * 0.35 - geometryPenalty * 0.25;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function distance(first: DocumentScannerPoint, second: DocumentScannerPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
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
