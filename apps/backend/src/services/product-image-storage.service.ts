import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { AppError, ValidationError } from '../utils/errors.util.js';

sharp.cache({ memory: 16, files: 0, items: 20 });
sharp.concurrency(1);
let processing = false;
const waiting: Array<() => void> = [];
async function acquireProcessingSlot() {
  if (!processing) { processing = true; return; }
  if (waiting.length >= 3) throw new AppError('Aguarde um instante e tente enviar a imagem novamente.', 429);
  await new Promise<void>(resolve => waiting.push(resolve));
}
function releaseProcessingSlot() { const next = waiting.shift(); if (next) next(); else processing = false; }


type StoredProductImage = {
  url: string;
  alt?: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  order?: number;
  isPrimary?: boolean;
};

function getUploadsRoot() {
  return path.resolve(env.UPLOAD_DIR);
}

function getSafeAbsolutePath(storageKey: string) {
  const uploadsRoot = getUploadsRoot();
  const absolutePath = path.resolve(uploadsRoot, storageKey);

  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw new ValidationError('Invalid storage key');
  }

  return absolutePath;
}


async function storeManagedImage(params: {
  file: Express.Multer.File;
  folder: string;
  alt?: string;
  width?: number;
  height?: number;
  order?: number;
  isPrimary?: boolean;
}): Promise<StoredProductImage> {
  const { file, folder, alt, order, isPrimary } = params;
  const lightweight = folder === 'partners' || folder === 'receipts';

  if (!file?.buffer?.length) {
    throw new ValidationError('Image file is required');
  }

  let buffer: Buffer;
  let width: number;
  let height: number;
  await acquireProcessingSlot();
  try {
    const image = sharp(file.buffer, { limitInputPixels: 40000000, animated: false }).rotate();
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp', 'gif', 'avif', 'heif', 'tiff'].includes(metadata.format || '')) throw new Error('Invalid image');
    const dimensions = lightweight ? { width: 1000, height: 750 } : folder === 'promotions' ? { width: 1600, height: 900 } : folder === 'quotes' ? { width: 1800, height: 1800 } : { width: folder === 'categories' ? 800 : 1200, height: folder === 'categories' ? 800 : 1200 };
    let output = await image.resize({ ...dimensions, fit: folder === 'quotes' ? 'inside' : 'contain', background: '#ffffff', withoutEnlargement: folder === 'quotes' })
      .webp({ quality: lightweight ? 72 : folder === 'quotes' ? 88 : 80, effort: 3 }).toBuffer({ resolveWithObject: true });
    if (lightweight && output.data.length > 250 * 1024) output = await image.webp({ quality: 55, effort: 3 }).toBuffer({ resolveWithObject: true });
    buffer = output.data; width = output.info.width; height = output.info.height;
    const maximum = lightweight ? 250 * 1024 : folder === 'quotes' ? 2 * 1024 * 1024 : 600 * 1024;
    if (buffer.length > maximum) throw new Error('Image too large');
  } catch { throw new ValidationError('Imagem inválida ou muito grande. Escolha JPG, PNG, WebP, GIF ou AVIF.'); }
  finally { releaseProcessingSlot(); }
  const now = new Date();
  const extension = '.webp';
  const filename = `${now.getTime()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  const storageKey = path.posix.join(
    folder,
    `${now.getUTCFullYear()}`,
    `${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    filename
  );

  const absolutePath = getSafeAbsolutePath(storageKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer, { flag: 'wx' });

  return {
    url: `/uploads/${storageKey}`,
    alt,
    order,
    isPrimary,
    storageKey,
    filename,
    mimeType: 'image/webp',
    size: buffer.length,
    width,
    height,
  };
}

export async function storeProductImage(params: {
  file: Express.Multer.File;
  alt?: string;
  width?: number;
  height?: number;
  order?: number;
  isPrimary?: boolean;
}) {
  return storeManagedImage({
    ...params,
    folder: 'products',
  });
}

export async function storePromotionImage(params: {
  file: Express.Multer.File;
  alt?: string;
  width?: number;
  height?: number;
}) {
  return storeManagedImage({
    ...params,
    folder: 'promotions',
  });
}

export async function storeQuoteDocumentImage(params: {
  file: Express.Multer.File;
  alt?: string;
  width?: number;
  height?: number;
}) {
  return storeManagedImage({
    ...params,
    folder: 'quotes',
  });
}

export async function storePartnerPortfolioImage(file: Express.Multer.File) {
  return storeManagedImage({ file, folder: 'partners' });
}
export async function storeReceiptEvidenceImage(file: Express.Multer.File) {
  return storeManagedImage({ file, folder: 'receipts' });
}

export async function deleteStoredImages(images: Array<{ storageKey?: string | null }>) {
  await Promise.all(
    images.map(async (image) => {
      if (!image.storageKey) {
        return;
      }

      try {
        await fs.unlink(getSafeAbsolutePath(image.storageKey));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    })
  );
}

export async function deleteStoredProductImages(images: Array<{ storageKey?: string | null }>) {
  return deleteStoredImages(images);
}

export async function deleteStoredPromotionImages(images: Array<{ storageKey?: string | null }>) {
  return deleteStoredImages(images);
}

export async function deleteStoredQuoteDocuments(images: Array<{ storageKey?: string | null }>) {
  return deleteStoredImages(images);
}

export async function storeCategoryImage(params: { file: Express.Multer.File; alt?: string }) { return storeManagedImage({ ...params, folder: 'categories' }); }
