import { Prisma } from '@prisma/client';
import { commercialAssignmentSchema, type CommercialAssignmentInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ValidationError } from '../utils/errors.util.js';
import { requireCommercialAccess, type CommercialActor, type CommercialKind } from './commercial-access.service.js';
const TABLES = { customer: 'users', lead: 'lead_captures', quote: 'quote_requests', order: 'customer_orders', sale: 'sales' } as const;
export async function commercialAssignmentState(kind: CommercialKind, id: string, actor: CommercialActor) {
  const record = await requireCommercialAccess(kind, id, actor);
  const seller = record.assignedSellerId ? await prisma.user.findUnique({ where: { id: record.assignedSellerId }, select: { id: true, name: true, isActive: true } }) : null;
  return { ...record, seller };
}
export async function assignCommercialRecord(kind: CommercialKind, id: string, actorId: string, raw: CommercialAssignmentInput) {
  const input = commercialAssignmentSchema.parse(raw);
  return prisma.$transaction(async tx => {
    if (input.sellerId) {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${input.sellerId} FOR UPDATE`;
      const seller = await tx.user.findUnique({ where: { id: input.sellerId }, select: { role: true, isActive: true } });
      if (!seller?.isActive || !['SALES', 'ADMIN', 'MANAGER'].includes(seller.role)) throw new ValidationError('Escolha um colaborador comercial ativo.');
    }
    await tx.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw(TABLES[kind])} WHERE id=${id} FOR UPDATE`);
    const record = await requireCommercialAccess(kind, id, undefined, tx);
    if (record.assignmentVersion !== input.expectedVersion) throw new ConflictError('O responsável mudou. Recarregue antes de distribuir.');
    const values = { assignedSellerId: input.sellerId, assignmentVersion: { increment: 1 } };
    switch (kind) {
      case 'customer': await tx.user.update({ where: { id }, data: values }); break;
      case 'lead': await tx.leadCapture.update({ where: { id }, data: values }); break;
      case 'quote': await tx.quoteRequest.update({ where: { id }, data: values }); break;
      case 'order': await tx.customerOrder.update({ where: { id }, data: values }); break;
      case 'sale': await tx.sale.update({ where: { id }, data: values }); break;
    }
    await tx.commercialAssignmentAudit.create({ data: { resourceKind: kind, resourceId: id, previousSellerId: record.assignedSellerId, nextSellerId: input.sellerId, version: record.assignmentVersion + 1, actorId, reason: input.reason } });
    return { id, assignedSellerId: input.sellerId, assignmentVersion: record.assignmentVersion + 1 };
  });
}
