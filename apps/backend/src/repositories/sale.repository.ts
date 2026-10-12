import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { enqueueCatalogChange } from '../services/integration-outbox.service.js';
import { earnPartnerSale, holdPartnerPayment, reversePartnerSale } from '../services/partner-program.service.js';
import { requireCommercialAccess, type CommercialActor } from '../services/commercial-access.service.js';

const saleInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      whatsapp: true,
    },
  },
  items: {
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SaleInclude;

export class SaleRepository {
  async findByIdempotencyKey(idempotencyKey: string) {
    return prisma.sale.findUnique({ where: { idempotencyKey }, include: saleInclude });
  }
  /**
   * Creates a sale, its items and the corresponding stock movements, and
   * decrements product stock — all inside a single transaction so estoque e
   * venda nunca ficam inconsistentes.
   */
  async createSaleWithStock(params: {
    actor?: CommercialActor;
    sale: Prisma.SaleCreateInput;
    stockDecrements: Array<{ productId: string; quantity: number; stockBefore: number; reason: string }>;
  }) {
    return prisma.$transaction(async (tx) => {
      let assignedSellerId = params.sale.registeredBy?.connect?.id;
      const orderId = params.sale.order?.connect?.id;
      if (orderId) {
        await tx.$queryRaw`SELECT id FROM customer_orders WHERE id = ${orderId} FOR UPDATE`;
        const order = await tx.customerOrder.findUnique({ where: { id: orderId } });
        if (!order || order.status === 'CANCELED') throw new ConflictError('Pedido indisponível para venda');
        await requireCommercialAccess('order', orderId, params.actor, tx);
        assignedSellerId = order.assignedSellerId ?? assignedSellerId;
      }
      const customerId = params.sale.customer?.connect?.id;
      if (customerId && params.actor?.role === 'SALES' && !orderId) {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${customerId} FOR UPDATE`;
        await requireCommercialAccess('customer', customerId, params.actor, tx);
      }
      const sale = await tx.sale.create({
        data: { ...params.sale, ...(assignedSellerId ? { assignedSeller: { connect: { id: assignedSellerId } } } : {}), accountingVersion: 1 },
        include: saleInclude,
      });

      for (const movement of [...params.stockDecrements].sort((a, b) => a.productId.localeCompare(b.productId))) {
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${movement.productId} FOR UPDATE`;
        const current = await tx.product.findUniqueOrThrow({ where: { id: movement.productId } });
        const reservation = orderId ? await tx.stockReservation.findUnique({ where: { orderId_productId: { orderId, productId: movement.productId } } }) : null;
        const reserved = reservation?.status === 'ACTIVE' ? reservation.quantity : 0;
        if (!current.isActive || current.deletedAt || current.stock - current.reservedStock + reserved < movement.quantity) throw new ConflictError('Estoque insuficiente. Atualize os itens da venda.');
        const product = await tx.product.update({ where: { id: movement.productId }, data: {
          stock: { decrement: movement.quantity }, reservedStock: { decrement: reserved },
        } });
        if (reservation && reserved) await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: 'CONSUMED' } });
        const stockAfter = product.stock;
        await tx.stockMovement.create({
          data: {
            productId: movement.productId,
            type: 'SALE',
            quantity: -movement.quantity,
            stockBefore: stockAfter + movement.quantity,
            stockAfter,
            reason: movement.reason,
            saleId: sale.id,
          },
        });
        await enqueueCatalogChange(tx, movement.productId);
      }
      if (params.sale.order?.connect?.id) {
        await tx.customerOrder.update({ where: { id: params.sale.order.connect.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      }
      await earnPartnerSale(tx, sale.id);
      return sale;
    });
  }

  async transitionStatus(id: string, status: 'PAID' | 'PENDING_PAYMENT' | 'CANCELED', notes?: string | null, actorId?: string, actor?: CommercialActor) {
    return prisma.$transaction(async tx => {
      // Serialize transitions so duplicate cancellations cannot restore twice.
      await tx.$queryRaw`SELECT id FROM sales WHERE id = ${id} FOR UPDATE`;
      await requireCommercialAccess('sale', id, actor, tx);
      const sale = await tx.sale.findUnique({ where: { id }, include: saleInclude });
      if (!sale) throw new NotFoundError('Venda não encontrada');
      if (sale.status === 'CANCELED' && status !== 'CANCELED') {
        throw new ValidationError('Venda cancelada não pode ser reaberta. Registre uma nova venda.');
      }
      if (status === 'CANCELED' && sale.status !== 'CANCELED') {
        const returns = await tx.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId: id } }, _sum: { quantity: true } });
        const returned = new Map(returns.map(row => [row.saleItemId, row._sum.quantity ?? 0]));
        for (const item of [...sale.items].sort((a, b) => (a.productId ?? '').localeCompare(b.productId ?? ''))) {
          if (!item.productId) continue;
          const quantity = item.quantity - (returned.get(item.id) ?? 0);
          if (!quantity) continue;
          const product = await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: quantity } } });
          await tx.stockMovement.create({ data: {
            productId: product.id, type: 'RETURN', quantity,
            stockBefore: product.stock - quantity, stockAfter: product.stock,
            reason: `Estorno da venda ${sale.referenceCode}`, saleId: sale.id,
          } });
          await enqueueCatalogChange(tx, product.id);
        }
        if (sale.orderId) await tx.customerOrder.update({ where: { id: sale.orderId }, data: { status: 'CANCELED', canceledAt: new Date() } });
        // Release a payment hold before reversing the complete original basis.
        await holdPartnerPayment(tx, id, sale.statusVersion + 1, true, actorId);
        await reversePartnerSale(tx, id, BigInt(Math.round(sale.total * 100)), `sale-canceled:${id}`, actorId);
      }
      if (status === 'PENDING_PAYMENT' && sale.status !== status) await holdPartnerPayment(tx, id, sale.statusVersion + 1, false, actorId);
      const updated = await tx.sale.update({ where: { id }, data: {
        accountingVersion: 1,
        ...(sale.status !== status ? { statusVersion: { increment: 1 } } : {}),
        status, ...(notes !== undefined ? { notes } : {}),
        paidAt: status === 'PAID' ? sale.paidAt ?? new Date() : sale.paidAt,
        canceledAt: status === 'CANCELED' ? sale.canceledAt ?? new Date() : null,
      }, include: saleInclude });
      if (status === 'PAID' && sale.status !== status) { await earnPartnerSale(tx, id, actorId); await holdPartnerPayment(tx, id, updated.statusVersion, true, actorId); }
      if (actorId && sale.status !== status) await tx.integrationAudit.create({ data: { actorId, jobId: id, action: `SALE_STATUS_${status}` } });
      return updated;
    });
  }

  async updateSale(id: string, data: Prisma.SaleUpdateInput) {
    return prisma.sale.update({
      where: { id },
      data,
      include: saleInclude,
    });
  }

  async findSaleById(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: saleInclude,
    });
  }

  async findSaleByOrderId(orderId: string) {
    return prisma.sale.findUnique({
      where: { orderId },
      include: saleInclude,
    });
  }

  async findManySales(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SaleWhereInput;
    orderBy?: Prisma.SaleOrderByWithRelationInput;
  }) {
    return prisma.sale.findMany({
      ...params,
      include: saleInclude,
    });
  }

  async countSales(where?: Prisma.SaleWhereInput) {
    return prisma.sale.count({ where });
  }

  /**
   * Aggregations for the revenue dashboard, scoped by an optional date window.
   */
  async aggregateRevenue(where: Prisma.SaleWhereInput) {
    const [byStatus, byPayment, refunds, refundsByPayment, pendingRefunds] = await Promise.all([
      prisma.sale.groupBy({
        by: ['status'],
        where,
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: { ...where, status: 'PAID' },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.saleReturn.aggregate({ where: { sale: { ...where, status: 'PAID' } }, _sum: { refundCents: true } }),
      Promise.all((['PIX', 'CASH', 'CARD', 'INSTALLMENT'] as const).map(async paymentMethod => ({ paymentMethod, total: (await prisma.saleReturn.aggregate({ where: { sale: { ...where, status: 'PAID', paymentMethod } }, _sum: { refundCents: true } }))._sum.refundCents ?? 0n }))),
      prisma.saleReturn.aggregate({ where: { sale: { ...where, status: 'PENDING_PAYMENT' } }, _sum: { refundCents: true } }),
    ]);

    return { byStatus, byPayment, refunds: refunds._sum.refundCents ?? 0n, refundsByPayment, pendingRefunds: pendingRefunds._sum.refundCents ?? 0n };
  }

  async sumItemsSold(where: Prisma.SaleWhereInput) {
    const result = await prisma.saleItem.aggregate({
      where: { sale: where },
      _sum: { quantity: true },
    });
    const returned = await prisma.saleReturnItem.aggregate({ where: { saleItem: { sale: where } }, _sum: { quantity: true } });
    return (result._sum.quantity ?? 0) - (returned._sum.quantity ?? 0);
  }
}
