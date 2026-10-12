import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { NotFoundError } from '../utils/errors.util.js';
import { authenticate } from './auth.middleware.js';

export function protectPrivateMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const decoded = decodeURIComponent(req.path);
    if (decoded.includes('\\') || decoded.includes('\0')) throw new NotFoundError('Documento não encontrado');
    if (['/quotes/', '/partners/'].some(prefix => path.posix.normalize(decoded).startsWith(prefix))) {
      res.setHeader('Cache-Control', 'private, no-store');
      authenticate(req, res, error => { if (error) next(error); else void servePrivateQuoteDocument(req, res, next); });
      return;
    }
    next();
  } catch (error) { next(error instanceof URIError ? new NotFoundError('Documento não encontrado') : error); }
}

export async function servePrivateQuoteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    let suffix: string;
    try { suffix = decodeURIComponent(req.path); } catch { throw new NotFoundError('Documento não encontrado'); }
    const storageKey = path.posix.normalize(suffix).replace(/^\//, '');
    const root = path.resolve(env.UPLOAD_DIR);
    const absolute = path.resolve(root, storageKey);
    const folder = storageKey.startsWith('quotes/') ? 'quotes' : 'partners';
    if (!absolute.startsWith(`${path.join(root, folder)}${path.sep}`) || storageKey.includes('\\') || suffix.split('/').some(part => part === '..' || part === '.')) throw new NotFoundError('Documento não encontrado');
    if (folder === 'quotes') {
      const quote = await prisma.quoteRequest.findFirst({ where: { documentStorageKey: storageKey }, select: { userId: true } });
      if (!quote || (quote.userId !== req.user!.userId && !hasMerchantPermission(req.user!.role, 'quotes:manage'))) throw new NotFoundError('Documento não encontrado');
    } else {
      const image = await prisma.partnerPortfolioImage.findUnique({ where: { storageKey }, select: { partner: { select: { userId: true } } } });
      if (!image || (image.partner.userId !== req.user!.userId && !hasMerchantPermission(req.user!.role, 'partners:manage'))) throw new NotFoundError('Documento não encontrado');
    }
    res.sendFile(absolute, { headers: { 'Cache-Control': 'private, no-store' } }, error => { if (error) next(new NotFoundError('Documento não encontrado')); });
  } catch (error) { next(error); }
}
