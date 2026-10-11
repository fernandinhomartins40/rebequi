import type { User } from './user.js';

export enum PaymentMethod {
  PIX = 'PIX',
  CASH = 'CASH',
  CARD = 'CARD',
  INSTALLMENT = 'INSTALLMENT',
}

export enum SaleStatus {
  PAID = 'PAID',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CANCELED = 'CANCELED',
}

export enum StockMovementType {
  SALE = 'SALE',
  RESTOCK = 'RESTOCK',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId?: string | null;
  productNameSnapshot: string;
  productSkuSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Sale {
  id: string;
  referenceCode: string;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  customerId?: string | null;
  customer?: Pick<User, 'id' | 'name' | 'email' | 'whatsapp' | 'identifier'> | null;
  orderId?: string | null;
  registeredById?: string | null;
  customerNameSnapshot?: string | null;
  customerWhatsapp?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  paidAt?: Date | string | null;
  canceledAt?: Date | string | null;
  itemCount: number;
  items: SaleItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SaleResponse {
  sales: Sale[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface CreateSaleItemDTO {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreateSaleDTO {
  idempotencyKey?: string;
  orderId?: string;
  customerId?: string;
  customerName?: string;
  customerWhatsapp?: string;
  paymentMethod: PaymentMethod;
  status?: SaleStatus;
  discount?: number;
  notes?: string | null;
  items?: CreateSaleItemDTO[];
}

export interface UpdateSaleStatusDTO {
  status: SaleStatus;
  notes?: string | null;
}

export interface SaleFilters {
  search?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface RevenuePaymentBreakdown {
  paymentMethod: PaymentMethod;
  total: number;
  count: number;
}

export interface RevenueSummary {
  from: string | null;
  to: string | null;
  paidRevenue: number;
  pendingRevenue: number;
  salesCount: number;
  paidCount: number;
  pendingCount: number;
  canceledCount: number;
  averageTicket: number;
  itemsSold: number;
  paymentBreakdown: RevenuePaymentBreakdown[];
}
