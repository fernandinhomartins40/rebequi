import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { assignedScope, saleScope, requireCommercialAccess, type CommercialActor } from '../services/commercial-access.service.js';

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

  async findCustomerById(id: string, actor?: CommercialActor) {
    return prisma.user.findFirst({
      where: { id, role: 'CUSTOMER', ...assignedScope(actor) },
    });
  }

  async stageDistribution(actor?: CommercialActor) {
    return prisma.user.groupBy({
      by: ['customerStage'],
      where: { role: 'CUSTOMER', ...assignedScope(actor) },
      _count: { _all: true },
    });
  }

  /**
   * Métricas leves por cliente (para a lista). Faz 3 groupBy e cruza em memória
   * — evita N+1 mantendo a lista paginada eficiente.
   */
  async metricsForCustomers(customerIds: string[], actor?: CommercialActor) {
    if (customerIds.length === 0) {
      return new Map<string, CustomerMetricsRow>();
    }

    const [quotes, orders, sales] = await Promise.all([
      prisma.quoteRequest.groupBy({
        by: ['userId'],
        where: { userId: { in: customerIds }, ...assignedScope(actor) },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.customerOrder.groupBy({
        by: ['userId'],
        where: { userId: { in: customerIds }, ...assignedScope(actor) },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.sale.groupBy({
        by: ['customerId'],
        where: { customerId: { in: customerIds }, status: 'PAID', AND: [saleScope(actor)] },
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

  async timelineForCustomer(customerId: string, actor?: CommercialActor) {
    const [quotes, orders, sales] = await Promise.all([
      prisma.quoteRequest.findMany({
        where: { userId: customerId, ...assignedScope(actor) },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { items: { select: { id: true } } },
      }),
      prisma.customerOrder.findMany({
        where: { userId: customerId, ...assignedScope(actor) },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { items: true },
      }),
      prisma.sale.findMany({
        where: { customerId, AND: [saleScope(actor)] },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { items: { select: { id: true } } },
      }),
    ]);

    return { quotes, orders, sales };
  }

  async listNotes(customerId: string, actor?: CommercialActor) {
    return prisma.customerNote.findMany({
      where: { customerId, ...(actor?.role === 'SALES' ? { authorId: actor.userId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
    });
  }

  async createNote(data: { customerId: string; authorId?: string; body: string }, actor?: CommercialActor) {
    return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${data.customerId} FOR UPDATE`;
    await requireCommercialAccess('customer', data.customerId, actor, tx);
    await tx.user.update({ where: { id: data.customerId }, data: { lastContactedAt: new Date() } });
    const note = await tx.customerNote.create({
      data: {
        customerId: data.customerId,
        authorId: data.authorId,
        body: data.body,
      },
      include: { author: { select: { name: true } } },
    });
    if (actor) await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: note.id, action: 'CUSTOMER_NOTE_CREATED' } });
    return note;
    });
  }

  async deleteNote(id: string, customerId: string, actor?: CommercialActor) {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${customerId} FOR UPDATE`;
      await requireCommercialAccess('customer', customerId, actor, tx);
      const result = await tx.customerNote.deleteMany({ where: { id, customerId, ...(actor?.role === 'SALES' ? { authorId: actor.userId } : {}) } });
      if (actor && result.count) await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: id, action: 'CUSTOMER_NOTE_REMOVED' } });
      return result;
    });
  }

  async updateCustomer(id: string, data: Prisma.UserUpdateInput, actor?: CommercialActor) {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${id} FOR UPDATE`;
      await requireCommercialAccess('customer', id, actor, tx);
      const result = await tx.user.update({ where: { id, ...assignedScope(actor) }, data });
      if (actor) await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: id, action: 'CUSTOMER_CRM_UPDATED' } });
      return result;
    });
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
