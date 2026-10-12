import { createHash, randomBytes } from 'node:crypto';
export const externalTokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const createExternalToken = () => `rb_api_${randomBytes(32).toString('base64url')}`;
export function externalBearer(header?: string) { if (!header || header.trim() !== header) return null; const value = header.match(/^Bearer (rb_api_[A-Za-z0-9_-]{43})$/); return value?.[1] ?? null; }
