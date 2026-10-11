/**
 * Multer Configuration for File Uploads
 */

import multer from 'multer';
import { AppError } from '../utils/errors.util.js';
import { env } from './env.js';

// File filter
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  // Allowed MIME types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/tiff',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Formato não suportado. Envie JPG, PNG, WebP, GIF ou AVIF.', 400));
  }
};

// Multer configuration
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 10, // Max 10 files per upload
  },
});
