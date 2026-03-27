/**
 * Cookie helpers for auth token
 */

import { Response, CookieOptions } from 'express';
import { env } from '../config/env.js';

const isProduction = env.NODE_ENV === 'production';

const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.AUTH_COOKIE_SECURE || isProduction || env.AUTH_COOKIE_SAMESITE === 'none',
  sameSite: env.AUTH_COOKIE_SAMESITE,
  maxAge: env.AUTH_COOKIE_MAX_AGE_MS,
  path: env.AUTH_COOKIE_PATH,
};

function resolveAuthCookieOptions(persistent = true): CookieOptions {
  if (persistent) {
    return baseAuthCookieOptions;
  }

  const { maxAge: _maxAge, ...sessionCookieOptions } = baseAuthCookieOptions;
  return sessionCookieOptions;
}

export function setAuthCookie(res: Response, token: string, options?: { persistent?: boolean }): void {
  res.cookie(env.AUTH_COOKIE_NAME, token, resolveAuthCookieOptions(options?.persistent ?? true));
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.AUTH_COOKIE_NAME, {
    ...baseAuthCookieOptions,
    maxAge: 0,
  });
}
