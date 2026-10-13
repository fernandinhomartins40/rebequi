import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.util.js';

export async function customerFulfillmentMaterials(orderId: string, customerId: string, page: number) {
  return prisma.$transaction(async tx => {
    const order = await tx.customerOrder.findFirst({
      where: { id: orderId, userId: customerId },
      select: { sale: { select: { fulfillment: { select: { id: true } } } } },
    });
    if (!order) throw new NotFoundError('Pedido não encontrado.');
    const fulfillmentId = order.sale?.fulfillment?.id;
    if (!fulfillmentId) return { materials: [], total: 0, page, totalPages: 0 };
    const [items, total] = await Promise.all([
      tx.fulfillmentItem.findMany({ where: { fulfillmentId }, orderBy: { id: 'asc' }, take: 20, skip: (page - 1) * 20,
        select: { id: true, saleItemId: true, nameSnapshot: true, quantity: true, delivered: true } }),
      tx.fulfillmentItem.count({ where: { fulfillmentId } }),
    ]);
    const returned = items.length ? await tx.saleReturnItem.groupBy({
      by: ['saleItemId'], where: { saleItemId: { in: items.map(item => item.saleItemId) } }, _sum: { quantity: true },
    }) : [];
    const quantities = new Map(returned.map(item => [item.saleItemId, item._sum.quantity ?? 0]));
    // delivered is the current physical balance with the customer, not gross historical receipts.
    const materials = items.map(item => {
      const removedQuantity = quantities.get(item.saleItemId) ?? 0;
      return { id: item.id, name: item.nameSnapshot, orderedQuantity: item.quantity,
        removedQuantity, receivedQuantity: item.delivered, pendingQuantity: item.quantity - removedQuantity - item.delivered };
    });
    return { materials, total, page, totalPages: Math.ceil(total / 20) };
  }, { isolationLevel: 'RepeatableRead' });
}
