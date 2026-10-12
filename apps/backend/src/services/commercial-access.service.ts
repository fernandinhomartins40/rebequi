import type { Prisma } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.util.js';
import { canAccessCommercialRecord, type CommercialActor } from './commercial-access-policy.js';
export { assignedScope, saleScope, canAccessCommercialRecord, type CommercialActor } from './commercial-access-policy.js';
export type CommercialKind = 'customer' | 'lead' | 'quote' | 'order' | 'sale';
export async function getAssignmentRecord(kind: CommercialKind, id: string, tx: Prisma.TransactionClient = prisma) {
  const select = { id: true, assignedSellerId: true, assignmentVersion: true };
  switch (kind) {
    case 'customer': return tx.user.findFirst({ where: { id, role: 'CUSTOMER' }, select });
    case 'lead': return tx.leadCapture.findUnique({ where: { id }, select });
    case 'quote': return tx.quoteRequest.findUnique({ where: { id }, select });
    case 'order': return tx.customerOrder.findUnique({ where: { id }, select });
    case 'sale': return tx.sale.findUnique({ where: { id }, select: { ...select, registeredById: true } });
  }
}
export async function requireCommercialAccess(kind: CommercialKind, id: string, actor?: CommercialActor, tx: Prisma.TransactionClient = prisma) {
  const record = await getAssignmentRecord(kind, id, tx);
  if (!record || !canAccessCommercialRecord(record, actor)) throw new NotFoundError('Registro não encontrado');
  return record;
}
export function commercialRecordGuard(kind: CommercialKind) {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try { await requireCommercialAccess(kind, req.params.id, req.user); next(); } catch (error) { next(error); }
  };
}
