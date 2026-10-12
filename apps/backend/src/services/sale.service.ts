import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.util.js';
import type {
  CreateSaleInput,
  RevenueSummaryQueryInput,
  SaleFiltersInput,
  UpdateSaleStatusInput,
} from '@rebequi/shared/schemas';
import { normalizeWhatsapp } from '@rebequi/shared/utils';
import { OrderRepository } from '../repositories/order.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { SaleRepository } from '../repositories/sale.repository.js';
import { CustomerService } from './customer.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';

type PersistedSale = NonNullable<Awaited<ReturnType<SaleRepository['findSaleById']>>>;

type ResolvedItem = {
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  stockBefore: number;
};

export class SaleService {
  private saleRepository: SaleRepository;
  private productRepository: ProductRepository;
  private orderRepository: OrderRepository;
  private customerService: CustomerService;

  constructor() {
    this.saleRepository = new SaleRepository();
    this.productRepository = new ProductRepository();
    this.orderRepository = new OrderRepository();
    this.customerService = new CustomerService();
  }

  async createSale(registeredById: string | undefined, data: CreateSaleInput) {
    try { return await this.createSaleOnce(registeredById, data); }
    catch (error) {
      if (data.idempotencyKey) {
        const key = createHash('sha256').update(`${registeredById ?? ''}:${data.idempotencyKey}`).digest('hex');
        const existing = await this.saleRepository.findByIdempotencyKey(key);
        if (existing) {
          if (existing.requestFingerprint !== this.requestFingerprint(data)) throw new ConflictError('Este envio já foi utilizado para outra venda.');
          return this.formatSale(existing);
        }
      }
      throw error;
    }
  }

  private requestFingerprint(data: CreateSaleInput) {
    return createHash('sha256').update(JSON.stringify({
      orderId: data.orderId ?? null, customerId: data.customerId ?? null, customerName: data.customerName ?? null,
      customerWhatsapp: data.customerWhatsapp ?? null, paymentMethod: data.paymentMethod, status: data.status ?? 'PAID',
      discount: data.discount ?? 0, notes: data.notes ?? null, items: data.items ?? null,
    })).digest('hex');
  }

  private async createSaleOnce(registeredById: string | undefined, data: CreateSaleInput) {
    const requestKey = data.idempotencyKey ? createHash('sha256').update(`${registeredById ?? ''}:${data.idempotencyKey}`).digest('hex') : undefined;
    const fingerprint = this.requestFingerprint(data);
    if (requestKey) {
      const existing = await this.saleRepository.findByIdempotencyKey(requestKey);
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) throw new ConflictError('Este envio já foi utilizado para outra venda.');
        return this.formatSale(existing);
      }
    }
    let orderId: string | undefined;
    let customerId = data.customerId;
    let customerName = data.customerName?.trim() || null;
    let customerWhatsapp = data.customerWhatsapp ? normalizeWhatsapp(data.customerWhatsapp) : null;

    let rawItems: Array<{ productId: string; quantity: number; unitPrice?: number }>;

    if (data.orderId) {
      const order = await this.orderRepository.findOrderById(data.orderId);
      if (!order) {
        throw new NotFoundError('Pedido nao encontrado');
      }

      const existingSale = await this.saleRepository.findSaleByOrderId(order.id);
      if (existingSale) {
        throw new ConflictError('Este pedido ja possui uma venda registrada');
      }

      if (order.status === 'CANCELED') {
        throw new ValidationError('Nao e possivel registrar venda de um pedido cancelado');
      }

      orderId = order.id;
      customerId = customerId ?? order.userId;
      customerName = customerName ?? order.customerNameSnapshot;
      customerWhatsapp = customerWhatsapp ?? order.customerWhatsapp;

      rawItems = order.items
        .filter((item) => Boolean(item.productId))
        .map((item) => ({
          productId: item.productId as string,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));

      if (rawItems.length === 0) {
        throw new ValidationError('O pedido nao possui itens vinculados a produtos ativos.');
      }
    } else {
      rawItems = data.items ?? [];
    }

    const resolvedItems = await this.resolveItems(rawItems);
    const subtotal = resolvedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = Math.min(data.discount ?? 0, subtotal);
    const total = this.roundCurrency(subtotal - discount);
    const status = data.status ?? 'PAID';

    const sale = await this.saleRepository.createSaleWithStock({
      sale: {
        referenceCode: this.generateReferenceCode(),
        idempotencyKey: requestKey ?? null,
        requestFingerprint: requestKey ? fingerprint : null,
        status,
        paymentMethod: data.paymentMethod,
        subtotal: this.roundCurrency(subtotal),
        discount: this.roundCurrency(discount),
        total,
        notes: data.notes ?? null,
        customerNameSnapshot: customerName,
        customerWhatsapp,
        paidAt: status === 'PAID' ? new Date() : null,
        ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
        ...(orderId ? { order: { connect: { id: orderId } } } : {}),
        ...(registeredById ? { registeredBy: { connect: { id: registeredById } } } : {}),
        items: {
          create: resolvedItems.map((item) => ({
            product: { connect: { id: item.productId } },
            productNameSnapshot: item.productNameSnapshot,
            productSkuSnapshot: item.productSkuSnapshot,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      stockDecrements: resolvedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        stockBefore: item.stockBefore,
        reason: `Venda ${item.productNameSnapshot}`,
      })),
    }).catch(async error => {
      if (requestKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.saleRepository.findByIdempotencyKey(requestKey);
        if (existing?.requestFingerprint === fingerprint) return existing;
      }
      throw error;
    });

    // CRM: uma venda paga promove o cliente no funil (cliente/recorrente).
    if (customerId) {
      try { await this.customerService.maybeAdvanceStage(customerId); }
      catch { logger.warn('CRM refresh deferred after committed sale', { saleId: sale.id }); }
    }

    return this.formatSale(sale);
  }

  async updateSaleStatus(saleId: string, data: UpdateSaleStatusInput, actorId?: string) {
    const updated = await this.saleRepository.transitionStatus(saleId, data.status, data.notes, actorId);

    return this.formatSale(updated);
  }

  async listSales(filters: SaleFiltersInput) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(filters);

    const [sales, total] = await Promise.all([
      this.saleRepository.findManySales({ skip, take: limit, where, orderBy: { createdAt: 'desc' } }),
      this.saleRepository.countSales(where),
    ]);

    return {
      limit,
      page,
      sales: sales.map((sale) => this.formatSale(sale)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSaleById(saleId: string) {
    const sale = await this.saleRepository.findSaleById(saleId);
    if (!sale) {
      throw new NotFoundError('Venda nao encontrada');
    }
    return this.formatSale(sale);
  }

  async getRevenueSummary(query: RevenueSummaryQueryInput) {
    const where: Prisma.SaleWhereInput = {};
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = new Date(query.from);
    if (query.to) createdAt.lte = new Date(query.to);
    if (query.from || query.to) where.createdAt = createdAt;

    const [{ byStatus, byPayment, refunds, refundsByPayment, pendingRefunds }, itemsSold] = await Promise.all([
      this.saleRepository.aggregateRevenue(where),
      this.saleRepository.sumItemsSold({ ...where, status: 'PAID' }),
    ]);

    const statusMap = new Map(byStatus.map((row) => [row.status, row]));
    const paid = statusMap.get('PAID');
    const pending = statusMap.get('PENDING_PAYMENT');
    const canceled = statusMap.get('CANCELED');

    const paidRevenue = this.roundCurrency((paid?._sum.total ?? 0) - Number(refunds) / 100);
    const pendingRevenue = this.roundCurrency((pending?._sum.total ?? 0) - Number(pendingRefunds) / 100);
    const paidCount = paid?._count._all ?? 0;
    const pendingCount = pending?._count._all ?? 0;
    const canceledCount = canceled?._count._all ?? 0;
    const salesCount = paidCount + pendingCount + canceledCount;

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      paidRevenue,
      pendingRevenue,
      salesCount,
      paidCount,
      pendingCount,
      canceledCount,
      averageTicket: paidCount > 0 ? this.roundCurrency(paidRevenue / paidCount) : 0,
      itemsSold,
      paymentBreakdown: byPayment.map((row) => ({
        paymentMethod: row.paymentMethod,
        total: this.roundCurrency((row._sum.total ?? 0) - Number(refundsByPayment.find(refund => refund.paymentMethod === row.paymentMethod)?.total ?? 0n) / 100),
        count: row._count._all,
      })),
    };
  }

  private async resolveItems(
    rawItems: Array<{ productId: string; quantity: number; unitPrice?: number }>
  ): Promise<ResolvedItem[]> {
    if (rawItems.length === 0) {
      throw new ValidationError('Adicione pelo menos um item a venda.');
    }

    // Consolida quantidades por produto (evita duas linhas do mesmo produto furando o estoque).
    const consolidated = new Map<string, { quantity: number; unitPrice?: number }>();
    for (const item of rawItems) {
      const existing = consolidated.get(item.productId);
      consolidated.set(item.productId, {
        quantity: (existing?.quantity ?? 0) + item.quantity,
        unitPrice: item.unitPrice ?? existing?.unitPrice,
      });
    }

    const productIds = Array.from(consolidated.keys());
    const products = await this.productRepository.findMany({
      take: productIds.length,
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    return productIds.map((productId) => {
      const product = productMap.get(productId);
      const line = consolidated.get(productId)!;

      if (!product) {
        throw new ValidationError('Um dos produtos da venda nao esta mais disponivel.');
      }

      if (line.quantity > product.stock) {
        throw new ValidationError(
          `Estoque insuficiente para ${product.name}: ${product.stock} disponivel(is), ${line.quantity} solicitado(s).`
        );
      }

      return {
        productId: product.id,
        productNameSnapshot: product.name,
        productSkuSnapshot: product.sku ?? null,
        quantity: line.quantity,
        unitPrice: this.roundCurrency(line.unitPrice ?? product.price),
        stockBefore: product.stock,
      };
    });
  }

  private buildWhere(filters: SaleFiltersInput): Prisma.SaleWhereInput {
    const where: Prisma.SaleWhereInput = {};

    if (filters.status) where.status = filters.status;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

    if (filters.from || filters.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.from) createdAt.gte = new Date(filters.from);
      if (filters.to) createdAt.lte = new Date(filters.to);
      where.createdAt = createdAt;
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { referenceCode: { contains: search, mode: 'insensitive' } },
        { customerNameSnapshot: { contains: search, mode: 'insensitive' } },
        { customerWhatsapp: { contains: normalizeWhatsapp(search) || search, mode: 'insensitive' } },
        { customer: { is: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    return where;
  }

  private roundCurrency(value: number) {
    return Number(value.toFixed(2));
  }

  private generateReferenceCode() {
    const now = new Date();
    const datePart = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `VND-${datePart}-${randomPart}`;
  }

  private formatSale(sale: PersistedSale) {
    return {
      id: sale.id,
      referenceCode: sale.referenceCode,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      customerId: sale.customerId,
      customer: sale.customer
        ? {
            id: sale.customer.id,
            name: sale.customer.name,
            email: sale.customer.email.includes('@') ? sale.customer.email : undefined,
            identifier: sale.customer.email,
            whatsapp: sale.customer.whatsapp ?? undefined,
          }
        : null,
      orderId: sale.orderId,
      registeredById: sale.registeredById,
      customerNameSnapshot: sale.customerNameSnapshot,
      customerWhatsapp: sale.customerWhatsapp,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      notes: sale.notes,
      paidAt: sale.paidAt,
      canceledAt: sale.canceledAt,
      itemCount: sale.items.length,
      items: sale.items.map((item) => ({
        id: item.id,
        saleId: item.saleId,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        productSkuSnapshot: item.productSkuSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    };
  }
}
