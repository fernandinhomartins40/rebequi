/**
 * Multer Configuration for File Uploads
 */

import multer from 'multer';
import path from 'path';
import { env } from './env.js';
import { AppError } from '../utils/errors.util.js';

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

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
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 10, // Max 10 files per upload
  },
});
