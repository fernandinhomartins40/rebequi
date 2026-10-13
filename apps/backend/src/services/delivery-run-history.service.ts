import { hasMerchantPermission } from '@rebequi/shared/constants';
import { prisma } from '../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.util.js';
export async function deliveryRunHistory(id: string, page: number, actor: { userId: string; role: string }) {
  if (actor.role !== 'DRIVER' && !hasMerchantPermission(actor.role, 'logistics:manage')) throw new ForbiddenError('Acesso não autorizado.');
  return prisma.$transaction(async tx => {
    const run = await tx.deliveryRun.findFirst({ where: { id, ...(actor.role === 'DRIVER' ? { driverId: actor.userId, status: { in: ['PLANNED', 'LOADED', 'IN_TRANSIT', 'CLOSED'] } } : {}) }, select: { id: true } });
    if (!run) throw new NotFoundError('Romaneio não encontrado.');
    const where = { runId: id };
    const [events, total] = await Promise.all([tx.deliveryRunEvent.findMany({ where, orderBy: { version: 'desc' }, skip: (page - 1) * 20, take: 20, select: { id: true, version: true, kind: true, createdAt: true, details: true } }), tx.deliveryRunEvent.count({ where })]);
    return { events: events.map(({ details, ...event }) => {
      const values = details as { note?: unknown; reason?: unknown } | null;
      const note = typeof values?.reason === 'string' ? values.reason : typeof values?.note === 'string' ? values.note : null;
      return { ...event, ...(actor.role !== 'DRIVER' ? { note } : {}) };
    }), total, page, totalPages: Math.ceil(total / 20) };
  }, { isolationLevel: 'RepeatableRead' });
}
