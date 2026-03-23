/**
 * Environment variables configuration.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  AUTH_COOKIE_NAME: z.string().default('rebequi_token'),
  AUTH_COOKIE_SECURE: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((value) => value === 'true' || value === '1'),
  AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  AUTH_COOKIE_MAX_AGE_MS: z.coerce.number().positive().default(604800000),
  AUTH_COOKIE_PATH: z.string().default('/'),

  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:8080,http://127.0.0.1:8080')
    .transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean)),

  MAX_FILE_SIZE: z.coerce.number().positive().default(5242880),
  UPLOAD_DIR: z.string().default('./uploads'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Invalid environment variables:', error);
    process.exit(1);
  }
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
