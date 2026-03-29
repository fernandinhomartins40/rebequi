import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const orderInclude = {
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
    return prisma.customerOrder.update({
      where: { id },
      data,
      include: orderInclude,
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
