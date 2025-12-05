/**
 * Environment Variables Configuration
 * Centralized configuration for all environment variables
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variables schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Auth cookies
  AUTH_COOKIE_NAME: z.string().default('rebequi_token'),
  AUTH_COOKIE_SECURE: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((value) => value === 'true' || value === '1'),
  AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  AUTH_COOKIE_MAX_AGE_MS: z.string().transform(Number).pipe(z.number().positive()).default('604800000'), // 7 days
  AUTH_COOKIE_PATH: z.string().default('/'),

  // CORS
  ALLOWED_ORIGINS: z.string().transform((str) => str.split(',')).default('http://localhost:8080'),

  // Upload
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('5242880'), // 5MB
  UPLOAD_DIR: z.string().default('./uploads'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
};

export const env = parseEnv();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
