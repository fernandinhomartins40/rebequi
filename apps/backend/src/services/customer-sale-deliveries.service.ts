import { prisma } from '../lib/prisma.js';

// Counter/ERP sales linked to the signed-in customer must also be trackable.
// Orders from the website already have their own tracking cards.
export async function customerSaleDeliveries(customerId: string, page: number) {
  const where = { customerId, orderId: null, fulfillment: { isNot: null } };
  const [sales, total] = await prisma.$transaction(async tx => Promise.all([
    tx.sale.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
      select: { id: true, referenceCode: true, status: true, fulfillment: { select: {
        status: true, mode: true, scheduledAt: true, updatedAt: true,
        deliveryStops: { where: { active: true }, take: 1, select: { run: { select: { status: true, loadedAt: true, departedAt: true } } } },
      } } } }),
    tx.sale.count({ where }),
  ]), { isolationLevel: 'RepeatableRead' });
  return { deliveries: sales.map(sale => {
    const fulfillment = sale.fulfillment!;
    const transport = fulfillment.deliveryStops[0]?.run;
    return { id: sale.id, referenceCode: sale.referenceCode, mode: fulfillment.mode, scheduledAt: fulfillment.scheduledAt,
      status: sale.status === 'CANCELED' ? 'CANCELED' : sale.status === 'PENDING_PAYMENT' ? 'PAYMENT_PENDING'
        : ['RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELED'].includes(fulfillment.status) ? fulfillment.status
        : transport && ['LOADED', 'IN_TRANSIT'].includes(transport.status) ? transport.status : fulfillment.status,
      updatedAt: new Date(Math.max(fulfillment.updatedAt.getTime(), transport?.departedAt?.getTime() ?? 0, transport?.loadedAt?.getTime() ?? 0)) };
  }), total, page, totalPages: Math.ceil(total / 20) };
}
