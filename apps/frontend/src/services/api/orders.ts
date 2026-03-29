import type {
  AuthenticatedCheckoutOrderDTO,
  CheckoutOrderResponse,
  CustomerOrder,
  CustomerOrderResponse,
  OrderFilters,
  PublicCheckoutOrderDTO,
  UpdateOrderStatusDTO,
} from '@/types';
import { apiFetch } from './client';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function isApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  return typeof payload === 'object' && payload !== null && 'success' in payload;
}

function unwrapData<T>(payload: unknown): T {
  if (isApiResponse<T>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }

    if (payload.data === undefined) {
      throw new Error('Resposta inesperada da API');
    }

    return payload.data;
  }

  return payload as T;
}

function unwrapPaginatedOrders(payload: unknown): CustomerOrderResponse {
  if (isApiResponse<CustomerOrder[]>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }

    const orders = (payload.data as CustomerOrder[]) ?? [];

    return {
      limit: payload.pagination?.limit ?? orders.length,
      orders,
      page: payload.pagination?.page ?? 1,
      total: payload.pagination?.total ?? orders.length,
      totalPages: payload.pagination?.totalPages ?? 1,
    };
  }

  return payload as CustomerOrderResponse;
}

function buildOrdersQuery(filters?: OrderFilters) {
  const params = new URLSearchParams();

  if (filters?.search) params.set('search', filters.search);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.recoveryOnly !== undefined) params.set('recoveryOnly', String(filters.recoveryOnly));
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  return params.toString();
}

export async function checkoutPublicOrder(payload: PublicCheckoutOrderDTO): Promise<CheckoutOrderResponse> {
  const response = await apiFetch<ApiResponse<CheckoutOrderResponse> | CheckoutOrderResponse>('/orders/public/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return unwrapData<CheckoutOrderResponse>(response);
}

export async function checkoutAuthenticatedOrder(
  payload: AuthenticatedCheckoutOrderDTO
): Promise<CheckoutOrderResponse> {
  const response = await apiFetch<ApiResponse<CheckoutOrderResponse> | CheckoutOrderResponse>('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return unwrapData<CheckoutOrderResponse>(response);
}

export async function markPublicOrderWhatsappRedirected(id: string): Promise<CustomerOrder> {
  const response = await apiFetch<ApiResponse<CustomerOrder> | CustomerOrder>(
    `/orders/public/${id}/whatsapp-redirected`,
    {
      method: 'POST',
    }
  );

  return unwrapData<CustomerOrder>(response);
}

export async function fetchMyOrders(): Promise<CustomerOrder[]> {
  const response = await apiFetch<ApiResponse<CustomerOrder[]> | CustomerOrder[]>('/orders/me');
  return unwrapData<CustomerOrder[]>(response);
}

export async function fetchAdminOrders(filters?: OrderFilters): Promise<CustomerOrderResponse> {
  const queryString = buildOrdersQuery(filters);
  const url = queryString ? `/orders/admin/list?${queryString}` : '/orders/admin/list';
  const response = await apiFetch<ApiResponse<CustomerOrder[]> | CustomerOrderResponse>(url);
  return unwrapPaginatedOrders(response);
}

export async function updateAdminOrderStatus(id: string, payload: UpdateOrderStatusDTO): Promise<CustomerOrder> {
  const response = await apiFetch<ApiResponse<CustomerOrder> | CustomerOrder>(`/orders/admin/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return unwrapData<CustomerOrder>(response);
}
