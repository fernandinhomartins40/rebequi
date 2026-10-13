import { hasMerchantPermission } from '@rebequi/shared/constants';
import { prisma } from '../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.util.js';
export async function deliveryRunHistory(id: string, page: number, actor: { userId: string; role: string }) {
  if (actor.role !== 'DRIVER' && !hasMerchantPermission(actor.role, 'logistics:manage')) throw new ForbiddenError('Acesso não autorizado.');
  return prisma.$transaction(async tx => {
    const run = await tx.deliveryRun.findFirst({ where: { id, ...(actor.role === 'DRIVER' ? { driverId: actor.userId, status: { in: ['PLANNED', 'LOADED', 'IN_TRANSIT', 'CLOSED'] } } : {}) }, select: { id: true } });
    if (!run) throw new NotFoundError('Romaneio não encontrado.');
    const where = { runId: id };
    const [events, total] = await Promise.all([tx.deliveryRunEvent.findMany({ where, orderBy: { version: 'desc' }, skip: (page - 1) * 20, take: 20, select: { id: true, version: true, kind: true, createdAt: true, details: true, requestKey: true } }), tx.deliveryRunEvent.count({ where })]);
    const keys = events.filter(event => event.kind === 'DELIVERY_RECEIVED').map(event => `delivery:${event.requestKey}`);
    const receipts = keys.length ? await tx.fulfillmentEvent.findMany({ where: { requestKey: { in: keys }, kind: 'DELIVERY_RECEIVED' }, select: { requestKey: true, id: true } }) : [];
    const receiptIds = new Map(receipts.map(receipt => [receipt.requestKey, receipt.id]));
    return { events: events.map(({ details, requestKey, ...event }) => {
      const values = details as { note?: unknown; reason?: unknown } | null;
      const note = typeof values?.reason === 'string' ? values.reason : typeof values?.note === 'string' ? values.note : null;
      const receiptId = receiptIds.get(`delivery:${requestKey}`);
      return { ...event, ...(receiptId ? { receiptId } : {}), ...(actor.role !== 'DRIVER' ? { note } : {}) };
    }), total, page, totalPages: Math.ceil(total / 20) };
  }, { isolationLevel: 'RepeatableRead' });
}
