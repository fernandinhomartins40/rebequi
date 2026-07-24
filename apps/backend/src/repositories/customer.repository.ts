import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Data access for the CRM. Clientes são usuários com role CUSTOMER; as métricas
 * são derivadas dos orçamentos, pedidos e vendas já existentes.
 */
export class CustomerRepository {
  private baseWhere(where?: Prisma.UserWhereInput): Prisma.UserWhereInput {
    return { role: 'CUSTOMER', ...where };
  }

  async findManyCustomers(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    return prisma.user.findMany({
      skip: params.skip,
      take: params.take,
      where: this.baseWhere(params.where),
      orderBy: params.orderBy ?? { createdAt: 'desc' },
    });
  }

  async countCustomers(where?: Prisma.UserWhereInput) {
    return prisma.user.count({ where: this.baseWhere(where) });
  }

  async findCustomerById(id: string) {
    return prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
    });
  }

  async stageDistribution() {
    return prisma.user.groupBy({
      by: ['customerStage'],
      where: { role: 'CUSTOMER' },
      _count: { _all: true },
    });
  }

  /**
   * Métricas leves por cliente (para a lista). Faz 3 groupBy e cruza em memória
   * — evita N+1 mantendo a lista paginada eficiente.
   */
  async metricsForCustomers(customerIds: string[]) {
    if (customerIds.length === 0) {
      return new Map<string, CustomerMetricsRow>();
    }

    const [quotes, orders, sales] = await Promise.all([
      prisma.quoteRequest.groupBy({
        by: ['userId'],
        where: { userId: { in: customerIds } },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.customerOrder.groupBy({
        by: ['userId'],
        where: { userId: { in: customerIds } },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.sale.groupBy({
        by: ['customerId'],
        where: { customerId: { in: customerIds }, status: 'PAID' },
        _count: { _all: true },
        _sum: { total: true },
        _max: { createdAt: true },
      }),
    ]);

    const map = new Map<string, CustomerMetricsRow>();
    const ensure = (id: string) =>
      map.get(id) ??
      map.set(id, {
        quotesCount: 0,
        ordersCount: 0,
        salesCount: 0,
        totalSpent: 0,
        lastQuoteAt: null,
        lastOrderAt: null,
        lastSaleAt: null,
      }).get(id)!;

    for (const row of quotes) {
      const m = ensure(row.userId);
      m.quotesCount = row._count._all;
      m.lastQuoteAt = row._max.createdAt;
    }
    for (const row of orders) {
      const m = ensure(row.userId);
      m.ordersCount = row._count._all;
      m.lastOrderAt = row._max.createdAt;
    }
    for (const row of sales) {
      if (!row.customerId) continue;
      const m = ensure(row.customerId);
      m.salesCount = row._count._all;
      m.totalSpent = row._sum.total ?? 0;
      m.lastSaleAt = row._max.createdAt;
    }

    return map;
  }

  async timelineForCustomer(customerId: string) {
    const [quotes, orders, sales] = await Promise.all([
      prisma.quoteRequest.findMany({
        where: { userId: customerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { items: { select: { id: true } } },
      }),
      prisma.customerOrder.findMany({
        where: { userId: customerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { items: true },
      }),
      prisma.sale.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { items: { select: { id: true } } },
      }),
    ]);

    return { quotes, orders, sales };
  }

  async listNotes(customerId: string) {
    return prisma.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
    });
  }

  async createNote(data: { customerId: string; authorId?: string; body: string }) {
    return prisma.customerNote.create({
      data: {
        customerId: data.customerId,
        authorId: data.authorId,
        body: data.body,
      },
      include: { author: { select: { name: true } } },
    });
  }

  async deleteNote(id: string, customerId: string) {
    return prisma.customerNote.deleteMany({ where: { id, customerId } });
  }

  async updateCustomer(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }
}

export type CustomerMetricsRow = {
  quotesCount: number;
  ordersCount: number;
  salesCount: number;
  totalSpent: number;
  lastQuoteAt: Date | null;
  lastOrderAt: Date | null;
  lastSaleAt: Date | null;
};
