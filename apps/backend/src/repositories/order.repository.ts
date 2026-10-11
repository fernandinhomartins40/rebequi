import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { releaseOrderReservations } from '../services/stock-reservation.service.js';
import { ConflictError } from '../utils/errors.util.js';

const orderInclude = {
  reservations: true,
  user: true,
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      product: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.CustomerOrderInclude;

export class OrderRepository {
  async createOrder(data: Prisma.CustomerOrderCreateInput) {
    return prisma.customerOrder.create({
      data,
      include: orderInclude,
    });
  }

  async updateOrder(id: string, data: Prisma.CustomerOrderUpdateInput) {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM customer_orders WHERE id = ${id} FOR UPDATE`;
      if (data.status === 'CANCELED') {
        const sale = await tx.sale.findUnique({ where: { orderId: id } });
        if (sale && sale.status !== 'CANCELED') throw new ConflictError('Cancele a venda vinculada antes de cancelar este pedido.');
      }
      if (data.status === 'CANCELED' || data.status === 'COMPLETED') await releaseOrderReservations(tx, id);
      return tx.customerOrder.update({ where: { id }, data, include: orderInclude });
    });
  }

  async findOrderById(id: string) {
    return prisma.customerOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
  }

  async findManyOrders(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerOrderWhereInput;
    orderBy?: Prisma.CustomerOrderOrderByWithRelationInput;
  }) {
    return prisma.customerOrder.findMany({
      ...params,
      include: orderInclude,
    });
  }

  async countOrders(where?: Prisma.CustomerOrderWhereInput) {
    return prisma.customerOrder.count({ where });
  }
}
