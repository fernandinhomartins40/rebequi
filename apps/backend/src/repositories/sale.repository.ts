import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

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

      for (const movement of params.stockDecrements) {
        const stockAfter = movement.stockBefore - movement.quantity;

        await tx.product.update({
          where: { id: movement.productId },
          data: { stock: stockAfter },
        });

        await tx.stockMovement.create({
          data: {
            productId: movement.productId,
            type: 'SALE',
            quantity: -movement.quantity,
            stockBefore: movement.stockBefore,
            stockAfter,
            reason: movement.reason,
            saleId: sale.id,
          },
        });
      }

      return sale;
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
