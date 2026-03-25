export const PRODUCT_IMAGE_WIDTH = 1200;
export const PRODUCT_IMAGE_HEIGHT = 900;
export const PRODUCT_IMAGE_ASPECT = PRODUCT_IMAGE_WIDTH / PRODUCT_IMAGE_HEIGHT;
export const PRODUCT_IMAGE_QUALITY = 0.82;

export type ProductCropState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type LoadedImage = {
  image: HTMLImageElement;
  width: number;
  height: number;
};

export type CropPreviewMetrics = {
  displayWidth: number;
  displayHeight: number;
  maxOffsetX: number;
  maxOffsetY: number;
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

export function getCropPreviewMetrics(params: {
  imageWidth: number;
  imageHeight: number;
  zoom: number;
}) {
  const { imageWidth, imageHeight, zoom } = params;
  const baseScale = Math.max(PRODUCT_IMAGE_WIDTH / imageWidth, PRODUCT_IMAGE_HEIGHT / imageHeight);
  const scale = baseScale * zoom;
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;

  return {
    displayWidth,
    displayHeight,
    maxOffsetX: Math.max((displayWidth - PRODUCT_IMAGE_WIDTH) / 2, 0),
    maxOffsetY: Math.max((displayHeight - PRODUCT_IMAGE_HEIGHT) / 2, 0),
  } satisfies CropPreviewMetrics;
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

export async function createCroppedProductImageFile(params: {
  sourceUrl: string;
  originalFileName: string;
  crop: ProductCropState;
}) {
  const { image, width, height } = await loadImage(params.sourceUrl);
  const metrics = getCropPreviewMetrics({
    imageWidth: width,
    imageHeight: height,
    zoom: params.crop.zoom,
  });

  const scale = metrics.displayWidth / width;
  const sourceX = clamp(((metrics.displayWidth - PRODUCT_IMAGE_WIDTH) / 2 - params.crop.offsetX) / scale, 0, width);
  const sourceY = clamp(
    ((metrics.displayHeight - PRODUCT_IMAGE_HEIGHT) / 2 - params.crop.offsetY) / scale,
    0,
    height
  );
  const sourceWidth = clamp(PRODUCT_IMAGE_WIDTH / scale, 1, width - sourceX);
  const sourceHeight = clamp(PRODUCT_IMAGE_HEIGHT / scale, 1, height - sourceY);

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

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Nao foi possivel gerar a imagem final'));
          return;
        }

        resolve(result);
      },
      'image/webp',
      PRODUCT_IMAGE_QUALITY
    );
  });

  const baseName = sanitizeFileBaseName(params.originalFileName);
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}
