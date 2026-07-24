import type {
  CreateCustomerNoteDTO,
  CustomerDetail,
  CustomerFilters,
  CustomerListItem,
  CustomerListResponse,
  CustomerNote,
  CustomerStageDistribution,
  UpdateCustomerCrmDTO,
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

function unwrapPaginatedCustomers(payload: unknown): CustomerListResponse {
  if (isApiResponse<CustomerListItem[]>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }
    const customers = (payload.data as CustomerListItem[]) ?? [];
    return {
      customers,
      limit: payload.pagination?.limit ?? customers.length,
      page: payload.pagination?.page ?? 1,
      total: payload.pagination?.total ?? customers.length,
      totalPages: payload.pagination?.totalPages ?? 1,
    };
  }
  return payload as CustomerListResponse;
}

function buildCustomersQuery(filters?: CustomerFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.tag) params.set('tag', filters.tag);
  if (filters?.followUpDue !== undefined) params.set('followUpDue', String(filters.followUpDue));
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export async function fetchCustomers(filters?: CustomerFilters): Promise<CustomerListResponse> {
  const queryString = buildCustomersQuery(filters);
  const url = queryString ? `/customers/admin/list?${queryString}` : '/customers/admin/list';
  const response = await apiFetch<ApiResponse<CustomerListItem[]> | CustomerListResponse>(url);
  return unwrapPaginatedCustomers(response);
}

export async function fetchCustomerStages(): Promise<CustomerStageDistribution[]> {
  const response = await apiFetch<ApiResponse<CustomerStageDistribution[]> | CustomerStageDistribution[]>(
    '/customers/admin/stages'
  );
  return unwrapData<CustomerStageDistribution[]>(response);
}

export async function fetchCustomerById(id: string): Promise<CustomerDetail> {
  const response = await apiFetch<ApiResponse<CustomerDetail> | CustomerDetail>(`/customers/admin/${id}`);
  return unwrapData<CustomerDetail>(response);
}

export async function updateCustomerCrm(id: string, payload: UpdateCustomerCrmDTO): Promise<CustomerListItem> {
  const response = await apiFetch<ApiResponse<CustomerListItem> | CustomerListItem>(`/customers/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return unwrapData<CustomerListItem>(response);
}

export async function addCustomerNote(id: string, payload: CreateCustomerNoteDTO): Promise<CustomerNote> {
  const response = await apiFetch<ApiResponse<CustomerNote> | CustomerNote>(`/customers/admin/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrapData<CustomerNote>(response);
}

export async function deleteCustomerNote(id: string, noteId: string): Promise<{ deleted: boolean }> {
  const response = await apiFetch<ApiResponse<{ deleted: boolean }> | { deleted: boolean }>(
    `/customers/admin/${id}/notes/${noteId}`,
    { method: 'DELETE' }
  );
  return unwrapData<{ deleted: boolean }>(response);
}
