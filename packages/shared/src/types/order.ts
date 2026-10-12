import type { Product } from './product.js';
import type { ProvisionalCredentials, User } from './user.js';

export enum OrderStatus {
  PENDING_WHATSAPP = 'PENDING_WHATSAPP',
  WHATSAPP_REDIRECTED = 'WHATSAPP_REDIRECTED',
  IN_RECOVERY = 'IN_RECOVERY',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export interface CustomerOrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  product?: Product | null;
  productNameSnapshot: string;
  productSlugSnapshot: string;
  productImageUrlSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CustomerOrder {
  fulfillment?: { status: string; mode: string; scheduledAt: Date | string | null; updatedAt: Date | string } | null;
  referral?: { code: string; confirmedAt: Date | string } | null;
  stockReservation?: { active: boolean; expiresAt: string | Date | null };
  id: string;
  referenceCode: string;
  userId: string;
  user?: User;
  status: OrderStatus;
  source: string;
  customerNameSnapshot: string;
  customerWhatsapp: string;
  customerNote?: string | null;
  internalNotes?: string | null;
  itemCount: number;
  subtotal: number;
  whatsappUrl?: string | null;
  whatsappMessage?: string | null;
  whatsappRedirectedAt?: Date | string | null;
  recoveryStartedAt?: Date | string | null;
  completedAt?: Date | string | null;
  canceledAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items: CustomerOrderItem[];
}

export interface CustomerOrderResponse {
  orders: CustomerOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface CheckoutOrderItemDTO {
  productId: string;
  quantity: number;
  promotionId?: string;
}

export interface PublicCheckoutOrderDTO {
  referral?: { code: string; confirmed: true };
  name: string;
  whatsapp: string;
  customerNote?: string | null;
  items: CheckoutOrderItemDTO[];
}

export interface AuthenticatedCheckoutOrderDTO {
  referral?: { code: string; confirmed: true };
  customerNote?: string | null;
  items: CheckoutOrderItemDTO[];
}

export interface CheckoutOrderResponse {
  order: CustomerOrder;
  whatsappUrl: string;
  whatsappMessage: string;
  user?: User;
  provisionalCredentials?: ProvisionalCredentials;
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
  internalNotes?: string | null;
}

export interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  recoveryOnly?: boolean;
  page?: number;
  limit?: number;
}
