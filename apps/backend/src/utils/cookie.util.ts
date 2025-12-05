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

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.AUTH_COOKIE_NAME, token, baseAuthCookieOptions);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.AUTH_COOKIE_NAME, {
    ...baseAuthCookieOptions,
    maxAge: 0,
  });
}
