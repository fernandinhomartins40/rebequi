/**
 * CORS Configuration
 */

import { CorsOptions } from 'cors';
import { env } from './env.js';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = Array.isArray(env.ALLOWED_ORIGINS)
      ? env.ALLOWED_ORIGINS
      : [env.ALLOWED_ORIGINS];

    if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours
};
