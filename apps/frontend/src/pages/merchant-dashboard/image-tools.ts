import imageCompression from 'browser-image-compression';
import { centerCrop, makeAspectCrop, type PercentCrop } from 'react-image-crop';

export const PRODUCT_IMAGE_WIDTH = 1200;
export const PRODUCT_IMAGE_HEIGHT = 900;
export const PRODUCT_IMAGE_ASPECT = PRODUCT_IMAGE_WIDTH / PRODUCT_IMAGE_HEIGHT;
export const PRODUCT_IMAGE_QUALITY = 0.82;
export const PRODUCT_IMAGE_MAX_SIZE_MB = 0.45;
export const PRODUCT_IMAGE_INITIAL_CROP_WIDTH_PERCENT = 88;

type LoadedImage = {
  image: HTMLImageElement;
  width: number;
  height: number;
};

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

export function createObjectPreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

export function revokeObjectPreviewUrl(url?: string) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

async function loadImage(src: string): Promise<LoadedImage> {
  const image = new Image();
  image.decoding = 'async';

  return new Promise((resolve, reject) => {
    image.onload = () =>
      resolve({
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    image.onerror = () => reject(new Error('Falha ao carregar imagem selecionada'));
    image.src = src;
  });
}

function sanitizeFileBaseName(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '') || 'produto';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPercent(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function createCenteredAspectCrop(imageWidth: number, imageHeight: number): PercentCrop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: PRODUCT_IMAGE_INITIAL_CROP_WIDTH_PERCENT,
      },
      PRODUCT_IMAGE_ASPECT,
      imageWidth,
      imageHeight
    ),
    imageWidth,
    imageHeight
  );
}

export async function createCroppedProductImageFile(params: {
  sourceUrl: string;
  originalFileName: string;
  crop: PercentCrop;
}) {
  const { image, width, height } = await loadImage(params.sourceUrl);
  const sourceX = clamp(Math.round((params.crop.x / 100) * width), 0, width - 1);
  const sourceY = clamp(Math.round((params.crop.y / 100) * height), 0, height - 1);
  const sourceWidth = clamp(Math.round((params.crop.width / 100) * width), 1, width - sourceX);
  const sourceHeight = clamp(Math.round((params.crop.height / 100) * height), 1, height - sourceY);

  const canvas = document.createElement('canvas');
  canvas.width = PRODUCT_IMAGE_WIDTH;
  canvas.height = PRODUCT_IMAGE_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Nao foi possivel inicializar o editor de imagem');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    PRODUCT_IMAGE_WIDTH,
    PRODUCT_IMAGE_HEIGHT
  );

  const baseName = sanitizeFileBaseName(params.originalFileName);
  const renderedFile = await imageCompression.canvasToFile(
    canvas,
    'image/webp',
    `${baseName}.webp`,
    Date.now(),
    PRODUCT_IMAGE_QUALITY
  );

  return imageCompression(renderedFile, {
    maxSizeMB: PRODUCT_IMAGE_MAX_SIZE_MB,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: PRODUCT_IMAGE_QUALITY,
    alwaysKeepResolution: true,
    maxWidthOrHeight: Math.max(PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT),
  });
}

export function formatPercentCropValue(value?: number) {
  if (value === undefined || Number.isNaN(value)) {
    return '0';
  }

  return String(roundPercent(value));
}
