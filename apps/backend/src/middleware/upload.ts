import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { AppError } from './errorHandler.js';

// Allowed image types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // Determine destination based on field name
    let folder = 'uploads/temp';

    if (file.fieldname.includes('product')) {
      folder = 'uploads/products';
    } else if (file.fieldname.includes('category')) {
      folder = 'uploads/categories';
    }

    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter to validate image types
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        400,
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    );
  }
};

/**
 * Multer upload middleware
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Upload single image
 */
export const uploadSingle = (fieldName: string) => {
  return upload.single(fieldName);
};

/**
 * Upload multiple images
 */
export const uploadMultiple = (fieldName: string, maxCount: number = 10) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Upload fields with different names
 */
export const uploadFields = (fields: { name: string; maxCount: number }[]) => {
  return upload.fields(fields);
};
