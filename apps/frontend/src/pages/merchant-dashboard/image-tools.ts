import imageCompression from 'browser-image-compression';
import { centerCrop, makeAspectCrop, type PercentCrop } from 'react-image-crop';

export type ImageCropConfig = {
  width: number;
  height: number;
  quality: number;
  maxSizeMB: number;
  initialCropWidthPercent: number;
  fallbackBaseName: string;
};

export const PRODUCT_IMAGE_CONFIG: ImageCropConfig = {
  width: 1200,
  height: 1200,
  quality: 0.82,
  maxSizeMB: 0.45,
  initialCropWidthPercent: 88,
  fallbackBaseName: 'produto',
};

export const PROMOTION_IMAGE_CONFIG: ImageCropConfig = {
  width: 1600,
  height: 900,
  quality: 0.84,
  maxSizeMB: 0.55,
  initialCropWidthPercent: 92,
  fallbackBaseName: 'promocao',
};

export const PRODUCT_IMAGE_WIDTH = PRODUCT_IMAGE_CONFIG.width;
export const PRODUCT_IMAGE_HEIGHT = PRODUCT_IMAGE_CONFIG.height;
export const PRODUCT_IMAGE_ASPECT = PRODUCT_IMAGE_WIDTH / PRODUCT_IMAGE_HEIGHT;
export const PRODUCT_IMAGE_QUALITY = PRODUCT_IMAGE_CONFIG.quality;
export const PRODUCT_IMAGE_MAX_SIZE_MB = PRODUCT_IMAGE_CONFIG.maxSizeMB;
export const PRODUCT_IMAGE_INITIAL_CROP_WIDTH_PERCENT = PRODUCT_IMAGE_CONFIG.initialCropWidthPercent;
export const PROMOTION_IMAGE_WIDTH = PROMOTION_IMAGE_CONFIG.width;
export const PROMOTION_IMAGE_HEIGHT = PROMOTION_IMAGE_CONFIG.height;
export const PROMOTION_IMAGE_ASPECT = PROMOTION_IMAGE_WIDTH / PROMOTION_IMAGE_HEIGHT;

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

function sanitizeFileBaseName(name: string, fallbackBaseName: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '') || fallbackBaseName;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPercent(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function createCenteredAspectCrop(
  imageWidth: number,
  imageHeight: number,
  aspect: number = PRODUCT_IMAGE_ASPECT,
  initialCropWidthPercent: number = PRODUCT_IMAGE_INITIAL_CROP_WIDTH_PERCENT,
): PercentCrop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: initialCropWidthPercent,
      },
      aspect,
      imageWidth,
      imageHeight
    ),
    imageWidth,
    imageHeight
  );
}

export async function createCroppedImageFile(params: {
  sourceUrl: string;
  originalFileName: string;
  crop: PercentCrop;
  config: ImageCropConfig;
}) {
  const { config } = params;
  const { image, width, height } = await loadImage(params.sourceUrl);
  const sourceX = clamp(Math.round((params.crop.x / 100) * width), 0, width - 1);
  const sourceY = clamp(Math.round((params.crop.y / 100) * height), 0, height - 1);
  const sourceWidth = clamp(Math.round((params.crop.width / 100) * width), 1, width - sourceX);
  const sourceHeight = clamp(Math.round((params.crop.height / 100) * height), 1, height - sourceY);

  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Não foi possível inicializar o editor de imagem');
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
    config.width,
    config.height
  );

  const baseName = sanitizeFileBaseName(params.originalFileName, config.fallbackBaseName);
  const renderedFile = await imageCompression.canvasToFile(
    canvas,
    'image/webp',
    `${baseName}.webp`,
    Date.now(),
    config.quality
  );

  return imageCompression(renderedFile, {
    maxSizeMB: config.maxSizeMB,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: config.quality,
    alwaysKeepResolution: true,
    maxWidthOrHeight: Math.max(config.width, config.height),
  });
}

export async function createCroppedProductImageFile(params: {
  sourceUrl: string;
  originalFileName: string;
  crop: PercentCrop;
}) {
  return createCroppedImageFile({
    ...params,
    config: PRODUCT_IMAGE_CONFIG,
  });
}

export function formatPercentCropValue(value?: number) {
  if (value === undefined || Number.isNaN(value)) {
    return '0';
  }

  return String(roundPercent(value));
}
