import imageCompression from 'browser-image-compression';
import { centerCrop, makeAspectCrop, type PercentCrop } from 'react-image-crop';

export type ImageCropConfig = {
  width: number;
  height: number;
  quality: number;
  maxSizeMB: number;
  initialCropWidthPercent: number;
  fallbackBaseName: string;
  preserveCropAspect?: boolean;
};

export const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp';
export const PARTNER_PORTFOLIO_CONFIG: ImageCropConfig = { width: 1000, height: 750, quality: 0.8, maxSizeMB: 0.24, initialCropWidthPercent: 95, fallbackBaseName: 'portfolio' };
export const CATEGORY_IMAGE_CONFIG: ImageCropConfig = { width: 800, height: 800, quality: 0.8, maxSizeMB: 0.25, initialCropWidthPercent: 100, fallbackBaseName: 'categoria' };
export const QUOTE_IMAGE_CONFIG: ImageCropConfig = { width: 1800, height: 1800, quality: 0.88, maxSizeMB: 2, initialCropWidthPercent: 100, fallbackBaseName: 'lista', preserveCropAspect: true };

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
  if (!file.size || file.size > 30 * 1024 * 1024) return Promise.reject(new Error('Escolha uma imagem de até 30 MB.'));
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
    image.onerror = () => reject(new Error('Não foi possível abrir a imagem. Escolha JPG, PNG, WebP, GIF, BMP ou AVIF.'));
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
  const scale = Math.min(1, config.width / sourceWidth, config.height / sourceHeight);
  canvas.width = config.preserveCropAspect ? Math.max(1, Math.round(sourceWidth * scale)) : config.width;
  canvas.height = config.preserveCropAspect ? Math.max(1, Math.round(sourceHeight * scale)) : config.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Não foi possível inicializar o editor de imagem');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const baseName = sanitizeFileBaseName(params.originalFileName, config.fallbackBaseName);
  const renderedFile = await imageCompression.canvasToFile(
    canvas,
    'image/webp',
    `${baseName}.webp`,
    Date.now(),
    config.quality
  );

  const compressed = await imageCompression(renderedFile, {
    maxSizeMB: config.maxSizeMB,
    useWebWorker: true,
    libURL: `${window.location.origin}/vendor/browser-image-compression.js`,
    fileType: 'image/webp',
    initialQuality: config.quality,
    alwaysKeepResolution: true,
    maxWidthOrHeight: Math.max(config.width, config.height),
  });
  if (compressed.type !== 'image/webp') throw new Error('Este navegador não permite exportar em WebP. Atualize o navegador.');
  if (compressed.size > config.maxSizeMB * 1024 * 1024) throw new Error('A imagem ficou grande demais. Escolha outra foto ou reduza a área do recorte.');
  return new File([compressed], `${baseName}.webp`, { type: 'image/webp' });
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
