import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.util.js';
const PUBLIC_PREPARATION = ['CREATED', 'DETAILS_CONFIRMED', 'PICK', 'CHECK', 'READY', 'SALE_CANCELED', 'RETURN_REQUIRES_RECHECK', 'RUN_RETURNED_TO_WAREHOUSE', 'PICKUP_RECEIVED', 'RETURN_RECONCILED'];
const PUBLIC_TRANSPORT = ['LOAD', 'UNLOAD', 'DEPART'];
export async function customerFulfillmentHistory(orderId: string, customerId: string, page: number) {
  return prisma.$transaction(async tx => {
    const order = await tx.customerOrder.findFirst({ where: { id: orderId, userId: customerId }, select: { sale: { select: { fulfillment: { select: { id: true } } } } } });
    if (!order) throw new NotFoundError('Pedido não encontrado.');
    const fulfillmentId = order.sale?.fulfillment?.id;
    if (!fulfillmentId) return { events: [], total: 0, page, totalPages: 0 };
    // Whitelist only stages relevant to this customer's own materials.
    // Never select internal payloads, crew, addresses, snapshots or occurrence text.
    const source = Prisma.sql`(
      SELECT 'preparation:' || e.id AS id, e.kind, e."createdAt"
      FROM fulfillment_events e WHERE e."fulfillmentId"=${fulfillmentId} AND e.kind IN (${Prisma.join(PUBLIC_PREPARATION)})
      UNION ALL
      SELECT 'transport:' || e.id AS id, e.kind, e."createdAt"
      FROM delivery_run_events e WHERE e.kind IN (${Prisma.join(PUBLIC_TRANSPORT)}) AND EXISTS (
        SELECT 1 FROM delivery_run_stops s WHERE s."runId"=e."runId" AND s."fulfillmentId"=${fulfillmentId}
      )
    ) history`;
    const [events, counts] = await Promise.all([
      tx.$queryRaw<{ id: string; kind: string; createdAt: Date }[]>(Prisma.sql`SELECT id,kind,"createdAt" FROM ${source} ORDER BY "createdAt" DESC,id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`),
      tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total FROM ${source}`),
    ]);
    const total = Number(counts[0].total);
    return { events, total, page, totalPages: Math.ceil(total / 20) };
  }, { isolationLevel: 'RepeatableRead' });
}
