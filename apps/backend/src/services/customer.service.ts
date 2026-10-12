import { CustomerStage, Prisma } from '@prisma/client';
import type {
  CreateCustomerNoteInput,
  CustomerFiltersInput,
  UpdateCustomerCrmInput,
} from '@rebequi/shared/schemas';
import { normalizeWhatsapp } from '@rebequi/shared/utils';
import { CustomerRepository, type CustomerMetricsRow } from '../repositories/customer.repository.js';
import { NotFoundError } from '../utils/errors.util.js';
import { assignedScope, type CommercialActor } from './commercial-access.service.js';

type PersistedCustomer = NonNullable<Awaited<ReturnType<CustomerRepository['findCustomerById']>>>;

const EMPTY_METRICS: CustomerMetricsRow = {
  quotesCount: 0,
  ordersCount: 0,
  salesCount: 0,
  totalSpent: 0,
  lastQuoteAt: null,
  lastOrderAt: null,
  lastSaleAt: null,
};

export class CustomerService {
  private repository: CustomerRepository;

  constructor() {
    this.repository = new CustomerRepository();
  }

  async listCustomers(filters: CustomerFiltersInput, actor?: CommercialActor) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { ...this.buildWhere(filters), ...assignedScope(actor) };

    const [customers, total] = await Promise.all([
      this.repository.findManyCustomers({ skip, take: limit, where }),
      this.repository.countCustomers(where),
    ]);

    const metricsMap = await this.repository.metricsForCustomers(customers.map((c) => c.id), actor);

    return {
      customers: customers.map((customer) => this.toListItem(customer, metricsMap.get(customer.id) ?? EMPTY_METRICS)),
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStageDistribution(actor?: CommercialActor) {
    const distribution = await this.repository.stageDistribution(actor);
    return distribution.map((row) => ({ stage: row.customerStage, count: row._count._all }));
  }

  async getCustomerDetail(id: string, actor?: CommercialActor) {
    const customer = await this.repository.findCustomerById(id, actor);
    if (!customer) {
      throw new NotFoundError('Cliente nao encontrado');
    }

    const [metricsMap, timelineData, notes] = await Promise.all([
      this.repository.metricsForCustomers([id], actor),
      this.repository.timelineForCustomer(id, actor),
      this.repository.listNotes(id, actor),
    ]);

    const metrics = metricsMap.get(id) ?? EMPTY_METRICS;
    const timeline = this.buildTimeline(timelineData);

    return {
      ...this.toListItem(customer, metrics),
      notes: notes.map((note) => ({
        id: note.id,
        customerId: note.customerId,
        authorId: note.authorId,
        authorName: note.author?.name ?? null,
        body: note.body,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
      timeline,
    };
  }

  async updateCrm(id: string, data: UpdateCustomerCrmInput, actor?: CommercialActor) {
    const customer = await this.repository.findCustomerById(id, actor);
    if (!customer) {
      throw new NotFoundError('Cliente nao encontrado');
    }

    const update: Prisma.UserUpdateInput = {};

    if (data.stage !== undefined) {
      update.customerStage = data.stage;
      // Definir o estágio manualmente trava a automação, a não ser que stageManual seja explicitamente false.
      update.customerStageManual = data.stageManual ?? true;
    } else if (data.stageManual !== undefined) {
      update.customerStageManual = data.stageManual;
    }

    if (data.tags !== undefined) {
      update.customerTags = Array.from(new Set(data.tags.map((tag) => tag.trim()).filter(Boolean)));
    }

    if (data.followUpAt !== undefined) {
      update.followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
    }

    const updated = await this.repository.updateCustomer(id, update, actor);
    const metricsMap = await this.repository.metricsForCustomers([id], actor);
    return this.toListItem(updated, metricsMap.get(id) ?? EMPTY_METRICS);
  }

  async addNote(id: string, authorId: string | undefined, data: CreateCustomerNoteInput, actor?: CommercialActor) {
    const customer = await this.repository.findCustomerById(id, actor);
    if (!customer) {
      throw new NotFoundError('Cliente nao encontrado');
    }

    const note = await this.repository.createNote({ customerId: id, authorId, body: data.body }, actor);
    return {
      id: note.id,
      customerId: note.customerId,
      authorId: note.authorId,
      authorName: note.author?.name ?? null,
      body: note.body,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  async deleteNote(customerId: string, noteId: string, actor?: CommercialActor) {
    const result = await this.repository.deleteNote(noteId, customerId, actor);
    if (result.count === 0) {
      throw new NotFoundError('Anotacao nao encontrada');
    }
    return { deleted: true };
  }

  /**
   * Deriva o estágio do funil a partir do histórico real e persiste — a não ser
   * que o lojista tenha travado o estágio manualmente. Chamado pelos fluxos de
   * orçamento e venda para manter o funil vivo sem trabalho manual.
   */
  async maybeAdvanceStage(customerId: string) {
    const customer = await this.repository.findCustomerById(customerId);
    if (!customer || customer.customerStageManual) {
      return;
    }

    const metricsMap = await this.repository.metricsForCustomers([customerId]);
    const metrics = metricsMap.get(customerId) ?? EMPTY_METRICS;
    const derived = this.deriveStage(metrics);

    if (derived !== customer.customerStage) {
      await this.repository.updateCustomer(customerId, { customerStage: derived });
    }
  }

  private deriveStage(metrics: CustomerMetricsRow): CustomerStage {
    if (metrics.salesCount >= 2) return CustomerStage.RECURRING;
    if (metrics.salesCount === 1) return CustomerStage.CUSTOMER;
    if (metrics.quotesCount > 0 || metrics.ordersCount > 0) return CustomerStage.QUOTING;
    return CustomerStage.NEW;
  }

  private buildWhere(filters: CustomerFiltersInput): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filters.stage) where.customerStage = filters.stage;
    if (filters.tag?.trim()) where.customerTags = { has: filters.tag.trim() };
    if (filters.followUpDue) where.followUpAt = { not: null, lte: new Date() };

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: normalizeWhatsapp(search) || search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private toListItem(customer: PersistedCustomer, metrics: CustomerMetricsRow) {
    const lastActivityAt = [metrics.lastQuoteAt, metrics.lastOrderAt, metrics.lastSaleAt, customer.lastContactedAt]
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email.includes('@') ? customer.email : null,
      whatsapp: customer.whatsapp ?? (customer.email.includes('@') ? null : customer.email),
      isActive: customer.isActive,
      stage: customer.customerStage,
      stageManual: customer.customerStageManual,
      tags: customer.customerTags,
      followUpAt: customer.followUpAt,
      lastContactedAt: customer.lastContactedAt,
      createdAt: customer.createdAt,
      metrics: {
        quotesCount: metrics.quotesCount,
        ordersCount: metrics.ordersCount,
        salesCount: metrics.salesCount,
        totalSpent: Number(metrics.totalSpent.toFixed(2)),
        lastQuoteAt: metrics.lastQuoteAt,
        lastOrderAt: metrics.lastOrderAt,
        lastSaleAt: metrics.lastSaleAt,
        lastActivityAt,
      },
    };
  }

  private buildTimeline(data: Awaited<ReturnType<CustomerRepository['timelineForCustomer']>>) {
    const entries: Array<{
      kind: 'quote' | 'order' | 'sale';
      id: string;
      referenceCode: string;
      title: string;
      status: string;
      amount?: number | null;
      itemCount?: number;
      at: Date;
    }> = [];

    for (const quote of data.quotes) {
      entries.push({
        kind: 'quote',
        id: quote.id,
        referenceCode: quote.referenceCode,
        title: quote.title || 'Orçamento',
        status: quote.status,
        itemCount: quote.items.length,
        at: quote.createdAt,
      });
    }

    for (const order of data.orders) {
      const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      entries.push({
        kind: 'order',
        id: order.id,
        referenceCode: order.referenceCode,
        title: 'Pedido (checkout)',
        status: order.status,
        amount: Number(subtotal.toFixed(2)),
        itemCount: order.items.length,
        at: order.createdAt,
      });
    }

    for (const sale of data.sales) {
      entries.push({
        kind: 'sale',
        id: sale.id,
        referenceCode: sale.referenceCode,
        title: 'Venda',
        status: sale.status,
        amount: sale.total,
        itemCount: sale.items.length,
        at: sale.createdAt,
      });
    }

    return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
  }
}
