import type {
  CreateSaleDTO,
  RevenueSummary,
  Sale,
  SaleFilters,
  SaleResponse,
  UpdateSaleStatusDTO,
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

function unwrapPaginatedSales(payload: unknown): SaleResponse {
  if (isApiResponse<Sale[]>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }
    const sales = (payload.data as Sale[]) ?? [];
    return {
      limit: payload.pagination?.limit ?? sales.length,
      page: payload.pagination?.page ?? 1,
      sales,
      total: payload.pagination?.total ?? sales.length,
      totalPages: payload.pagination?.totalPages ?? 1,
    };
  }
  return payload as SaleResponse;
}

function buildSalesQuery(filters?: SaleFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export async function fetchSales(filters?: SaleFilters): Promise<SaleResponse> {
  const queryString = buildSalesQuery(filters);
  const url = queryString ? `/sales/admin/list?${queryString}` : '/sales/admin/list';
  const response = await apiFetch<ApiResponse<Sale[]> | SaleResponse>(url);
  return unwrapPaginatedSales(response);
}

export async function fetchSaleById(id: string): Promise<Sale> {
  const response = await apiFetch<ApiResponse<Sale> | Sale>(`/sales/admin/${id}`);
  return unwrapData<Sale>(response);
}

export async function createSale(payload: CreateSaleDTO): Promise<Sale> {
  const response = await apiFetch<ApiResponse<Sale> | Sale>('/sales/admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrapData<Sale>(response);
}

export async function updateSaleStatus(id: string, payload: UpdateSaleStatusDTO): Promise<Sale> {
  const response = await apiFetch<ApiResponse<Sale> | Sale>(`/sales/admin/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrapData<Sale>(response);
}

export async function fetchRevenueSummary(range?: { from?: string; to?: string }): Promise<RevenueSummary> {
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  const queryString = params.toString();
  const url = queryString ? `/sales/admin/revenue?${queryString}` : '/sales/admin/revenue';
  const response = await apiFetch<ApiResponse<RevenueSummary> | RevenueSummary>(url);
  return unwrapData<RevenueSummary>(response);
}
