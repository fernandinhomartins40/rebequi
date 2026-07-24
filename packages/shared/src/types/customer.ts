export enum CustomerStage {
  NEW = 'NEW',
  QUOTING = 'QUOTING',
  NEGOTIATING = 'NEGOTIATING',
  CUSTOMER = 'CUSTOMER',
  RECURRING = 'RECURRING',
  INACTIVE = 'INACTIVE',
}

export interface CustomerNote {
  id: string;
  customerId: string;
  authorId?: string | null;
  authorName?: string | null;
  body: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Métricas agregadas do relacionamento, derivadas de orçamentos/pedidos/vendas. */
export interface CustomerMetrics {
  quotesCount: number;
  ordersCount: number;
  salesCount: number;
  totalSpent: number; // Soma das vendas pagas
  lastQuoteAt?: Date | string | null;
  lastOrderAt?: Date | string | null;
  lastSaleAt?: Date | string | null;
  lastActivityAt?: Date | string | null;
}

/** Item da lista de clientes (com métricas leves). */
export interface CustomerListItem {
  id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
  isActive: boolean;
  stage: CustomerStage;
  stageManual: boolean;
  tags: string[];
  followUpAt?: Date | string | null;
  lastContactedAt?: Date | string | null;
  createdAt: Date | string;
  metrics: CustomerMetrics;
}

export interface CustomerListResponse {
  customers: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface CustomerTimelineEntry {
  kind: 'quote' | 'order' | 'sale';
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  amount?: number | null;
  itemCount?: number;
  at: Date | string;
}

/** Ficha completa do cliente. */
export interface CustomerDetail extends CustomerListItem {
  notes: CustomerNote[];
  timeline: CustomerTimelineEntry[];
}

export interface CustomerStageDistribution {
  stage: CustomerStage;
  count: number;
}

export interface CustomerFilters {
  search?: string;
  stage?: CustomerStage;
  tag?: string;
  followUpDue?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateCustomerCrmDTO {
  stage?: CustomerStage;
  stageManual?: boolean;
  tags?: string[];
  followUpAt?: string | null;
}

export interface CreateCustomerNoteDTO {
  body: string;
}
