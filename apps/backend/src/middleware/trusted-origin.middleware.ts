import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { ForbiddenError } from '../utils/errors.util.js';

export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (!req.headers.origin || !env.ALLOWED_ORIGINS.includes(req.headers.origin))) {
    next(new ForbiddenError('Origem da solicitação não autorizada')); return;
  }
  next();
}
