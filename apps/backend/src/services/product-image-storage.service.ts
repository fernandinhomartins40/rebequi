import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.util.js';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

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

  if (!absolutePath.startsWith(uploadsRoot)) {
    throw new ValidationError('Invalid storage key');
  }

  return absolutePath;
}

function getFileExtension(file: Express.Multer.File) {
  const byMime = MIME_EXTENSION_MAP[file.mimetype];

  if (byMime) {
    return byMime;
  }

  const originalExt = path.extname(file.originalname || '').toLowerCase();
  return originalExt || '.bin';
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
  const { file, folder, alt, width, height, order, isPrimary } = params;

  if (!file?.buffer?.length) {
    throw new ValidationError('Image file is required');
  }

  const now = new Date();
  const extension = getFileExtension(file);
  const filename = `${now.getTime()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  const storageKey = path.posix.join(
    folder,
    `${now.getUTCFullYear()}`,
    `${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    filename
  );

  const absolutePath = getSafeAbsolutePath(storageKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, file.buffer);

  return {
    url: `/uploads/${storageKey}`,
    alt,
    order,
    isPrimary,
    storageKey,
    filename,
    mimeType: file.mimetype,
    size: file.size,
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
