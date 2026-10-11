import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { enqueueCatalogChange } from '../services/integration-outbox.service.js';

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
  /**
   * Creates a sale, its items and the corresponding stock movements, and
   * decrements product stock — all inside a single transaction so estoque e
   * venda nunca ficam inconsistentes.
   */
  async createSaleWithStock(params: {
    sale: Prisma.SaleCreateInput;
    stockDecrements: Array<{ productId: string; quantity: number; stockBefore: number; reason: string }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: params.sale,
        include: saleInclude,
      });

      for (const movement of [...params.stockDecrements].sort((a, b) => a.productId.localeCompare(b.productId))) {
        const changed = await tx.product.updateMany({
          where: { id: movement.productId, isActive: true, deletedAt: null, stock: { gte: movement.quantity } },
          data: { stock: { decrement: movement.quantity } },
        });
        if (changed.count !== 1) throw new ConflictError('Estoque insuficiente. Atualize os itens da venda.');
        const product = await tx.product.findUniqueOrThrow({ where: { id: movement.productId } });
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
      return sale;
    });
  }

  async transitionStatus(id: string, status: 'PAID' | 'PENDING_PAYMENT' | 'CANCELED', notes?: string | null) {
    return prisma.$transaction(async tx => {
      // Serialize transitions so duplicate cancellations cannot restore twice.
      await tx.$queryRaw`SELECT id FROM sales WHERE id = ${id} FOR UPDATE`;
      const sale = await tx.sale.findUnique({ where: { id }, include: saleInclude });
      if (!sale) throw new NotFoundError('Venda não encontrada');
      if (sale.status === 'CANCELED' && status !== 'CANCELED') {
        throw new ValidationError('Venda cancelada não pode ser reaberta. Registre uma nova venda.');
      }
      if (status === 'CANCELED' && sale.status !== 'CANCELED') {
        for (const item of [...sale.items].sort((a, b) => (a.productId ?? '').localeCompare(b.productId ?? ''))) {
          if (!item.productId) continue;
          const product = await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          await tx.stockMovement.create({ data: {
            productId: product.id, type: 'RETURN', quantity: item.quantity,
            stockBefore: product.stock - item.quantity, stockAfter: product.stock,
            reason: `Estorno da venda ${sale.referenceCode}`, saleId: sale.id,
          } });
          await enqueueCatalogChange(tx, product.id);
        }
        if (sale.orderId) await tx.customerOrder.update({ where: { id: sale.orderId }, data: { status: 'CANCELED', canceledAt: new Date() } });
      }
      return tx.sale.update({ where: { id }, data: {
        status, ...(notes !== undefined ? { notes } : {}),
        paidAt: status === 'PAID' ? sale.paidAt ?? new Date() : sale.paidAt,
        canceledAt: status === 'CANCELED' ? sale.canceledAt ?? new Date() : null,
      }, include: saleInclude });
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
    const [byStatus, byPayment] = await Promise.all([
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
    ]);

    return { byStatus, byPayment };
  }

  async sumItemsSold(where: Prisma.SaleWhereInput) {
    const result = await prisma.saleItem.aggregate({
      where: { sale: where },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }
}
