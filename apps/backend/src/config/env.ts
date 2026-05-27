/**
 * Environment variables configuration.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

function normalizePaddleLang(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === 'latin') {
    return 'la';
  }

  return normalized;
}

function normalizeBridgeScriptPath(value: string) {
  const normalized = value.trim().replace(/\\/g, '/');

  if (!normalized) {
    return 'scripts/paddleocr_bridge.py';
  }

  return normalized.replace(/^(?:\.\/)?apps\/backend\//i, '');
}

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

  STORE_WHATSAPP: z.string().default('11999999999'),
  QUOTE_PADDLE_PYTHON_BIN: z.string().default('python3'),
  QUOTE_PADDLE_SCRIPT_PATH: z.string().default('scripts/paddleocr_bridge.py').transform(normalizeBridgeScriptPath),
  QUOTE_PADDLE_LANG: z.string().default('la').transform(normalizePaddleLang),
  QUOTE_PADDLE_TIMEOUT_MS: z.coerce.number().positive().default(120000),

  MAX_FILE_SIZE: z.coerce.number().positive().default(5242880),
  UPLOAD_DIR: z.string().default('./uploads'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Encryption key for secret settings stored in the database (OpenRouter API key, etc.).
  // Defaults to JWT_SECRET when not set so dev environments do not break, but in production
  // a dedicated key is recommended.
  SETTINGS_ENCRYPTION_KEY: z
    .string()
    .min(32, 'SETTINGS_ENCRYPTION_KEY must be at least 32 characters')
    .optional(),
});

const parseEnv = () => {
  try {
    const parsed = envSchema.parse(process.env);
    return {
      ...parsed,
      SETTINGS_ENCRYPTION_KEY: parsed.SETTINGS_ENCRYPTION_KEY ?? parsed.JWT_SECRET,
    };
  } catch (error) {
    console.error('Invalid environment variables:', error);
    process.exit(1);
  }
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema> & { SETTINGS_ENCRYPTION_KEY: string };
