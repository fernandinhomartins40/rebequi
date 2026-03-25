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
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images are allowed.', 400));
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
