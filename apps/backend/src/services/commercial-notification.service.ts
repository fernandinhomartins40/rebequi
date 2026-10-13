import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.util.js';

export async function listCommercialNotifications(userId: string, page: number) {
  const where = { nextSellerId: userId };
  const [rows, total, unread] = await Promise.all([
    prisma.commercialAssignmentAudit.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 20, take: 20, select: { id: true, resourceKind: true, resourceId: true, createdAt: true,
        reads: { where: { userId }, select: { readAt: true } } } }),
    prisma.commercialAssignmentAudit.count({ where }),
    prisma.commercialAssignmentAudit.count({ where: { ...where, reads: { none: { userId } } } }),
  ]);
  return { notifications: rows.map(({ reads, ...row }) => ({ ...row, readAt: reads[0]?.readAt ?? null })),
    unread, total, page, totalPages: Math.ceil(total / 20) };
}

export async function readCommercialNotification(userId: string, id: string) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`commercial-notification:${userId}:${id}`}))`;
    const assignment = await tx.commercialAssignmentAudit.findFirst({ where: { id, nextSellerId: userId }, select: { id: true } });
    if (!assignment) throw new NotFoundError('Aviso não encontrado.');
    const existing = await tx.commercialAssignmentRead.findUnique({ where: { assignmentId_userId: { assignmentId: id, userId } } });
    if (existing) return { id, readAt: existing.readAt };
    const row = await tx.commercialAssignmentRead.create({ data: { assignmentId: id, userId } });
    return { id, readAt: row.readAt };
  });
}
