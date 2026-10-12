import { Prisma, PromotionOfferPricingMode, type OrderStatus } from '@prisma/client';
import type {
  AuthenticatedCheckoutOrderInput,
  OrderFiltersInput,
  PublicCheckoutOrderInput,
  UpdateOrderStatusInput,
} from '@rebequi/shared/schemas';
import { formatPrice, formatWhatsapp, isValidWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';
import { env } from '../config/env.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { PromotionRepository } from '../repositories/promotion.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AuthService } from './auth.service.js';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors.util.js';
import { resolvePartnerReferral } from './partner-referral.service.js';
import { assignedScope, requireCommercialAccess, type CommercialActor } from './commercial-access.service.js';

type PersistedOrder = NonNullable<Awaited<ReturnType<OrderRepository['findOrderById']>>>;
type CartProduct = Awaited<ReturnType<ProductRepository['findMany']>>[number];
type ActivePromotion = Awaited<ReturnType<PromotionRepository['findActivePublicByIds']>>[number];
type NormalizedCheckoutItem = {
  originalPrice: number | null;
  productId: string;
  productImageUrlSnapshot: string | null;
  productNameSnapshot: string;
  productSlugSnapshot: string;
  quantity: number;
  unitPrice: number;
};

const RECOVERY_QUEUE_STATUSES: OrderStatus[] = ['PENDING_WHATSAPP', 'WHATSAPP_REDIRECTED', 'IN_RECOVERY'];

export class OrderService {
  private authService: AuthService;
  private orderRepository: OrderRepository;
  private productRepository: ProductRepository;
  private promotionRepository: PromotionRepository;
  private userRepository: UserRepository;

  constructor() {
    this.authService = new AuthService();
    this.orderRepository = new OrderRepository();
    this.productRepository = new ProductRepository();
    this.promotionRepository = new PromotionRepository();
    this.userRepository = new UserRepository();
  }

  async checkoutPublicOrder(data: PublicCheckoutOrderInput) {
    if (data.referral) await resolvePartnerReferral(data.referral.code);
    const normalizedWhatsapp = normalizeWhatsapp(data.whatsapp);
    const existingUser = await this.userRepository.findByIdentifier(normalizedWhatsapp);

    if (existingUser) {
      if (existingUser.role !== 'CUSTOMER') {
        throw new ConflictError('Ja existe um usuario administrativo vinculado a este identificador');
      }

      throw new ConflictError('Ja existe uma conta vinculada a este WhatsApp. Faca login para concluir o pedido.', 'LOGIN_REQUIRED');
    }

    const ensuredCustomer = await this.authService.ensureCustomerForLead({
      name: data.name,
      whatsapp: normalizedWhatsapp,
    });
    const session = await this.authService.createSessionForUser(ensuredCustomer.user.id);

    const order = await this.createOrder({
      referral: data.referral,
      customerNameSnapshot: data.name.trim(),
      customerNote: data.customerNote ?? null,
      customerWhatsapp: normalizedWhatsapp,
      items: data.items,
      source: 'public_cart_checkout',
      userId: ensuredCustomer.user.id,
    });

    return {
      order: this.formatOrder(order),
      provisionalCredentials: ensuredCustomer.provisionalCredentials,
      token: session.token,
      user: session.user,
      whatsappMessage: order.whatsappMessage || '',
      whatsappUrl: order.whatsappUrl || '',
    };
  }

  async checkoutAuthenticatedOrder(userId: string, data: AuthenticatedCheckoutOrderInput) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuario nao autenticado');
    }

    if (user.role !== 'CUSTOMER') {
      throw new UnauthorizedError('Apenas clientes podem concluir pedidos');
    }

    const customerWhatsapp = user.whatsapp ?? (user.email.includes('@') ? '' : user.email);

    if (!customerWhatsapp || !isValidWhatsapp(customerWhatsapp)) {
      throw new ValidationError('Sua conta precisa ter um WhatsApp valido para concluir o pedido');
    }

    const order = await this.createOrder({
      referral: data.referral,
      customerNameSnapshot: user.name,
      customerNote: data.customerNote ?? null,
      customerWhatsapp: normalizeWhatsapp(customerWhatsapp),
      items: data.items,
      source: 'customer_cart_checkout',
      userId,
    });

    return {
      order: this.formatOrder(order),
      whatsappMessage: order.whatsappMessage || '',
      whatsappUrl: order.whatsappUrl || '',
    };
  }

  async markOrderWhatsappRedirected(orderId: string, userId: string) {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Pedido nao encontrado');
    }

    if (order.userId !== userId) throw new NotFoundError('Pedido nao encontrado');

    if (order.status === 'COMPLETED' || order.status === 'CANCELED') {
      return this.formatCustomerOrder(order);
    }

    const updatedOrder = await this.orderRepository.updateOrder(orderId, {
      status: order.status === 'IN_RECOVERY' ? 'IN_RECOVERY' : 'WHATSAPP_REDIRECTED',
      whatsappRedirectedAt: order.whatsappRedirectedAt ?? new Date(),
    });

    return this.formatCustomerOrder(updatedOrder);
  }

  async listCustomerOrders(userId: string) {
    const orders = await this.orderRepository.findManyOrders({
      orderBy: { createdAt: 'desc' },
      where: { userId },
    });

    return orders.map((order) => this.formatCustomerOrder(order));
  }

  async listAdminOrders(filters: OrderFiltersInput, actor?: CommercialActor) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerOrderWhereInput = assignedScope(actor);

    if (filters.status) {
      where.status = filters.status;
    } else if (filters.recoveryOnly) {
      where.status = {
        in: RECOVERY_QUEUE_STATUSES,
      };
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { referenceCode: { contains: search, mode: 'insensitive' } },
        { customerNameSnapshot: { contains: search, mode: 'insensitive' } },
        { customerWhatsapp: { contains: normalizeWhatsapp(search) || search, mode: 'insensitive' } },
        {
          user: {
            is: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { whatsapp: { contains: normalizeWhatsapp(search) || search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      this.orderRepository.findManyOrders({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.orderRepository.countOrders(where),
    ]);

    return {
      limit,
      orders: orders.map((order) => this.formatOrder(order)),
      page,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminOrderById(orderId: string, actor?: CommercialActor) {
    await requireCommercialAccess('order', orderId, actor);
    const order = await this.orderRepository.findOrderById(orderId);

    if (!order) {
      throw new NotFoundError('Pedido nao encontrado');
    }

    return this.formatOrder(order);
  }

  async updateOrderStatus(orderId: string, data: UpdateOrderStatusInput, actor?: CommercialActor) {
    await requireCommercialAccess('order', orderId, actor);
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Pedido nao encontrado');
    }

    const nextStatus = data.status;
    const updatedOrder = await this.orderRepository.updateOrder(orderId, {
      canceledAt: nextStatus === 'CANCELED' ? new Date() : null,
      completedAt: nextStatus === 'COMPLETED' ? new Date() : null,
      internalNotes: data.internalNotes !== undefined ? data.internalNotes : order.internalNotes,
      recoveryStartedAt:
        nextStatus === 'IN_RECOVERY'
          ? order.recoveryStartedAt ?? new Date()
          : nextStatus === 'COMPLETED' || nextStatus === 'CANCELED'
            ? order.recoveryStartedAt
            : null,
      status: nextStatus,
      whatsappRedirectedAt:
        nextStatus === 'WHATSAPP_REDIRECTED'
          ? order.whatsappRedirectedAt ?? new Date()
          : order.whatsappRedirectedAt,
    }, actor);

    return this.formatOrder(updatedOrder);
  }

  private async createOrder(params: {
    referral?: PublicCheckoutOrderInput['referral'];
    customerNameSnapshot: string;
    customerNote: string | null;
    customerWhatsapp: string;
    items: PublicCheckoutOrderInput['items'];
    source: string;
    userId: string;
  }) {
    const normalizedItems = await this.normalizeCheckoutItems(params.items);
    const referenceCode = this.generateReferenceCode();
    const subtotal = normalizedItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
    const whatsappMessage = this.buildWhatsappMessage({
      customerNameSnapshot: params.customerNameSnapshot,
      customerNote: params.customerNote,
      customerWhatsapp: params.customerWhatsapp,
      items: normalizedItems,
      referenceCode,
      subtotal,
    });
    const whatsappUrl = this.buildWhatsappUrl(whatsappMessage);

    return this.orderRepository.createOrder({
      customerNameSnapshot: params.customerNameSnapshot,
      customerNote: params.customerNote,
      customerWhatsapp: params.customerWhatsapp,
      referenceCode,
      source: params.source,
      status: 'PENDING_WHATSAPP',
      user: {
        connect: { id: params.userId },
      },
      whatsappMessage,
      whatsappUrl,
      items: {
        create: normalizedItems.map((item) => ({
          originalPrice: item.originalPrice,
          product: {
            connect: { id: item.productId },
          },
          productImageUrlSnapshot: item.productImageUrlSnapshot,
          productNameSnapshot: item.productNameSnapshot,
          productSlugSnapshot: item.productSlugSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    }, params.referral ? { code: params.referral.code, userId: params.userId } : undefined);
  }

  private async normalizeCheckoutItems(items: PublicCheckoutOrderInput['items']) {
    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const promotionIds = Array.from(
      new Set(items.map((item) => item.promotionId).filter((value): value is string => Boolean(value)))
    );
    const products = await this.productRepository.findMany({
      take: productIds.length,
      where: {
        id: { in: productIds },
      },
    });
    const promotions = await this.promotionRepository.findActivePublicByIds(promotionIds, new Date());
    const productMap = new Map(products.map((product) => [product.id, product]));
    const promotionMap = new Map(promotions.map((promotion) => [promotion.id, promotion]));

    return items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new ValidationError('Um dos produtos do carrinho nao esta mais disponivel');
      }

      if (!product.isActive) {
        throw new ValidationError(`O produto ${product.name} nao esta ativo para venda`);
      }

      if (product.stock <= 0) {
        throw new ValidationError(`O produto ${product.name} esta sem estoque no momento`);
      }

      if (item.quantity > product.stock - product.reservedStock) {
        throw new ValidationError(`O produto ${product.name} possui apenas ${Math.max(0, product.stock - product.reservedStock)} unidade(s) disponivel(is)`);
      }

      if (item.promotionId) {
        const promotion = promotionMap.get(item.promotionId);

        if (!promotion) {
          throw new ValidationError(`A oferta de ${product.name} nao esta mais disponivel. Revise o carrinho.`);
        }

        const promotionIncludesProduct = promotion.products.some((promotionProduct) => promotionProduct.productId === product.id);

        if (!promotionIncludesProduct) {
          throw new ValidationError(`A promoção selecionada para ${product.name} não corresponde mais a este item.`);
        }

        const promotionalUnitPrice = this.resolvePromotionUnitPrice(promotion, product.price);

        return this.mapProductToCheckoutItem(
          product,
          item.quantity,
          promotionalUnitPrice,
          promotionalUnitPrice < product.price ? product.price : product.originalPrice ?? null
        );
      }

      return this.mapProductToCheckoutItem(product, item.quantity, product.price, product.originalPrice ?? null);
    });
  }

  private mapProductToCheckoutItem(
    product: CartProduct,
    quantity: number,
    unitPrice: number,
    originalPrice: number | null
  ): NormalizedCheckoutItem {
    return {
      originalPrice,
      productId: product.id,
      productImageUrlSnapshot: product.images?.[0]?.url ?? null,
      productNameSnapshot: product.name,
      productSlugSnapshot: product.slug,
      quantity,
      unitPrice,
    };
  }

  private resolvePromotionUnitPrice(promotion: ActivePromotion, referencePrice: number) {
    switch (promotion.offerPricingMode) {
      case PromotionOfferPricingMode.FIXED_PRICE:
        return promotion.offerPromotionalPrice ?? referencePrice;
      case PromotionOfferPricingMode.PERCENTAGE_DISCOUNT:
        return promotion.offerDiscountPercentage !== null
          ? this.roundCurrency(referencePrice * (1 - promotion.offerDiscountPercentage / 100))
          : referencePrice;
      case PromotionOfferPricingMode.BUY_X_PAY_Y:
        return promotion.offerMinimumQuantity && promotion.offerPayQuantity
          ? this.roundCurrency((referencePrice * promotion.offerPayQuantity) / promotion.offerMinimumQuantity)
          : referencePrice;
      case PromotionOfferPricingMode.BULK_PERCENTAGE:
        return promotion.offerDiscountPercentage !== null
          ? this.roundCurrency(referencePrice * (1 - promotion.offerDiscountPercentage / 100))
          : referencePrice;
      default:
        return referencePrice;
    }
  }

  private roundCurrency(value: number) {
    return Number(value.toFixed(2));
  }

  private buildWhatsappMessage(params: {
    customerNameSnapshot: string;
    customerNote: string | null;
    customerWhatsapp: string;
    items: NormalizedCheckoutItem[];
    referenceCode: string;
    subtotal: number;
  }) {
    const lines = [
      `Pedido ${params.referenceCode}`,
      `Cliente: ${params.customerNameSnapshot}`,
      `WhatsApp: ${formatWhatsapp(params.customerWhatsapp)}`,
      '',
      'Itens do carrinho:',
      ...params.items.map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        return `- ${item.quantity}x ${item.productNameSnapshot} | ${formatPrice(lineTotal)}`;
      }),
      '',
      `Total estimado: ${formatPrice(params.subtotal)}`,
    ];

    if (params.customerNote) {
      lines.push('', `Observacoes: ${params.customerNote}`);
    }

    lines.push('', 'Gostaria de confirmar este pedido e combinar o atendimento.');
    return lines.join('\n');
  }

  private buildWhatsappUrl(message: string) {
    const storeWhatsapp = normalizeWhatsapp(env.STORE_WHATSAPP);

    if (!isValidWhatsapp(storeWhatsapp)) {
      throw new ValidationError('WhatsApp da loja nao configurado corretamente');
    }

    return `https://wa.me/55${storeWhatsapp}?text=${encodeURIComponent(message)}`;
  }

  private generateReferenceCode() {
    const now = new Date();
    const datePart = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PED-${datePart}-${randomPart}`;
  }

  private formatCustomerOrder(order: PersistedOrder) {
    const { internalNotes: _internalNotes, ...publicOrder } = this.formatOrder(order);
    return publicOrder;
  }

  private formatOrder(order: PersistedOrder) {
    const subtotal = order.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);

    return {
      fulfillment: order.sale?.fulfillment ? { ...order.sale.fulfillment, status: order.sale.status === 'PENDING_PAYMENT' ? 'PAYMENT_PENDING' : order.sale.fulfillment.status } : null,
      referral: order.partnerReferral ? { code: order.partnerReferral.codeSnapshot, confirmedAt: order.partnerReferral.consentedAt } : null,
      canceledAt: order.canceledAt,
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      customerNameSnapshot: order.customerNameSnapshot,
      customerNote: order.customerNote,
      customerWhatsapp: order.customerWhatsapp,
      id: order.id,
      internalNotes: order.internalNotes,
      itemCount: order.items.length,
      items: order.items.map((item) => ({
        createdAt: item.createdAt,
        id: item.id,
        orderId: item.orderId,
        originalPrice: item.originalPrice,
        product: item.product
          ? {
              ...item.product,
              availableStock: Math.max(0, item.product.stock - item.product.reservedStock),
            }
          : undefined,
        productId: item.productId,
        productImageUrlSnapshot: item.productImageUrlSnapshot,
        productNameSnapshot: item.productNameSnapshot,
        productSlugSnapshot: item.productSlugSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        updatedAt: item.updatedAt,
      })),
      recoveryStartedAt: order.recoveryStartedAt,
      referenceCode: order.referenceCode,
      source: order.source,
      stockReservation: {
        active: order.reservations.some(reservation => reservation.status === 'ACTIVE' && reservation.expiresAt > new Date()),
        expiresAt: order.reservations.find(reservation => reservation.status === 'ACTIVE')?.expiresAt ?? null,
      },
      status: order.status,
      subtotal,
      updatedAt: order.updatedAt,
      user: this.formatUser(order.user),
      userId: order.userId,
      whatsappMessage: order.whatsappMessage,
      whatsappRedirectedAt: order.whatsappRedirectedAt,
      whatsappUrl: order.whatsappUrl,
    };
  }

  private formatUser(user: PersistedOrder['user']) {
    return {
      createdAt: user.createdAt,
      email: user.email.includes('@') ? user.email : undefined,
      id: user.id,
      identifier: user.email,
      isActive: user.isActive,
      isProvisional: user.isProvisional,
      mustChangePassword: user.mustChangePassword,
      name: user.name,
      role: user.role,
      updatedAt: user.updatedAt,
      whatsapp: user.whatsapp ?? (user.email.includes('@') ? undefined : user.email),
    };
  }
}
